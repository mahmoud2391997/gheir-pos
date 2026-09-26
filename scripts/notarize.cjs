/* eslint-disable @typescript-eslint/no-var-requires */
const path = require("node:path");

/**
 * electron-builder hook (afterSign).
 * - No-ops unless macOS + Apple credentials are provided via env.
 */
exports.default = async function notarize(context) {
  const { electronPlatformName, appOutDir, packager } = context;
  if (electronPlatformName !== "darwin") return;

  const appleId = process.env.APPLE_ID;
  const appleIdPassword = process.env.APPLE_APP_SPECIFIC_PASSWORD;
  const teamId = process.env.APPLE_TEAM_ID;

  if (!appleId || !appleIdPassword || !teamId) {
    console.log("[notarize] Skipping (missing APPLE_ID / APPLE_APP_SPECIFIC_PASSWORD / APPLE_TEAM_ID).");
    return;
  }

  const { notarize } = require("@electron/notarize");
  const appName = packager.appInfo.productFilename;
  const appPath = path.join(appOutDir, `${appName}.app`);

  console.log("[notarize] Notarizing", appPath);

  await notarize({
    appBundleId: packager.appInfo.id,
    appPath,
    appleId,
    appleIdPassword,
    teamId,
  });
};

