import crypto from "node:crypto";
import type { Express, Request, Response } from "express";
import { z } from "zod";
import { ENV } from "./env";
import * as db from "../db";

function etagOf(input: unknown) {
  return `"${crypto.createHash("sha1").update(JSON.stringify(input)).digest("hex")}"`;
}

function configured() {
  return Boolean(ENV.posApiKey);
}

function requirePosKey(req: Request, res: Response): boolean {
  if (!configured()) {
    res.status(503).json({ error: "POS API key is not configured" });
    return false;
  }
  const provided = String(req.header("x-pos-key") || "");
  if (!provided || provided !== ENV.posApiKey) {
    res.status(401).json({ error: "unauthorized" });
    return false;
  }
  return true;
}

export function registerPosRoutes(app: Express) {
  app.get("/api/pos/status", async (req, res) => {
    if (!requirePosKey(req, res)) return;
    const watermark = await db.getPosWatermark();
    res.json({
      ok: true,
      lastUpdatedAt: watermark.asOf,
      inventoryVersion: watermark.version,
    });
  });

  app.get("/api/pos/products", async (req, res) => {
    if (!requirePosKey(req, res)) return;

    const sinceRaw = typeof req.query.since === "string" ? req.query.since : undefined;
    const since = sinceRaw ? z.string().datetime().safeParse(sinceRaw) : null;
    const { products, asOf, version } = await db.listPosProducts({
      since: since?.success ? since.data : undefined,
    });
    const etag = etagOf({ version, asOf, count: products.length });

    if (req.header("if-none-match") === etag) {
      res.status(304).end();
      return;
    }

    res.setHeader("etag", etag);
    res.json({ products, asOf, inventoryVersion: version });
  });

  app.post("/api/pos/sales", async (req, res) => {
    if (!requirePosKey(req, res)) return;

    const schema = z.object({
      clientSaleId: z.string().trim().min(1).max(80),
      deviceId: z.string().trim().max(64).optional(),
      paymentMethod: z.enum(["cash", "card", "instapay"]),
      notes: z.string().max(500).optional(),
      items: z
        .array(
          z.object({
            sku: z.string().trim().min(1).max(64),
            quantity: z.number().int().positive().max(999),
          })
        )
        .min(1)
        .max(200),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid request" });
      return;
    }

    try {
      const result = await db.createPosSale({
        receiptNumber: parsed.data.clientSaleId,
        paymentMethod: parsed.data.paymentMethod,
        items: parsed.data.items,
      });
      res.json({ ok: true, deduped: result.deduped });
    } catch (error) {
      res
        .status(400)
        .json({
          error: error instanceof Error ? error.message : String(error),
        });
    }
  });
}
