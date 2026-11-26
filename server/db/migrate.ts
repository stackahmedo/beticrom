import fs from "node:fs";
import path from "node:path";
import type { DbClient } from "./client.js";
import { sha256Hex } from "../utils/crypto.js";

const MIGRATIONS_DIR = path.resolve(process.cwd(), "supabase/migrations");

export async function runMigrations(db: DbClient): Promise<{ applied: string[]; skipped: string[] }> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      checksum TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const existingRes = await db.query<{ version: string; checksum: string }>(
    "SELECT version, checksum FROM schema_migrations"
  );
  const existingMap = new Map(existingRes.rows.map((r) => [r.version, r.checksum]));

  const applied: string[] = [];
  const skipped: string[] = [];

  for (const file of files) {
    const version = file.replace(/\.sql$/, "");
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    const checksum = sha256Hex(sql);

    const prevChecksum = existingMap.get(version);
    if (prevChecksum) {
      if (prevChecksum !== checksum) {
        throw new Error(
          `Migration checksum mismatch for ${version}. Never edit already-applied migrations; create a new migration instead.`
        );
      }
      skipped.push(version);
      continue;
    }

    await db.transaction(async (tx) => {
      await tx.exec(sql);
      await tx.query(
        "INSERT INTO schema_migrations (version, checksum) VALUES ($1, $2) ON CONFLICT (version) DO NOTHING",
        [version, checksum]
      );
    });
    applied.push(version);
  }

  return { applied, skipped };
}
