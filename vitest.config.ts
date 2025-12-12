import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        "src/main.ts",
        "src/vite-env.d.ts",
        "src/audio/**",
        "src/entities/**",
        "src/input/**",
        "src/rendering/**",
        "src/ui/**",
        "src/core/BossProgression.ts",
        "src/core/GameLoop.ts",
        "src/core/LivesManager.ts",
        "src/core/PauseController.ts",
        "src/core/ScoreManager.ts",
        "src/core/Time.ts",
        "src/systems/SpawnSystem.ts",
      ],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
});
