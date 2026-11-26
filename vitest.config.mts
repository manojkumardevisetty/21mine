import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: { alias: { "@": resolve(__dirname, "src") } },
  test: {
    environment: "node",
    globalSetup: ["./tests/global-setup.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/twentyonemine_test",
      ORDER_LINK_SECRET: "test-secret-test-secret-test-secret", AUTH_SECRET: "test-auth-secret-test-auth-secret",
      STORE_MODE: "demo", PAYMENT_PROVIDER: "simulated", SEED_ADMIN_PASSWORD: "Admin#Test2026", APP_URL: "http://localhost:3000",
    },
  },
});
