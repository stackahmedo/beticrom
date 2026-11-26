import { Hono } from "hono";
import { setCookie, deleteCookie, getCookie } from "hono/cookie";
import { z } from "zod";
import { getDb } from "../../db/client.js";
import { getEnv } from "../../config/env.js";
import {
  decryptSecret,
  encryptSecret,
  generateBase32Secret,
  generateOpaqueToken,
  hashPassword,
  sha256Hex,
  verifyPassword,
  verifyTotpCode,
} from "../../utils/crypto.js";
import { parseJsonBody, recordAuditLog } from "../../middleware/validate.js";
import { rateLimit } from "../../middleware/rateLimit.js";
import {
  loadAuthUserBySessionToken,
  requireAdminAuth,
  SESSION_COOKIE_NAME,
} from "../../middleware/auth.js";
import { sendTransactionalEmail } from "../../integrations/mailer.js";

const authRoutes = new Hono();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  totpCode: z.string().optional(),
});

authRoutes.post("/login", rateLimit({ windowMs: 60_000, max: 15, keyPrefix: "auth_login" }), async (c) => {
  const parsed = await parseJsonBody(c, loginSchema);
  if ("error" in parsed) return parsed.error;
  const { email, password, totpCode } = parsed.data;
  const normalizedEmail = email.trim().toLowerCase();

  const db = await getDb();
  const userRes = await db.query<{
    id: string;
    email: string;
    password_hash: string | null;
    full_name: string;
    status: string;
    mfa_enabled: boolean;
    failed_login_attempts: number;
    locked_until: string | null;
  }>(
    `SELECT id, email, password_hash, full_name, status, mfa_enabled, failed_login_attempts, locked_until
     FROM users WHERE LOWER(email) = $1 AND deleted_at IS NULL LIMIT 1`,
    [normalizedEmail]
  );

  const user = userRes.rows[0];
  if (!user || !user.password_hash) {
    return c.json({ error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } }, 401);
  }

  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    return c.json(
      { error: { code: "ACCOUNT_LOCKED", message: "Account temporarily locked due to failed login attempts" } },
      423
    );
  }

  if (user.status !== "active") {
    return c.json({ error: { code: "ACCOUNT_INACTIVE", message: "Account is not active" } }, 403);
  }

  const validPass = await verifyPassword(password, user.password_hash);
  if (!validPass) {
    const nextAttempts = user.failed_login_attempts + 1;
    const lockUntil = nextAttempts >= 5 ? new Date(Date.now() + 15 * 60_000).toISOString() : null;
    await db.query(
      "UPDATE users SET failed_login_attempts = $1, locked_until = $2 WHERE id = $3",
      [nextAttempts, lockUntil, user.id]
    );
    await recordAuditLog({
      actorUserId: user.id,
      actorEmail: user.email,
      action: "auth.login_failed",
      entityType: "user",
      entityId: user.id,
      ipAddress: c.req.header("x-forwarded-for") || null,
      userAgent: c.req.header("user-agent") || null,
    });
    return c.json({ error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } }, 401);
  }

  // Verify TOTP MFA if enabled
  if (user.mfa_enabled) {
    if (!totpCode) {
      return c.json({ error: { code: "MFA_REQUIRED", message: "Two-factor authentication code required" } }, 401);
    }
    const mfaRes = await db.query<{ secret_encrypted: string }>(
      "SELECT secret_encrypted FROM admin_mfa_factors WHERE user_id = $1 LIMIT 1",
      [user.id]
    );
    const factor = mfaRes.rows[0];
    if (!factor || !verifyTotpCode(decryptSecret(factor.secret_encrypted), totpCode)) {
      return c.json({ error: { code: "MFA_INVALID", message: "Invalid two-factor authentication code" } }, 401);
    }
  }

  const rawToken = generateOpaqueToken(32);
  const tokenHash = sha256Hex(rawToken);
  const csrfToken = generateOpaqueToken(16);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const ip = c.req.header("x-forwarded-for") || null;
  const ua = c.req.header("user-agent") || null;

  await db.query(
    `INSERT INTO admin_sessions (user_id, token_hash, csrf_token, mfa_verified, ip_address, user_agent, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [user.id, tokenHash, csrfToken, user.mfa_enabled, ip, ua, expiresAt.toISOString()]
  );

  await db.query(
    "UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login_at = NOW(), last_login_ip = $1 WHERE id = $2",
    [ip, user.id]
  );

  await recordAuditLog({
    actorUserId: user.id,
    actorEmail: user.email,
    action: "auth.login_success",
    entityType: "user",
    entityId: user.id,
    ipAddress: ip,
    userAgent: ua,
  });

  const env = getEnv();
  setCookie(c, SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    sameSite: "Lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24,
  });

  const authUser = await loadAuthUserBySessionToken(rawToken);
  return c.json({ data: { user: authUser, csrfToken, sessionToken: rawToken } });
});

authRoutes.post("/logout", requireAdminAuth, async (c) => {
  const user = c.get("authUser");
  const db = await getDb();
  await db.query("UPDATE admin_sessions SET revoked_at = NOW() WHERE id = $1", [user.sessionId]);
  deleteCookie(c, SESSION_COOKIE_NAME, { path: "/" });
  await recordAuditLog({
    actorUserId: user.id,
    actorEmail: user.email,
    action: "auth.logout",
    entityType: "session",
    entityId: user.sessionId,
  });
  return c.json({ data: { loggedOut: true } });
});

authRoutes.get("/me", async (c) => {
  const cookieToken = getCookie(c, SESSION_COOKIE_NAME);
  const authHeader = c.req.header("Authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  const rawToken = cookieToken || bearerToken;
  if (!rawToken) {
    return c.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, 401);
  }
  const authUser = await loadAuthUserBySessionToken(rawToken);
  if (!authUser) {
    return c.json({ error: { code: "UNAUTHORIZED", message: "Session invalid or expired" } }, 401);
  }
  return c.json({ data: { user: authUser, csrfToken: authUser.csrfToken } });
});

authRoutes.get("/sessions", requireAdminAuth, async (c) => {
  const user = c.get("authUser");
  const db = await getDb();
  const res = await db.query(
    `SELECT id, ip_address, user_agent, mfa_verified, last_seen_at, expires_at, created_at
     FROM admin_sessions WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > NOW()
     ORDER BY last_seen_at DESC`,
    [user.id]
  );
  return c.json({ data: res.rows });
});

authRoutes.delete("/sessions/:id", requireAdminAuth, async (c) => {
  const user = c.get("authUser");
  const db = await getDb();
  await db.query("UPDATE admin_sessions SET revoked_at = NOW() WHERE id = $1 AND user_id = $2", [
    c.req.param("id"),
    user.id,
  ]);
  return c.json({ data: { revoked: true } });
});

// ─── Change Password ──────────────────────────────────────────────────────────
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

authRoutes.post("/change-password", requireAdminAuth, async (c) => {
  const parsed = await parseJsonBody(c, changePasswordSchema);
  if ("error" in parsed) return parsed.error;

  const user = c.get("authUser");
  const db = await getDb();
  const res = await db.query<{ password_hash: string | null }>("SELECT password_hash FROM users WHERE id = $1", [user.id]);
  const stored = res.rows[0]?.password_hash;
  if (!stored || !(await verifyPassword(parsed.data.currentPassword, stored))) {
    return c.json({ error: { code: "INVALID_PASSWORD", message: "Current password is incorrect" } }, 400);
  }

  const nextHash = await hashPassword(parsed.data.newPassword);
  await db.query("UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2", [nextHash, user.id]);
  await recordAuditLog({
    actorUserId: user.id,
    actorEmail: user.email,
    action: "auth.password_changed",
    entityType: "user",
    entityId: user.id,
  });
  return c.json({ data: { updated: true } });
});

// ─── Password Recovery ────────────────────────────────────────────────────────
authRoutes.post("/recover", rateLimit({ windowMs: 60_000, max: 5, keyPrefix: "auth_recover" }), async (c) => {
  const parsed = await parseJsonBody(c, z.object({ email: z.string().email() }));
  if ("error" in parsed) return parsed.error;

  const db = await getDb();
  const userRes = await db.query<{ id: string; email: string }>(
    "SELECT id, email FROM users WHERE LOWER(email) = $1 AND status = 'active' AND deleted_at IS NULL LIMIT 1",
    [parsed.data.email.trim().toLowerCase()]
  );

  if (userRes.rows[0]) {
    const rawToken = generateOpaqueToken(24);
    const tokenHash = sha256Hex(rawToken);
    const expiresAt = new Date(Date.now() + 30 * 60_000).toISOString();
    await db.query(
      "INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
      [userRes.rows[0].id, tokenHash, expiresAt]
    );
    await sendTransactionalEmail({
      to: userRes.rows[0].email,
      subject: "Beticrom Admin Password Reset",
      html: `<p>Use this single-use reset token within 30 minutes:</p><pre>${rawToken}</pre>`,
    });
  }

  // Always return success to prevent email enumeration
  return c.json({ data: { sent: true } });
});

authRoutes.post("/reset-password", rateLimit({ windowMs: 60_000, max: 10, keyPrefix: "auth_reset" }), async (c) => {
  const parsed = await parseJsonBody(c, z.object({ token: z.string().min(10), newPassword: z.string().min(8) }));
  if ("error" in parsed) return parsed.error;

  const db = await getDb();
  const tokenHash = sha256Hex(parsed.data.token.trim());
  const tokRes = await db.query<{ id: string; user_id: string }>(
    `SELECT id, user_id FROM password_reset_tokens
     WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW() LIMIT 1`,
    [tokenHash]
  );
  const tok = tokRes.rows[0];
  if (!tok) {
    return c.json({ error: { code: "INVALID_TOKEN", message: "Reset token is invalid or expired" } }, 400);
  }

  const nextHash = await hashPassword(parsed.data.newPassword);
  await db.transaction(async (tx) => {
    await tx.query("UPDATE users SET password_hash = $1, failed_login_attempts = 0, locked_until = NULL WHERE id = $2", [
      nextHash,
      tok.user_id,
    ]);
    await tx.query("UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1", [tok.id]);
    await tx.query("UPDATE admin_sessions SET revoked_at = NOW() WHERE user_id = $1", [tok.user_id]);
  });

  return c.json({ data: { reset: true } });
});

// ─── TOTP MFA Enrollment & Disable ────────────────────────────────────────────
authRoutes.post("/mfa/setup", requireAdminAuth, async (c) => {
  const user = c.get("authUser");
  const secret = generateBase32Secret(20);
  const encrypted = encryptSecret(secret);
  const db = await getDb();
  await db.query(
    `INSERT INTO admin_mfa_factors (user_id, secret_encrypted)
     VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET secret_encrypted = EXCLUDED.secret_encrypted, verified_at = NULL`,
    [user.id, encrypted]
  );
  const otpauthUrl = `otpauth://totp/BeticromAdmin:${encodeURIComponent(user.email)}?secret=${secret}&issuer=BeticromAdmin`;
  return c.json({ data: { secret, otpauthUrl } });
});

authRoutes.post("/mfa/enable", requireAdminAuth, async (c) => {
  const parsed = await parseJsonBody(c, z.object({ code: z.string().length(6) }));
  if ("error" in parsed) return parsed.error;

  const user = c.get("authUser");
  const db = await getDb();
  const res = await db.query<{ secret_encrypted: string }>(
    "SELECT secret_encrypted FROM admin_mfa_factors WHERE user_id = $1 LIMIT 1",
    [user.id]
  );
  if (!res.rows[0] || !verifyTotpCode(decryptSecret(res.rows[0].secret_encrypted), parsed.data.code)) {
    return c.json({ error: { code: "MFA_INVALID", message: "Invalid verification code" } }, 400);
  }
  await db.query("UPDATE admin_mfa_factors SET verified_at = NOW() WHERE user_id = $1", [user.id]);
  await db.query("UPDATE users SET mfa_enabled = TRUE WHERE id = $1", [user.id]);
  return c.json({ data: { mfaEnabled: true } });
});

authRoutes.post("/mfa/disable", requireAdminAuth, async (c) => {
  const user = c.get("authUser");
  const db = await getDb();
  await db.query("UPDATE users SET mfa_enabled = FALSE WHERE id = $1", [user.id]);
  await db.query("DELETE FROM admin_mfa_factors WHERE user_id = $1", [user.id]);
  return c.json({ data: { mfaEnabled: false } });
});

export default authRoutes;
