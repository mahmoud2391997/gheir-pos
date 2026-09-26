import crypto from "node:crypto";
import { ENV } from "./env";

function isPlaceholder(value: string) {
  const v = value.trim().toLowerCase();
  if (!v) return false;
  return (
    v.includes("replace-with") ||
    v.includes("change-me") ||
    v.includes("changeme") ||
    v.includes("example") ||
    v === "password" ||
    v === "secret"
  );
}

export function validateServerEnv() {
  const demoLogin = ENV.demoLoginEnabled;

  const jwt = String(process.env.JWT_SECRET || "");
  if (!jwt || isPlaceholder(jwt) || jwt.length < 32) {
    if (demoLogin) {
      const base =
        String(process.env.VERCEL_URL || "").trim() ||
        String(process.env.VERCEL_PROJECT_ID || "").trim() ||
        "local-demo";
      const derived = crypto
        .createHash("sha256")
        .update(`gheir-pos-demo:${base}`)
        .digest("hex");
      process.env.JWT_SECRET = derived;
    } else {
      throw new Error(
        "JWT_SECRET is required and must be a strong secret (>= 32 chars, not a placeholder)."
      );
    }
  }

  const nodeEnv = String(process.env.NODE_ENV || "");
  const databaseUrl = String(process.env.DATABASE_URL || "");
  if (
    !demoLogin &&
    nodeEnv === "production" &&
    (!databaseUrl || isPlaceholder(databaseUrl))
  ) {
    throw new Error(
      "DATABASE_URL is required in production. (Set DEMO_MODE=1 or NO_DEVICE=1 to run without a DB for demos.)"
    );
  }

  const cookieSameSite = String(
    process.env.COOKIE_SAMESITE || ""
  ).toLowerCase();
  if (cookieSameSite && !["lax", "strict", "none"].includes(cookieSameSite)) {
    throw new Error("COOKIE_SAMESITE must be one of: lax, strict, none.");
  }

  const posKey = String(
    process.env.POS_API_KEY || process.env.VITE_POS_API_KEY || ""
  );
  if (posKey && isPlaceholder(posKey)) {
    throw new Error(
      "POS_API_KEY looks like a placeholder; set a real secret value."
    );
  }
}
