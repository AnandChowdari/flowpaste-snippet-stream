import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { Plugin } from "vite";
import { handleApiRequest } from "./src/lib/server/api-handler";

function apiDevServerPlugin(): Plugin {
  return {
    name: "flowpaste-api-dev-server",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || "";
        if (!url.startsWith("/api/")) {
          return next();
        }

        let body: Record<string, unknown> | null = null;
        if ((req as any).body && typeof (req as any).body === "object") {
          body = (req as any).body;
        } else if (req.method !== "GET" && req.method !== "HEAD") {
          const text = await new Promise<string>((resolve) => {
            let data = "";
            req.on("data", (chunk) => {
              data += chunk;
            });
            req.on("end", () => resolve(data));
            req.on("error", () => resolve(""));
          });
          try {
            body = text ? (JSON.parse(text) as Record<string, unknown>) : null;
          } catch {
            body = null;
          }
        }

        const pathname = url.split("?")[0] || "";
        const result = await handleApiRequest(
          req.method || "GET",
          pathname,
          body,
          (req.headers["authorization"] as string) || null,
          (req.headers["cookie"] as string) || null,
        );

        res.statusCode = result.status;
        for (const [k, v] of Object.entries(result.headers)) {
          res.setHeader(k, v);
        }
        res.end(JSON.stringify(result.body));
      });
    },
  };
}

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [apiDevServerPlugin()],
  },
});
