import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import { spawn, type ChildProcess } from "child_process";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rawPort = process.env.PORT || "24013";
const port = Number(rawPort);
const basePath = "/";

const apiServerSourcePath = path.resolve(__dirname, "api/local-server.ts");

function startApiServerPlugin() {
  // Only active in development — in production the api-server runs as its own service.
  if (process.env.NODE_ENV === "production") return { name: "start-api-server" };
  let apiProcess: ChildProcess | null = null;
  return {
    name: "start-api-server",
    configureServer(server: { httpServer: { on: (event: string, cb: () => void) => void } | null }) {
      const npxCmd = process.platform === "win32" ? "npx.cmd" : "npx";
      const spawnArgs = ["tsx", apiServerSourcePath];
      
      apiProcess = spawn(npxCmd, spawnArgs, {
        env: { ...process.env, PORT: "5000", NODE_ENV: "development" },
        stdio: "inherit",
        shell: process.platform === "win32",
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
      include: ["buffer", "process", "util", "stream", "crypto", "events", "string_decoder"],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
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
    "process.env": "{}",
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "development"),
    global: "globalThis",
  },
  resolve: {
    alias: {
      "react": path.resolve(__dirname, "node_modules/react"),
      "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
      "@": path.resolve(__dirname, "src/client"),
      "@assets": path.resolve(__dirname, "attached_assets"),
      // Shim for transitive dep that klend-sdk tries to resolve
      "@kamino-finance/farms-sdk/dist/@codegen/farms/programId": path.resolve(__dirname, "src/client/shims/kamino-farms-programId.js"),
      // Stub out klend-sdk which has problematic dependencies
      "@kamino-finance/klend-sdk": path.resolve(__dirname, "src/client/shims/klend-sdk.js"),
      // Stub out problematic WASM packages that cause CJS/ESM conflicts
      "@orca-so/whirlpools": path.resolve(__dirname, "src/client/shims/orca-whirlpools.js"),
      "@orca-so/whirlpools-core": path.resolve(__dirname, "src/client/shims/orca-whirlpools-core.js"),
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
      "@dynamic-labs/sdk-api-core",
      "@dynamic-labs/wagmi-connector",
      "@dynamic-labs/solana",
      "@dynamic-labs/ethereum",
      "@solana/web3.js",
      "@solana/wallet-adapter-react",
      "@solana/wallet-adapter-base",
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
  root: path.resolve(__dirname),
  build: {
    target: "esnext",
    chunkSizeWarningLimit: 8000,
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
    sourcemap: false,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      external: [],
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

