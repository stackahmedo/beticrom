import type { Context } from "hono";
import type { ZodSchema } from "zod";
import { getDb } from "../db/client.js";

export async function parseJsonBody<T>(c: Context, schema: ZodSchema<T>): Promise<{ data: T } | { error: Response }> {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return {
      error: c.json({ error: { code: "INVALID_JSON", message: "Request body must be valid JSON" } }, 400),
    };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      error: c.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Validation failed",
            details: parsed.error.issues.map((i) => ({
              path: i.path.join("."),
              message: i.message,
            })),
          },
        },
        400
      ),
    };
  }
  return { data: parsed.data };
}

export function getPagination(c: Context) {
  const page = Math.max(1, Number(c.req.query("page") || 1) || 1);
  const limit = Math.min(200, Math.max(1, Number(c.req.query("limit") || 25) || 25));
  const offset = (page - 1) * limit;
  const search = (c.req.query("search") || "").trim();
  const sort = (c.req.query("sort") || "").trim();
  return { page, limit, offset, search, sort };
}

const SENSITIVE_KEYS = new Set([
  "password",
  "password_hash",
  "passwordHash",
  "token",
  "secret",
  "secret_encrypted",
  "apiKey",
  "api_key",
  "cardNumber",
  "cvv",
  "csrfToken",
]);

export function redactSensitive(obj: unknown): unknown {
  if (obj === null || obj === undefined || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(redactSensitive);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(k)) {
      out[k] = "[REDACTED]";
    } else {
      out[k] = redactSensitive(v);
    }
  }
  return out;
}

export async function recordAuditLog(params: {
  actorUserId?: string | null;
  actorEmail?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  beforeData?: unknown;
  afterData?: unknown;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  const db = await getDb();
  await db.query(
    `INSERT INTO audit_logs (
      actor_user_id, actor_email, action, entity_type, entity_id,
      before_data, after_data, metadata, ip_address, user_agent
    ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb, $9, $10)`,
    [
      params.actorUserId ?? null,
      params.actorEmail ?? null,
      params.action,
      params.entityType,
      params.entityId ?? null,
      params.beforeData !== undefined ? JSON.stringify(redactSensitive(params.beforeData)) : null,
      params.afterData !== undefined ? JSON.stringify(redactSensitive(params.afterData)) : null,
      JSON.stringify(params.metadata ?? {}),
      params.ipAddress ?? null,
      params.userAgent ?? null,
    ]
  );
}
