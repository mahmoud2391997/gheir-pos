import { beforeEach, describe, expect, it, vi } from "vitest";
import { COOKIE_NAME } from "../shared/const";
import { hashPassword } from "./_core/password";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getUserByUsername: vi.fn(),
    upsertUser: vi.fn(),
  };
});

const db = await import("./db");

type CookieCall = {
  name: string;
  value: string;
  options: Record<string, unknown>;
};

function createAnonymousContext(): { ctx: TrpcContext; cookies: CookieCall[] } {
  const cookies: CookieCall[] = [];
  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      cookie: (
        name: string,
        value: string,
        options: Record<string, unknown>
      ) => {
        cookies.push({ name, value, options });
      },
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
  return { ctx, cookies };
}

beforeEach(() => {
  process.env.JWT_SECRET = "test-secret";
  process.env.COOKIE_SAMESITE = "lax";
  vi.clearAllMocks();
});

describe("auth.login", () => {
  it("sets a session cookie and returns the user (without passwordHash)", async () => {
    const passwordHash = await hashPassword("pw");
    vi.mocked(db.getUserByUsername).mockResolvedValue({
      id: 1,
      openId: "local:admin",
      username: "admin",
      name: "Admin",
      email: null,
      loginMethod: "local",
      passwordHash,
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    } as any);

    const { ctx, cookies } = createAnonymousContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.login({
      username: "admin",
      password: "pw",
    });

    expect(result).toMatchObject({
      id: 1,
      openId: "local:admin",
      username: "admin",
      role: "admin",
    });
    expect((result as any).passwordHash).toBeUndefined();

    expect(cookies).toHaveLength(1);
    expect(cookies[0]?.name).toBe(COOKIE_NAME);
    expect(String(cookies[0]?.value || "")).toMatch(/\S+/);
    expect(cookies[0]?.options).toMatchObject({
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: true,
    });
  });

  it("rejects invalid credentials", async () => {
    const passwordHash = await hashPassword("pw");
    vi.mocked(db.getUserByUsername).mockResolvedValue({
      id: 1,
      openId: "local:admin",
      username: "admin",
      name: "Admin",
      email: null,
      loginMethod: "local",
      passwordHash,
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    } as any);

    const { ctx } = createAnonymousContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.login({ username: "admin", password: "wrong" })
    ).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});
