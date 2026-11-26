import fs from "node:fs";
import path from "node:path";
import { Hono } from "hono";
import { getDb } from "../../db/client.js";
import { requireAdminAuth } from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/rbac.js";
import { getPagination, recordAuditLog } from "../../middleware/validate.js";
import { uploadMediaBuffer, validateUploadFile } from "../../integrations/storage.js";

const mediaRoutes = new Hono();

// Public file serving for local validated uploads
mediaRoutes.get("/files/*", async (c) => {
  const relPath = c.req.path.replace(/^\/api\/v1\/media\/files\//, "");
  const normalized = path.normalize(relPath).replace(/^(\.\.[/\\])+/, "");
  const fullPath = path.resolve(process.cwd(), ".local/uploads", normalized);
  if (!fullPath.startsWith(path.resolve(process.cwd(), ".local/uploads")) || !fs.existsSync(fullPath)) {
    return c.json({ error: { code: "NOT_FOUND", message: "Media file not found" } }, 404);
  }
  const buf = fs.readFileSync(fullPath);
  const ext = path.extname(fullPath).toLowerCase();
  const mime =
    ext === ".png"
      ? "image/png"
      : ext === ".webp"
        ? "image/webp"
        : ext === ".gif"
          ? "image/gif"
          : ext === ".pdf"
            ? "application/pdf"
            : ext === ".mp4"
              ? "video/mp4"
              : "image/jpeg";
  return new Response(new Uint8Array(buf), {
    headers: { "Content-Type": mime, "Cache-Control": "public, max-age=31536000" },
  });
});

mediaRoutes.get("/", requireAdminAuth, requirePermission("media.read"), async (c) => {
  const { page, limit, offset, search } = getPagination(c);
  const folder = c.req.query("folder");
  const db = await getDb();

  const conds = ["deleted_at IS NULL"];
  const params: unknown[] = [];
  if (search) {
    params.push(`%${search.toLowerCase()}%`);
    conds.push(`(LOWER(filename) LIKE $${params.length} OR LOWER(COALESCE(alt_text,'')) LIKE $${params.length})`);
  }
  if (folder && folder !== "all") {
    params.push(folder);
    conds.push(`folder = $${params.length}`);
  }
  const where = `WHERE ${conds.join(" AND ")}`;

  const countRes = await db.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM media_assets ${where}`, params);
  const total = Number(countRes.rows[0]?.count || 0);

  const rowsRes = await db.query(
    `SELECT * FROM media_assets ${where} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  return c.json({
    data: rowsRes.rows,
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  });
});

mediaRoutes.post("/upload", requireAdminAuth, requirePermission("media.write"), async (c) => {
  const actor = c.get("authUser");
  const formData = await c.req.formData();
  const file = formData.get("file");
  const folder = String(formData.get("folder") || "general");
  const altText = formData.get("altText") ? String(formData.get("altText")) : null;

  if (!file || !(file instanceof File)) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Multipart 'file' field is required" } }, 400);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  try {
    validateUploadFile({ name: file.name, type: file.type, size: file.size, buffer });
    const stored = await uploadMediaBuffer({
      filename: file.name,
      mimeType: file.type,
      buffer,
      folder,
    });

    const db = await getDb();
    const res = await db.query(
      `INSERT INTO media_assets (storage_provider, storage_key, url, filename, mime_type, size_bytes, alt_text, folder, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [stored.provider, stored.storageKey, stored.url, file.name, file.type, file.size, altText, folder, actor.id]
    );

    await recordAuditLog({
      actorUserId: actor.id,
      actorEmail: actor.email,
      action: "media.uploaded",
      entityType: "media_asset",
      entityId: res.rows[0].id as string,
      afterData: { filename: file.name, mimeType: file.type, sizeBytes: file.size },
    });

    return c.json({ data: res.rows[0] }, 201);
  } catch (err) {
    return c.json(
      { error: { code: "UPLOAD_REJECTED", message: err instanceof Error ? err.message : "Upload failed" } },
      400
    );
  }
});

mediaRoutes.delete("/:id", requireAdminAuth, requirePermission("media.write"), async (c) => {
  const db = await getDb();
  await db.query("UPDATE media_assets SET deleted_at = NOW() WHERE id = $1", [c.req.param("id")]);
  return c.json({ data: { deleted: true } });
});

export default mediaRoutes;
