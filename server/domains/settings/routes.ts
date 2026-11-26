import { Hono } from "hono";
import { z } from "zod";
import { getDb } from "../../db/client.js";
import { requireAdminAuth } from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/rbac.js";
import { parseJsonBody, recordAuditLog } from "../../middleware/validate.js";

const settingsRoutes = new Hono();
settingsRoutes.use("*", requireAdminAuth);

settingsRoutes.get("/", requirePermission("settings.read"), async (c) => {
  const category = c.req.query("category");
  const db = await getDb();
  const res = category
    ? await db.query("SELECT * FROM store_settings WHERE category = $1 ORDER BY key", [category])
    : await db.query("SELECT * FROM store_settings ORDER BY category, key");
  return c.json({ data: res.rows });
});

settingsRoutes.put("/:key", requirePermission("settings.manage"), async (c) => {
  const key = c.req.param("key");
  const parsed = await parseJsonBody(c, z.object({ value: z.record(z.string(), z.unknown()) }));
  if ("error" in parsed) return parsed.error;
  const actor = c.get("authUser");
  const db = await getDb();

  const prev = await db.query("SELECT value FROM store_settings WHERE key = $1", [key]);
  const res = await db.query(
    `INSERT INTO store_settings (key, category, value, updated_by, updated_at)
     VALUES ($1, 'general', $2::jsonb, $3, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = NOW()
     RETURNING *`,
    [key, JSON.stringify(parsed.data.value), actor.id]
  );

  await recordAuditLog({
    actorUserId: actor.id,
    actorEmail: actor.email,
    action: "settings.updated",
    entityType: "store_setting",
    entityId: key,
    beforeData: prev.rows[0]?.value,
    afterData: parsed.data.value,
  });

  return c.json({ data: res.rows[0] });
});

export default settingsRoutes;
