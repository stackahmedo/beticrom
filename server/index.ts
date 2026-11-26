import { serve } from "@hono/node-server";
import { getEnv } from "./config/env.js";
import { getDb } from "./db/client.js";
import { runMigrations } from "./db/migrate.js";
import { seedCatalogIfEmpty, seedDevEnvironment } from "./db/seed.js";
import { createApp } from "./app.js";

async function bootstrap() {
  const env = getEnv();
  const db = await getDb();

  const mig = await runMigrations(db);
  console.log(`[DB] Migrations complete (applied: ${mig.applied.length}, skipped: ${mig.skipped.length})`);

  await seedCatalogIfEmpty(db);
  await seedDevEnvironment(db);
  console.log("[DB] Catalog & environment initialization complete");

  const app = createApp();
  serve({ fetch: app.fetch, port: env.API_PORT }, (info) => {
    console.log(`[API] Beticrom Admin & Storefront API listening on http://localhost:${info.port}`);
  });
}

bootstrap().catch((err) => {
  console.error("[API] Fatal startup error:", err);
  process.exit(1);
});
