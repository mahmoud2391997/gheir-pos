import { expect, it } from "vitest";
import { buildReceiptMarkup, createDemoSale, defaultSystemSettings, normalizeSystemSettings, receiptsDocumentHtml } from "@shared/sku";

it("preserves older settings and supports custom, multiline and empty receipt headers", () => {
  expect(normalizeSystemSettings({}).receiptHeader).toBe(defaultSystemSettings.receiptHeader);
  const settings = normalizeSystemSettings({ receiptHeader: "أهلاً\nStudio <shop>" });
  const sale = createDemoSale([], "cash");
  const markup = buildReceiptMarkup(sale, undefined, settings);
  expect(markup).toContain("أهلاً<br/>Studio &lt;shop&gt;");
  expect(receiptsDocumentHtml([sale], undefined, settings)).toContain("أهلاً<br/>Studio &lt;shop&gt;");
  const empty = normalizeSystemSettings({ receiptHeader: "" });
  expect(empty.receiptHeader).toBe("");
  expect(buildReceiptMarkup(sale, undefined, empty)).not.toContain("Handcrafted design studio");
});
