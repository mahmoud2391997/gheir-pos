import "dotenv/config";
import { createServer } from "http";
import net from "net";
import { createApp } from "./app";
import { validateServerEnv } from "./validateEnv";
import { serveStatic, setupVite } from "./vite";

// Bind IPv4 explicitly. `listen(port)` alone uses IPv6 (::), which port
// forwarding often misses, so browsers see ERR_CONNECTION_REFUSED on localhost.
const LISTEN_HOST = "0.0.0.0";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, LISTEN_HOST, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  validateServerEnv();
  const app = createApp();
  const server = createServer(app);
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, LISTEN_HOST, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });

  // `localhost` resolves to ::1 before 127.0.0.1. An IPv6-only socket accepts
  // that connection without taking the IPv4 port the forwarder needs.
  const v6 = createServer(app);
  v6.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE" || err.code === "EAFNOSUPPORT") return;
    console.error(err);
  });
  v6.listen({ port, host: "::", ipv6Only: true });
}

startServer().catch(console.error);
