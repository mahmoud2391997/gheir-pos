import fs from "node:fs";
import path from "node:path";
import { app, safeStorage } from "electron";

export type PosSecrets = {
  websiteApiBaseUrl: string;
  posApiKey: string;
  deviceId?: string;
};

const SECRET_FILE = () =>
  path.join(app.getPath("userData"), "pos-secrets.json");

type StoredBlob = {
  websiteApiBaseUrl?: string;
  posApiKeyEnc?: string;
  posApiKey?: string;
  deviceId?: string;
};

function readEnvSecrets(): Partial<PosSecrets> {
  const websiteApiBaseUrl = String(
    process.env.WEBSITE_API_BASE_URL ||
      process.env.VITE_WEBSITE_API_BASE_URL ||
      ""
  )
    .trim()
    .replace(/\/+$/, "");
  const posApiKey = String(process.env.POS_API_KEY || "").trim();
  const deviceId =
    String(
      process.env.POS_DEVICE_ID || process.env.VITE_POS_DEVICE_ID || ""
    ).trim() || undefined;
  return {
    websiteApiBaseUrl: websiteApiBaseUrl || undefined,
    posApiKey: posApiKey || undefined,
    deviceId,
  };
}

function readStoredSecrets(): Partial<PosSecrets> {
  try {
    const raw = fs.readFileSync(SECRET_FILE(), "utf8");
    const parsed = JSON.parse(raw) as StoredBlob;
    let posApiKey = parsed.posApiKey?.trim() || "";
    if (
      !posApiKey &&
      parsed.posApiKeyEnc &&
      safeStorage.isEncryptionAvailable()
    ) {
      posApiKey = safeStorage
        .decryptString(Buffer.from(parsed.posApiKeyEnc, "base64"))
        .trim();
    }
    return {
      websiteApiBaseUrl:
        parsed.websiteApiBaseUrl?.trim().replace(/\/+$/, "") || undefined,
      posApiKey: posApiKey || undefined,
      deviceId: parsed.deviceId?.trim() || undefined,
    };
  } catch {
    return {};
  }
}

/** Prefer process env, then OS-encrypted local store (Electron safeStorage). */
export function loadSecrets(): PosSecrets {
  const env = readEnvSecrets();
  const stored = readStoredSecrets();
  return {
    websiteApiBaseUrl: env.websiteApiBaseUrl || stored.websiteApiBaseUrl || "",
    posApiKey: env.posApiKey || stored.posApiKey || "",
    deviceId: env.deviceId || stored.deviceId,
  };
}

export function secretsConfigured(secrets = loadSecrets()) {
  return Boolean(secrets.websiteApiBaseUrl && secrets.posApiKey);
}

export function persistSecrets(input: PosSecrets) {
  const payload: StoredBlob = {
    websiteApiBaseUrl: input.websiteApiBaseUrl.replace(/\/+$/, ""),
    deviceId: input.deviceId,
  };
  if (safeStorage.isEncryptionAvailable()) {
    payload.posApiKeyEnc = safeStorage
      .encryptString(input.posApiKey)
      .toString("base64");
  } else {
    // Fallback when encryption is unavailable (some CI / headless Linux sessions).
    payload.posApiKey = input.posApiKey;
  }
  fs.mkdirSync(path.dirname(SECRET_FILE()), { recursive: true });
  fs.writeFileSync(SECRET_FILE(), JSON.stringify(payload, null, 2), "utf8");
}
