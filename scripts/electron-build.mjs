import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const extraArgs = process.argv.slice(2);

function run(args, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: root,
      env,
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${args.join(" ")} exited with code ${code ?? 1}`));
    });
  });
}

await run(["node_modules/vite/bin/vite.js", "build"], {
  ...process.env,
  ELECTRON: "1",
});
await run(["scripts/compile-electron.mjs"]);
await run([
  "node_modules/electron-builder/cli.js",
  "--config",
  "electron-builder.yml",
  ...extraArgs,
]);
