import { Hono } from "hono";
import { z } from "zod";
import { getDb } from "../../db/client.js";
import { requireAdminAuth } from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/rbac.js";
import { getPagination, parseJsonBody, recordAuditLog } from "../../middleware/validate.js";
import { hashPassword } from "../../utils/crypto.js";

const rbacRoutes = new Hono();
rbacRoutes.use("*", requireAdminAuth);

// ─── Admin Users ──────────────────────────────────────────────────────────────
rbacRoutes.get("/users", requirePermission("users.read"), async (c) => {
  const { page, limit, offset, search } = getPagination(c);
  const db = await getDb();
  const where = search
    ? "WHERE u.deleted_at IS NULL AND (LOWER(u.email) LIKE $1 OR LOWER(u.full_name) LIKE $1)"
    : "WHERE u.deleted_at IS NULL";
  const params = search ? [`%${search.toLowerCase()}%`] : [];

  const countRes = await db.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM users u ${where}`, params);
  const total = Number(countRes.rows[0]?.count || 0);

  const rowsRes = await db.query(
    `SELECT u.id, u.email, u.full_name, u.phone, u.status, u.mfa_enabled, u.last_login_at, u.created_at,
            COALESCE(json_agg(json_build_object('id', r.id, 'slug', r.slug, 'name', r.name))
              FILTER (WHERE r.id IS NOT NULL), '[]') AS roles
     FROM users u
     LEFT JOIN user_roles ur ON ur.user_id = u.id
     LEFT JOIN roles r ON r.id = ur.role_id
     ${where}
     GROUP BY u.id
     ORDER BY u.created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  return c.json({
    data: rowsRes.rows,
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  });
});

const createUserSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2).max(120),
  password: z.string().min(8).max(128),
  phone: z.string().optional(),
  status: z.enum(["active", "inactive", "suspended"]).default("active"),
  roleIds: z.array(z.string().uuid()).min(1),
});

rbacRoutes.post("/users", requirePermission("users.manage"), async (c) => {
  const parsed = await parseJsonBody(c, createUserSchema);
  if ("error" in parsed) return parsed.error;
  const actor = c.get("authUser");
  const db = await getDb();
  const passHash = await hashPassword(parsed.data.password);

  try {
    const created = await db.transaction(async (tx) => {
      const uRes = await tx.query<{ id: string; email: string; full_name: string }>(
        `INSERT INTO users (email, password_hash, full_name, phone, status)
         VALUES ($1, $2, $3, $4, $5) RETURNING id, email, full_name, status, created_at`,
        [
          parsed.data.email.trim().toLowerCase(),
          passHash,
          parsed.data.fullName.trim(),
          parsed.data.phone || null,
          parsed.data.status,
        ]
      );
      const userId = uRes.rows[0].id;
      for (const roleId of parsed.data.roleIds) {
        await tx.query(
          "INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
          [userId, roleId, actor.id]
        );
      }
      return uRes.rows[0];
    });

    await recordAuditLog({
      actorUserId: actor.id,
      actorEmail: actor.email,
      action: "admin_user.created",
      entityType: "user",
      entityId: created.id,
      afterData: { email: created.email, fullName: created.full_name, roleIds: parsed.data.roleIds },
    });

    return c.json({ data: created }, 201);
  } catch (err) {
    return c.json(
      { error: { code: "CONFLICT", message: err instanceof Error ? err.message : "Could not create user" } },
      400
    );
  }
});

const updateUserSchema = z.object({
  fullName: z.string().min(2).max(120).optional(),
  phone: z.string().nullable().optional(),
  status: z.enum(["active", "inactive", "suspended", "locked"]).optional(),
  roleIds: z.array(z.string().uuid()).optional(),
});

rbacRoutes.patch("/users/:id", requirePermission("users.manage"), async (c) => {
  const parsed = await parseJsonBody(c, updateUserSchema);
  if ("error" in parsed) return parsed.error;
  const id = c.req.param("id");
  const actor = c.get("authUser");
  const db = await getDb();

  try {
    const updated = await db.transaction(async (tx) => {
      const prev = await tx.query("SELECT id, email, full_name, status FROM users WHERE id = $1 AND deleted_at IS NULL", [id]);
      if (!prev.rows[0]) throw new Error("NOT_FOUND");

      if (parsed.data.fullName !== undefined || parsed.data.phone !== undefined || parsed.data.status !== undefined) {
        await tx.query(
          `UPDATE users SET
            full_name = COALESCE($1, full_name),
            phone = COALESCE($2, phone),
            status = COALESCE($3, status),
            updated_at = NOW()
           WHERE id = $4`,
          [parsed.data.fullName ?? null, parsed.data.phone ?? null, parsed.data.status ?? null, id]
        );
      }

      if (parsed.data.roleIds) {
        // Delete existing roles one by one or via set; trigger protects last super_admin
        await tx.query("DELETE FROM user_roles WHERE user_id = $1 AND role_id <> ALL($2::uuid[])", [
          id,
          parsed.data.roleIds,
        ]);
        for (const roleId of parsed.data.roleIds) {
          await tx.query(
            "INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
            [id, roleId, actor.id]
          );
        }
      }

      const next = await tx.query("SELECT id, email, full_name, status FROM users WHERE id = $1", [id]);
      return { before: prev.rows[0], after: next.rows[0] };
    });

    await recordAuditLog({
      actorUserId: actor.id,
      actorEmail: actor.email,
      action: "admin_user.updated",
      entityType: "user",
      entityId: id,
      beforeData: updated.before,
      afterData: updated.after,
    });

    return c.json({ data: updated.after });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Update failed";
    if (msg === "NOT_FOUND") return c.json({ error: { code: "NOT_FOUND", message: "User not found" } }, 404);
    return c.json({ error: { code: "BAD_REQUEST", message: msg } }, 400);
  }
});

rbacRoutes.delete("/users/:id", requirePermission("users.manage"), async (c) => {
  const id = c.req.param("id");
  const actor = c.get("authUser");
  const db = await getDb();

  try {
    await db.query("UPDATE users SET deleted_at = NOW(), status = 'inactive' WHERE id = $1 AND deleted_at IS NULL", [id]);
    await recordAuditLog({
      actorUserId: actor.id,
      actorEmail: actor.email,
      action: "admin_user.deleted",
      entityType: "user",
      entityId: id,
    });
    return c.json({ data: { deleted: true } });
  } catch (err) {
    return c.json(
      { error: { code: "PROTECTED_ACCOUNT", message: err instanceof Error ? err.message : "Cannot delete user" } },
      400
    );
  }
});

// ─── Roles & Permissions ──────────────────────────────────────────────────────
rbacRoutes.get("/roles", requirePermission("users.read", "roles.manage"), async (c) => {
  const db = await getDb();
  const res = await db.query(
    `SELECT r.id, r.slug, r.name, r.description, r.is_system, r.created_at,
            COALESCE(json_agg(p.key) FILTER (WHERE p.id IS NOT NULL), '[]') AS permission_keys
     FROM roles r
     LEFT JOIN role_permissions rp ON rp.role_id = r.id
     LEFT JOIN permissions p ON p.id = rp.permission_id
     GROUP BY r.id
     ORDER BY r.is_system DESC, r.name ASC`
  );
  return c.json({ data: res.rows });
});

rbacRoutes.get("/permissions", requirePermission("users.read", "roles.manage"), async (c) => {
  const db = await getDb();
  const res = await db.query("SELECT id, key, module, name, description FROM permissions ORDER BY module, key");
  return c.json({ data: res.rows });
});

const roleSchema = z.object({
  slug: z.string().min(2).max(50).regex(/^[a-z0-9_]+$/),
  name: z.string().min(2).max(80),
  description: z.string().optional(),
  permissionKeys: z.array(z.string()).default([]),
});

rbacRoutes.post("/roles", requirePermission("roles.manage"), async (c) => {
  const parsed = await parseJsonBody(c, roleSchema);
  if ("error" in parsed) return parsed.error;
  const actor = c.get("authUser");
  const db = await getDb();

  const created = await db.transaction(async (tx) => {
    const rRes = await tx.query<{ id: string }>(
      "INSERT INTO roles (slug, name, description, is_system) VALUES ($1, $2, $3, FALSE) RETURNING id",
      [parsed.data.slug, parsed.data.name, parsed.data.description || null]
    );
    const roleId = rRes.rows[0].id;
    if (parsed.data.permissionKeys.length > 0) {
      await tx.query(
        `INSERT INTO role_permissions (role_id, permission_id)
         SELECT $1, id FROM permissions WHERE key = ANY($2::text[]) ON CONFLICT DO NOTHING`,
        [roleId, parsed.data.permissionKeys]
      );
    }
    return { id: roleId, ...parsed.data };
  });

  await recordAuditLog({
    actorUserId: actor.id,
    actorEmail: actor.email,
    action: "role.created",
    entityType: "role",
    entityId: created.id,
    afterData: created,
  });

  return c.json({ data: created }, 201);
});

rbacRoutes.put("/roles/:id/permissions", requirePermission("roles.manage"), async (c) => {
  const parsed = await parseJsonBody(c, z.object({ permissionKeys: z.array(z.string()) }));
  if ("error" in parsed) return parsed.error;

  const roleId = c.req.param("id");
  const actor = c.get("authUser");
  const db = await getDb();

  const roleRes = await db.query<{ slug: string }>("SELECT slug FROM roles WHERE id = $1", [roleId]);
  if (!roleRes.rows[0]) {
    return c.json({ error: { code: "NOT_FOUND", message: "Role not found" } }, 404);
  }
  if (roleRes.rows[0].slug === "super_admin") {
    return c.json({ error: { code: "FORBIDDEN", message: "Super Admin permissions cannot be restricted" } }, 400);
  }

  await db.transaction(async (tx) => {
    await tx.query("DELETE FROM role_permissions WHERE role_id = $1", [roleId]);
    if (parsed.data.permissionKeys.length > 0) {
      await tx.query(
        `INSERT INTO role_permissions (role_id, permission_id)
         SELECT $1, id FROM permissions WHERE key = ANY($2::text[]) ON CONFLICT DO NOTHING`,
        [roleId, parsed.data.permissionKeys]
      );
    }
  });

  await recordAuditLog({
    actorUserId: actor.id,
    actorEmail: actor.email,
    action: "role.permissions_updated",
    entityType: "role",
    entityId: roleId,
    afterData: { permissionKeys: parsed.data.permissionKeys },
  });

  return c.json({ data: { roleId, permissionKeys: parsed.data.permissionKeys } });
});

// ─── Audit Logs ───────────────────────────────────────────────────────────────
rbacRoutes.get("/audit-logs", requirePermission("audit.read"), async (c) => {
  const { page, limit, offset, search } = getPagination(c);
  const entityType = c.req.query("entityType");
  const db = await getDb();

  const conds: string[] = [];
  const params: unknown[] = [];
  if (search) {
    params.push(`%${search.toLowerCase()}%`);
    conds.push(`(LOWER(action) LIKE $${params.length} OR LOWER(COALESCE(actor_email,'')) LIKE $${params.length})`);
  }
  if (entityType) {
    params.push(entityType);
    conds.push(`entity_type = $${params.length}`);
  }
  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";

  const countRes = await db.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM audit_logs ${where}`, params);
  const total = Number(countRes.rows[0]?.count || 0);

  const rowsRes = await db.query(
    `SELECT * FROM audit_logs ${where} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  return c.json({
    data: rowsRes.rows,
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  });
});

export default rbacRoutes;
