import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { spawn, type ChildProcess } from "child_process";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

const rawPort = process.env.PORT;

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH;

if (!basePath) {
  throw new Error(
    "BASE_PATH environment variable is required but was not provided.",
  );
}

const apiServerDistPath = path.resolve(import.meta.dirname, "../api-server/dist/index.mjs");

function startApiServerPlugin() {
  // Only active in development — in production the api-server runs as its own service.
  if (process.env.NODE_ENV === "production") return { name: "start-api-server" };
  let apiProcess: ChildProcess | null = null;
  return {
    name: "start-api-server",
    configureServer(server: { httpServer: { on: (event: string, cb: () => void) => void } | null }) {
      apiProcess = spawn("node", ["--enable-source-maps", apiServerDistPath], {
        env: { ...process.env, PORT: "5000", NODE_ENV: "development" },
        stdio: "inherit",
      });
      apiProcess.on("error", (err: Error) => {
        console.error("[api-server] Failed to start:", err.message);
      });
      server.httpServer?.on("close", () => {
        if (apiProcess) {
          apiProcess.kill("SIGTERM");
          apiProcess = null;
        }
      });
    },
  };
}

export default defineConfig({
  base: basePath,
  plugins: [
    startApiServerPlugin(),
    react(),
    wasm(),
    topLevelAwait(),
    nodePolyfills({
      include: ["buffer", "crypto", "stream", "util", "string_decoder", "process", "events"],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  css: {
    postcss: {
      plugins: [
        (await import("tailwindcss")).default,
        (await import("autoprefixer")).default,
      ],
    },
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "development"),
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
      // Shim for transitive dep that klend-sdk tries to resolve
      "@kamino-finance/farms-sdk/dist/@codegen/farms/programId": path.resolve(import.meta.dirname, "src/shims/kamino-farms-programId.js"),
      // Stub out klend-sdk which has problematic dependencies
      "@kamino-finance/klend-sdk": path.resolve(import.meta.dirname, "src/shims/klend-sdk.js"),
      // Stub out problematic WASM packages that cause CJS/ESM conflicts
      "@orca-so/whirlpools": path.resolve(import.meta.dirname, "src/shims/orca-whirlpools.js"),
      "@orca-so/whirlpools-core": path.resolve(import.meta.dirname, "src/shims/orca-whirlpools-core.js"),
      // stream/crypto polyfills
      "stream": "stream-browserify",
      "string_decoder": "string_decoder",
    },
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    include: [
      "string_decoder",
      "rpc-websockets",
      "react-dom/client",
      "qrcode.react",
      "bs58",
      "buffer",
      "tweetnacl",
      "@dynamic-labs/sdk-react-core",
      "@dynamic-labs/solana",
      "@dynamic-labs/ethereum",
    ],
    exclude: [
      "@orca-so/whirlpools",
      "@orca-so/whirlpools-core",
    ],
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
    },
  },
  root: path.resolve(import.meta.dirname),
  build: {
    target: "esnext",
    chunkSizeWarningLimit: 8000,
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === "MODULE_LEVEL_DIRECTIVE") return;
        if (warning.message.includes("contains an annotation that Rollup cannot interpret")) return;
        warn(warning);
      },
      output: {
        assetFileNames: "assets/[name]-[hash][extname]",
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("@kamino-finance") || id.includes("@jup-ag")) {
              return "vendor-defi";
            }
            return "vendor";
          }
        },
      },
    },
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
