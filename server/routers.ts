import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { createProductWithVariant, createSale, createSkuPrintJob, getDashboard, listProducts, listSales } from "./db";

export const appRouter = router({
  system: router({}),
  auth: router({
    me: publicProcedure.query(({ ctx }) => ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => { ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 }); return { success: true } as const; }),
  }),
  dashboard: protectedProcedure.query(() => getDashboard()),
  products: router({
    list: protectedProcedure.query(() => listProducts()),
    create: adminProcedure.input(z.object({ name: z.string().min(1), arabicName: z.string().optional(), category: z.string().min(1), baseSku: z.string().min(1), price: z.number().nonnegative(), color: z.string().min(1), colorCode: z.string().min(1), copies: z.number().int().positive().max(500) })).mutation(({ input }) => createProductWithVariant(input)),
  }),
  sales: router({
    list: protectedProcedure.input(z.object({ limit: z.number().int().positive().max(100).default(100) }).optional()).query(({ input }) => listSales(input?.limit ?? 100)),
    create: protectedProcedure.input(z.object({ customerName: z.string().nullable().optional(), subtotal: z.number().nonnegative(), tax: z.number().nonnegative(), total: z.number().nonnegative(), paymentMethod: z.enum(["cash", "card", "instapay"]), items: z.array(z.object({ productId: z.number().int().positive(), quantity: z.number().int().positive(), name: z.string(), unitPrice: z.number().nonnegative(), lineTotal: z.number().nonnegative() })).min(1) })).mutation(({ ctx, input }) => createSale({ ...input, cashierId: ctx.user.id })),
  }),
  sku: router({
    createPrintJob: adminProcedure.input(z.object({ rowCount: z.number().int().positive().max(5000) })).mutation(({ ctx, input }) => createSkuPrintJob(ctx.user.id, input.rowCount)),
  }),
});

export type AppRouter = typeof appRouter;

export const roleContract = {
  cashier: ["auth.me", "dashboard", "products.list", "sales.list", "sales.create"],
  admin: ["auth.me", "dashboard", "products.list", "products.create", "sales.list", "sales.create", "sku.createPrintJob"],
} as const;

export const hardwareContract = {
  scanner: "Keyboard-wedge scanners feed the register input and resolve SKUs on Enter.",
  receiptPrinter: "Receipt output uses window.print in browser mode.",
  skuPrinter: "SKU labels export as CSV for label-printer software.",
  electron: "Native bridges can replace these adapters without changing route contracts.",
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
