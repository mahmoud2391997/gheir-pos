import type { IncomingMessage, ServerResponse } from "http";
import { createServer } from "http";
import { createApp } from "../server/_core/app";

const server = createServer(createApp());

export default function handler(req: IncomingMessage, res: ServerResponse) {
  server.emit("request", req, res);
}
