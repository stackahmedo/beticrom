import fs from "node:fs";
import path from "node:path";
import { Pool, type PoolClient } from "pg";
import { PGlite } from "@electric-sql/pglite";
import { getEnv } from "../config/env.js";

export interface QueryResult<T = Record<string, unknown>> {
  rows: T[];
  rowCount: number;
}

export interface DbClient {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;
  exec(sql: string): Promise<void>;
  transaction<T>(fn: (tx: DbClient) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

class PgPoolAdapter implements DbClient {
  constructor(private pool: Pool) {}

  async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<QueryResult<T>> {
    const res = await this.pool.query(sql, params);
    return { rows: res.rows as T[], rowCount: res.rowCount ?? res.rows.length };
  }

  async exec(sql: string): Promise<void> {
    await this.pool.query(sql);
  }

  async transaction<T>(fn: (tx: DbClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const txAdapter = new PgClientAdapter(client);
      const result = await fn(txAdapter);
      await client.query("COMMIT");
      return result;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

class PgClientAdapter implements DbClient {
  constructor(private client: PoolClient) {}

  async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<QueryResult<T>> {
    const res = await this.client.query(sql, params);
    return { rows: res.rows as T[], rowCount: res.rowCount ?? res.rows.length };
  }

  async exec(sql: string): Promise<void> {
    await this.client.query(sql);
  }

  async transaction<T>(fn: (tx: DbClient) => Promise<T>): Promise<T> {
    return fn(this);
  }

  async close(): Promise<void> {
    // Managed by outer pool.connect()
  }
}

class PGliteAdapter implements DbClient {
  constructor(private pg: PGlite) {}

  async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<QueryResult<T>> {
    const res = await this.pg.query<T>(sql, params);
    return { rows: res.rows, rowCount: res.affectedRows ?? res.rows.length };
  }

  async exec(sql: string): Promise<void> {
    await this.pg.exec(sql);
  }

  async transaction<T>(fn: (tx: DbClient) => Promise<T>): Promise<T> {
    return this.pg.transaction(async (tx) => {
      const txAdapter: DbClient = {
        query: async <R = Record<string, unknown>>(sql: string, params: unknown[] = []) => {
          const res = await tx.query<R>(sql, params);
          return { rows: res.rows, rowCount: res.affectedRows ?? res.rows.length };
        },
        exec: async (sql: string) => {
          await tx.exec(sql);
        },
        transaction: async <R>(inner: (t: DbClient) => Promise<R>) => inner(txAdapter),
        close: async () => {},
      };
      return fn(txAdapter);
    });
  }

  async close(): Promise<void> {
    await this.pg.close();
  }
}

let singletonDb: DbClient | null = null;
let initPromise: Promise<DbClient> | null = null;

export async function getDb(): Promise<DbClient> {
  if (singletonDb) return singletonDb;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const env = getEnv();
    if (env.DATABASE_URL && env.DATABASE_URL.trim().length > 0) {
      const pool = new Pool({ connectionString: env.DATABASE_URL });
      singletonDb = new PgPoolAdapter(pool);
      return singletonDb;
    }

    const dataDir = env.PGLITE_DATA_DIR === "memory" ? undefined : path.resolve(process.cwd(), env.PGLITE_DATA_DIR);
    if (dataDir) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const pg = new PGlite(dataDir);
    await pg.waitReady;
    singletonDb = new PGliteAdapter(pg);
    return singletonDb;
  })();

  return initPromise;
}

/**
 * Create an isolated in-memory PostgreSQL database for unit/integration tests.
 */
export async function createInMemoryTestDb(): Promise<DbClient> {
  const pg = new PGlite();
  await pg.waitReady;
  return new PGliteAdapter(pg);
}

export function setDbForTests(db: DbClient | null): void {
  singletonDb = db;
  initPromise = db ? Promise.resolve(db) : null;
}
