import { build } from "esbuild";

await build({
  entryPoints: ["server/_core/vercel-entry.ts"],
  outfile: "api/_bundled-app.mjs",
  platform: "node",
  format: "esm",
  target: "node18",
  bundle: true,
  sourcemap: false,
  packages: "external",
});

