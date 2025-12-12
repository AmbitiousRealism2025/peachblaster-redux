import { defineConfig } from "vite";

export default defineConfig({
  build: {
    target: "es2020",
    minify: "terser",
    sourcemap: false,
    cssCodeSplit: true,
    assetsInlineLimit: 4 * 1024,
    rollupOptions: {
      output: {
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (id.includes("/three/") || id.includes("\\three\\")) {
            return "three";
          }

          return "vendor";
        }
      }
    }
  }
});
