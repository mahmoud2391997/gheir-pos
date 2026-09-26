import type { IncomingMessage, ServerResponse } from "http";

type Handler = (req: any, res: any) => void;

let resolved: Handler | null = null;
let resolving: Promise<Handler> | null = null;

async function resolveHandler(): Promise<Handler> {
  if (resolved) return resolved;
  if (!resolving) {
    resolving = (async () => {
      try {
        const url = new URL("./_bundled-app.mjs", import.meta.url);
        const mod = (await import(url.href)) as { default?: Handler };
        if (typeof mod.default === "function") {
          resolved = mod.default;
          return resolved;
        }
      } catch {
        // Ignore and fall back to source version.
      }

      const mod = (await import("../server/_core/app")) as {
        createApp?: () => Handler;
      };
      if (typeof mod.createApp !== "function") {
        throw new Error("createApp export missing from server/_core/app");
      }
      resolved = mod.createApp();
      return resolved;
    })();
  }
  return resolving;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const app = await resolveHandler();
    app(req, res);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    res.statusCode = 500;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(
      JSON.stringify({
        error: "server_init_failed",
        message,
        stack,
      })
    );
  }
}
