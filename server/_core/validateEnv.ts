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
  const jwt = String(process.env.JWT_SECRET || "");
  if (!jwt || isPlaceholder(jwt) || jwt.length < 32) {
    throw new Error(
      "JWT_SECRET is required and must be a strong secret (>= 32 chars, not a placeholder)."
    );
  }

  const nodeEnv = String(process.env.NODE_ENV || "");
  const databaseUrl = String(process.env.DATABASE_URL || "");
  if (nodeEnv === "production" && (!databaseUrl || isPlaceholder(databaseUrl))) {
    throw new Error("DATABASE_URL is required in production.");
  }

  const cookieSameSite = String(process.env.COOKIE_SAMESITE || "").toLowerCase();
  if (cookieSameSite && !["lax", "strict", "none"].includes(cookieSameSite)) {
    throw new Error("COOKIE_SAMESITE must be one of: lax, strict, none.");
  }

  const posKey = String(process.env.POS_API_KEY || process.env.VITE_POS_API_KEY || "");
  if (posKey && isPlaceholder(posKey)) {
    throw new Error("POS_API_KEY looks like a placeholder; set a real secret value.");
  }
}

