import type { IncomingMessage, ServerResponse } from "http";

type ExpressLikeHandler = (req: any, res: any) => void;

let appPromise: Promise<ExpressLikeHandler> | null = null;

async function getApp(): Promise<ExpressLikeHandler> {
  if (!appPromise) {
    appPromise = import("../server/_core/app")
      .then(mod => mod.createApp())
      .then(app => app as unknown as ExpressLikeHandler);
  }
  return appPromise;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const app = await getApp();
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
