import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./backend/db/migrations",
  schema: "./backend/db/schema.ts",
  dialect: "sqlite",
});
