import type { IncomingMessage, ServerResponse } from "http";
import { createApp } from "../server/_core/app";

const app = createApp();

export default function handler(req: IncomingMessage, res: ServerResponse) {
  try {
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
