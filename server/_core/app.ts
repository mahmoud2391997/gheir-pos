import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerPosRoutes } from "./posApi";
import { registerStorageProxy } from "./storageProxy";
import { validateServerEnv } from "./validateEnv";
import { appRouter } from "../routers";
import { createContext } from "./context";

export function createApp() {
  validateServerEnv();
  const app = express();
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  registerPosRoutes(app);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  return app;
}
