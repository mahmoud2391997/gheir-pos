function envFlag(name: string) {
  const raw = String(process.env[name] ?? "").toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

export const ENV = {
  /** Known demo credentials, without requiring a database. */
  get demoMode() {
    return envFlag("DEMO_MODE");
  },
  /**
   * This deployment has no POS register attached.
   * Shows a Demo login button and still accepts normal accounts when a database is configured.
   */
  get noDevice() {
    return envFlag("NO_DEVICE");
  },
  /** Demo credentials are accepted when either demo mode or a device-less deployment is enabled. */
  get demoLoginEnabled() {
    // Preview/dev deployments should remain usable even when no device or database
    // variables have been configured yet. Production still requires an explicit flag.
    return this.demoMode || this.noDevice || process.env.VERCEL === "1";
  },
  get appId() {
    return process.env.VITE_APP_ID ?? "";
  },
  get cookieSecret() {
    return process.env.JWT_SECRET ?? "";
  },
  get cookieSameSite() {
    return (process.env.COOKIE_SAMESITE ?? "").toLowerCase() as
      | ""
      | "lax"
      | "none"
      | "strict";
  },
  get databaseUrl() {
    return process.env.DATABASE_URL ?? "";
  },
  get oAuthServerUrl() {
    return process.env.OAUTH_SERVER_URL ?? "";
  },
  get ownerOpenId() {
    return process.env.OWNER_OPEN_ID ?? "";
  },
  get isProduction() {
    return process.env.NODE_ENV === "production";
  },
  get forgeApiUrl() {
    return process.env.BUILT_IN_FORGE_API_URL ?? "";
  },
  get forgeApiKey() {
    return process.env.BUILT_IN_FORGE_API_KEY ?? "";
  },
  get posApiKey() {
    return process.env.POS_API_KEY ?? process.env.VITE_POS_API_KEY ?? "";
  },
};
