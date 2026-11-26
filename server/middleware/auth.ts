import type { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import { getDb } from "../db/client.js";
import { sha256Hex } from "../utils/crypto.js";

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
  permissions: string[];
  vendorId: string | null;
  sessionId: string;
  csrfToken: string;
}

declare module "hono" {
  interface ContextVariableMap {
    authUser: AuthUser;
  }
}

export const SESSION_COOKIE_NAME = "beticrom_admin_session";

export async function loadAuthUserBySessionToken(rawToken: string): Promise<AuthUser | null> {
  const db = await getDb();
  const tokenHash = sha256Hex(rawToken);

  const sessionRes = await db.query<{
    session_id: string;
    csrf_token: string;
    user_id: string;
    email: string;
    full_name: string;
    status: string;
  }>(
    `SELECT s.id AS session_id, s.csrf_token, u.id AS user_id, u.email, u.full_name, u.status
     FROM admin_sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1
       AND s.revoked_at IS NULL
       AND s.expires_at > NOW()
       AND u.deleted_at IS NULL
     LIMIT 1`,
    [tokenHash]
  );

  const row = sessionRes.rows[0];
  if (!row || row.status !== "active") return null;

  await db.query("UPDATE admin_sessions SET last_seen_at = NOW() WHERE id = $1", [row.session_id]);

  const roleRes = await db.query<{ slug: string }>(
    `SELECT r.slug FROM roles r
     JOIN user_roles ur ON ur.role_id = r.id
     WHERE ur.user_id = $1`,
    [row.user_id]
  );
  const roles = roleRes.rows.map((r) => r.slug);

  const permRes = await db.query<{ key: string }>(
    `SELECT DISTINCT p.key FROM permissions p
     JOIN role_permissions rp ON rp.permission_id = p.id
     JOIN user_roles ur ON ur.role_id = rp.role_id
     WHERE ur.user_id = $1`,
    [row.user_id]
  );
  const permissions = permRes.rows.map((p) => p.key);

  let vendorId: string | null = null;
  if (roles.includes("vendor") && !roles.includes("super_admin") && !roles.includes("store_manager")) {
    const vRes = await db.query<{ id: string }>(
      "SELECT id FROM vendors WHERE owner_user_id = $1 AND deleted_at IS NULL LIMIT 1",
      [row.user_id]
    );
    vendorId = vRes.rows[0]?.id || null;
  }

  return {
    id: row.user_id,
    email: row.email,
    fullName: row.full_name,
    roles,
    permissions,
    vendorId,
    sessionId: row.session_id,
    csrfToken: row.csrf_token,
  };
}

export async function requireAdminAuth(c: Context, next: Next) {
  const cookieToken = getCookie(c, SESSION_COOKIE_NAME);
  const authHeader = c.req.header("Authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  const rawToken = cookieToken || bearerToken;

  if (!rawToken) {
    return c.json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } }, 401);
  }

  const user = await loadAuthUserBySessionToken(rawToken);
  if (!user) {
    return c.json({ error: { code: "UNAUTHORIZED", message: "Session expired or invalid" } }, 401);
  }

  // CSRF check for cookie-authenticated mutating requests
  if (cookieToken && !["GET", "HEAD", "OPTIONS"].includes(c.req.method)) {
    const csrfHeader = c.req.header("X-CSRF-Token");
    if (!csrfHeader || csrfHeader !== user.csrfToken) {
      return c.json({ error: { code: "CSRF_INVALID", message: "Invalid or missing CSRF token" } }, 403);
    }
  }

  c.set("authUser", user);
  await next();
}
