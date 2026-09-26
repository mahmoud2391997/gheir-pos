import type { Request } from "express";

type Key = string;

type State = {
  fails: number;
  firstFailAtMs: number;
  lockedUntilMs: number;
};

const store = new Map<Key, State>();

function nowMs() {
  return Date.now();
}

function getClientIp(req: Request) {
  const forwarded = req.headers["x-forwarded-for"];
  const raw =
    typeof forwarded === "string"
      ? forwarded.split(",")[0]?.trim()
      : Array.isArray(forwarded)
        ? forwarded[0]
        : undefined;
  const socketAddr = (req as any)?.socket?.remoteAddress as string | undefined;
  return raw || socketAddr || "unknown";
}

function getKey(req: Request, username: string) {
  return `${getClientIp(req)}|${username.toLowerCase()}`;
}

export type LoginRateLimitConfig = {
  windowMs: number;
  maxFails: number;
  lockoutMs: number;
};

export const DEFAULT_LOGIN_RATE_LIMIT: LoginRateLimitConfig = {
  windowMs: 10 * 60_000,
  maxFails: 5,
  lockoutMs: 15 * 60_000,
};

export function assertLoginAllowed(
  req: Request,
  username: string,
  config: LoginRateLimitConfig = DEFAULT_LOGIN_RATE_LIMIT
) {
  const key = getKey(req, username);
  const state = store.get(key);
  if (!state) return;

  const now = nowMs();
  if (state.lockedUntilMs > now) {
    const remainingMs = Math.max(0, state.lockedUntilMs - now);
    return { allowed: false as const, remainingMs } as const;
  }

  if (now - state.firstFailAtMs > config.windowMs) {
    store.delete(key);
    return;
  }

  return;
}

export function recordLoginFailure(
  req: Request,
  username: string,
  config: LoginRateLimitConfig = DEFAULT_LOGIN_RATE_LIMIT
) {
  const key = getKey(req, username);
  const now = nowMs();
  const current = store.get(key);

  if (!current || now - current.firstFailAtMs > config.windowMs) {
    store.set(key, { fails: 1, firstFailAtMs: now, lockedUntilMs: 0 });
    return;
  }

  const fails = current.fails + 1;
  const lockedUntilMs =
    fails >= config.maxFails ? now + config.lockoutMs : current.lockedUntilMs;
  store.set(key, {
    fails,
    firstFailAtMs: current.firstFailAtMs,
    lockedUntilMs,
  });
}

export function clearLoginFailures(req: Request, username: string) {
  store.delete(getKey(req, username));
}

