import { z } from "zod";
import { COOKIE_NAME, ONE_YEAR_MS, UNAUTHED_ERR_MSG } from "../shared/const";
import { TRPCError } from "@trpc/server";
import type { User } from "../drizzle/schema";
import { getSessionCookieOptions } from "./_core/cookies";
import {
  assertLoginAllowed,
  clearLoginFailures,
  recordLoginFailure,
} from "./_core/loginRateLimit";
import {
  adminProcedure,
  protectedProcedure,
  publicProcedure,
  router,
} from "./_core/trpc";
import { verifyPassword } from "./_core/password";
import { sdk } from "./_core/sdk";
import { ENV } from "./_core/env";
import {
  createProductWithVariant,
  createSale,
  createSkuPrintJob,
  getDashboard,
  getDb,
  getUserByUsername,
  listProducts,
  listSales,
  upsertUser,
} from "./db";

const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7;

function isDemoCredential(username: string, password: string) {
  if (username === "demo" && password === "demo") return true;
  return (
    username === "admin" &&
    (password === "AdminPass123!" ||
      password === "admin" ||
      password === "demo")
  );
}

function toPublicUser(user: User) {
  // Never leak password hashes to the client.
  const { passwordHash: _passwordHash, ...rest } = user as unknown as User & {
    passwordHash?: string | null;
  };
  return rest;
}

export const appRouter = router({
  system: router({}),
  auth: router({
    me: publicProcedure.query(({ ctx }) =>
      ctx.user ? toPublicUser(ctx.user) : null
    ),
    loginOptions: publicProcedure.query(() => ({
      /** True when NO_DEVICE is set: no register is attached, so offer demo login. */
      demoLogin: ENV.noDevice,
    })),
    login: publicProcedure
      .input(
        z.object({
          username: z.string().trim().min(1).max(64),
          password: z.string().min(1).max(256),
          rememberMe: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const username = input.username.trim().toLowerCase();

        const lock = assertLoginAllowed(ctx.req, username);
        if (lock && lock.allowed === false) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "Too many login attempts. Please try again shortly.",
          });
        }

        const db = await getDb();
        if (db) {
          const user = await getUserByUsername(username);
          if (user?.passwordHash) {
            const ok = await verifyPassword(input.password, user.passwordHash);
            if (ok) {
              clearLoginFailures(ctx.req, username);

              const maxAgeMs = input.rememberMe
                ? ONE_YEAR_MS
                : SESSION_MAX_AGE_MS;
              const cookieOptions = getSessionCookieOptions(ctx.req);
              const sessionToken = await sdk.createSessionToken(user.openId, {
                name: user.name || user.username || "",
                expiresInMs: maxAgeMs,
              });

              ctx.res.cookie(COOKIE_NAME, sessionToken, {
                ...cookieOptions,
                maxAge: maxAgeMs,
              });

              await upsertUser({
                openId: user.openId,
                lastSignedIn: new Date(),
              });

              return toPublicUser(user);
            }
          }
        } else if (!ENV.demoLoginEnabled) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message:
              "Database not configured. Set DATABASE_URL, or set DEMO_MODE=1 or NO_DEVICE=1 for demo login.",
          });
        }

        if (
          ENV.demoLoginEnabled &&
          isDemoCredential(username, input.password)
        ) {
          clearLoginFailures(ctx.req, username);

          const maxAgeMs = input.rememberMe ? ONE_YEAR_MS : SESSION_MAX_AGE_MS;
          const cookieOptions = getSessionCookieOptions(ctx.req);
          const openId = `demo:${username === "demo" ? "admin" : username}`;
          const sessionToken = await sdk.createSessionToken(openId, {
            name: "Demo Admin",
            expiresInMs: maxAgeMs,
          });
          ctx.res.cookie(COOKIE_NAME, sessionToken, {
            ...cookieOptions,
            maxAge: maxAgeMs,
          });

          const now = new Date();
          return toPublicUser({
            id: -1,
            openId,
            name: "Demo Admin",
            email: null,
            username: "admin",
            loginMethod: "demo",
            passwordHash: null,
            role: "admin",
            createdAt: now,
            updatedAt: now,
            lastSignedIn: now,
          } as User);
        }

        recordLoginFailure(ctx.req, username);
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: UNAUTHED_ERR_MSG,
        });
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  dashboard: protectedProcedure.query(() => getDashboard()),
  products: router({
    list: protectedProcedure.query(() => listProducts()),
    create: adminProcedure
      .input(
        z
          .object({
            name: z.string().trim().min(1),
            arabicName: z.string().optional(),
            category: z.string().trim().min(1),
            price: z.number().nonnegative(),
            colors: z.array(z.string().trim().min(1)).min(1).max(20),
            copies: z.number().int().positive().max(500),
          })
          .superRefine((input, ctx) => {
            if (
              new Set(input.colors.map(color => color.toUpperCase())).size !==
              input.colors.length
            )
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["colors"],
                message: "Colors must be unique",
              });
          })
      )
      .mutation(({ input }) => createProductWithVariant(input)),
  }),
  sales: router({
    list: protectedProcedure
      .input(
        z
          .object({ limit: z.number().int().positive().max(100).default(100) })
          .optional()
      )
      .query(({ input }) => listSales(input?.limit ?? 100)),
    create: protectedProcedure
      .input(
        z.object({
          customerName: z.string().nullable().optional(),
          subtotal: z.number().nonnegative(),
          tax: z.number().nonnegative(),
          total: z.number().nonnegative(),
          paymentMethod: z.enum(["cash", "card", "instapay"]),
          items: z
            .array(
              z.object({
                productId: z.number().int().positive(),
                quantity: z.number().int().positive(),
                name: z.string(),
                unitPrice: z.number().nonnegative(),
                lineTotal: z.number().nonnegative(),
              })
            )
            .min(1),
        })
      )
      .mutation(({ ctx, input }) =>
        createSale({ ...input, cashierId: ctx.user.id })
      ),
  }),
  sku: router({
    createPrintJob: adminProcedure
      .input(z.object({ rowCount: z.number().int().positive().max(5000) }))
      .mutation(({ ctx, input }) =>
        createSkuPrintJob(ctx.user.id, input.rowCount)
      ),
  }),
});

export type AppRouter = typeof appRouter;

export const roleContract = {
  cashier: [
    "auth.me",
    "dashboard",
    "products.list",
    "sales.list",
    "sales.create",
  ],
  admin: [
    "auth.me",
    "dashboard",
    "products.list",
    "products.create",
    "sales.list",
    "sales.create",
    "sku.createPrintJob",
  ],
} as const;

export const hardwareContract = {
  scanner:
    "Keyboard-wedge scanners feed the register input and resolve SKUs on Enter.",
  receiptPrinter: "Receipt output uses window.print in browser mode.",
  skuPrinter: "SKU labels export as CSV for label-printer software.",
  electron:
    "Native bridges can replace these adapters without changing route contracts.",
} as const;

export const skuContract = {
  pattern: "BASE-COLOR-####",
  example: "VASE-CLAY-0007",
  uniqueness: "unique per physical copy",
} as const;

export const posContract = {
  name: "GHEIR POS",
  roles: ["cashier", "admin"],
  currency: "EGP",
  stack: "Node.js + React + tRPC + Drizzle",
} as const;

export const routerReady = true;

export const routerVersion = "0.1";

export const routerEnd = true;
