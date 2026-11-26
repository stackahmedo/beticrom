import { Hono } from "hono";
import { z } from "zod";
import { getDb } from "../../db/client.js";
import { requireAdminAuth } from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/rbac.js";
import { parseJsonBody, recordAuditLog } from "../../middleware/validate.js";

const cmsRoutes = new Hono();
cmsRoutes.use("*", requireAdminAuth);

// ─── Homepage Sections ────────────────────────────────────────────────────────
cmsRoutes.get("/homepage-sections", requirePermission("cms.read"), async (c) => {
  const db = await getDb();
  const res = await db.query("SELECT * FROM cms_homepage_sections ORDER BY sort_order ASC");
  return c.json({ data: res.rows });
});

cmsRoutes.post("/homepage-sections", requirePermission("cms.write"), async (c) => {
  const parsed = await parseJsonBody(
    c,
    z.object({
      sectionKey: z.string().min(2),
      title: z.string().min(1),
      subtitle: z.string().optional(),
      sectionType: z.enum([
        "hero_slider",
        "banner_grid",
        "featured_categories",
        "featured_products",
        "deal_carousel",
        "custom_html",
        "trust_strip",
        "blog_highlights",
      ]),
      sortOrder: z.coerce.number().int().default(0),
      status: z.enum(["draft", "scheduled", "published", "archived"]).default("published"),
      config: z.record(z.string(), z.unknown()).default({}),
    })
  );
  if ("error" in parsed) return parsed.error;
  const d = parsed.data;
  const actor = c.get("authUser");
  const db = await getDb();
  const res = await db.query(
    `INSERT INTO cms_homepage_sections (section_key, title, subtitle, section_type, sort_order, status, config, published_at, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, CASE WHEN $6 = 'published' THEN NOW() ELSE NULL END, $8)
     ON CONFLICT (section_key) DO UPDATE SET
       title = EXCLUDED.title, subtitle = EXCLUDED.subtitle, sort_order = EXCLUDED.sort_order,
       status = EXCLUDED.status, config = EXCLUDED.config, updated_by = EXCLUDED.updated_by, updated_at = NOW()
     RETURNING *`,
    [d.sectionKey, d.title, d.subtitle ?? null, d.sectionType, d.sortOrder, d.status, JSON.stringify(d.config), actor.id]
  );
  return c.json({ data: res.rows[0] }, 201);
});

cmsRoutes.post("/homepage-sections/reorder", requirePermission("cms.write"), async (c) => {
  const parsed = await parseJsonBody(
    c,
    z.object({
      orderedIds: z.array(z.string().uuid()).min(1),
      label: z.string().optional(),
    })
  );
  if ("error" in parsed) return parsed.error;
  const actor = c.get("authUser");
  const db = await getDb();

  await db.transaction(async (tx) => {
    for (let i = 0; i < parsed.data.orderedIds.length; i++) {
      await tx.query("UPDATE cms_homepage_sections SET sort_order = $1, updated_by = $2, updated_at = NOW() WHERE id = $3", [
        i + 1,
        actor.id,
        parsed.data.orderedIds[i],
      ]);
    }
    const snapRes = await tx.query("SELECT * FROM cms_homepage_sections ORDER BY sort_order ASC");
    const verRes = await tx.query<{ max_v: number }>("SELECT COALESCE(MAX(version_number), 0)::int AS max_v FROM cms_homepage_versions");
    await tx.query(
      `INSERT INTO cms_homepage_versions (version_number, label, snapshot, created_by)
       VALUES ($1, $2, $3::jsonb, $4)`,
      [(verRes.rows[0]?.max_v || 0) + 1, parsed.data.label || "Layout update", JSON.stringify(snapRes.rows), actor.id]
    );
  });

  return c.json({ data: { reordered: true } });
});

cmsRoutes.get("/homepage-versions", requirePermission("cms.read"), async (c) => {
  const db = await getDb();
  const res = await db.query(
    `SELECT v.id, v.version_number, v.label, v.created_at, u.full_name AS author_name
     FROM cms_homepage_versions v LEFT JOIN users u ON u.id = v.created_by
     ORDER BY v.version_number DESC LIMIT 20`
  );
  return c.json({ data: res.rows });
});

cmsRoutes.post("/homepage-versions/:id/rollback", requirePermission("cms.write"), async (c) => {
  const id = c.req.param("id");
  const actor = c.get("authUser");
  const db = await getDb();
  const vRes = await db.query<{ snapshot: Array<Record<string, unknown>> }>("SELECT snapshot FROM cms_homepage_versions WHERE id = $1", [id]);
  const snap = vRes.rows[0]?.snapshot;
  if (!snap) return c.json({ error: { code: "NOT_FOUND", message: "Version not found" } }, 404);

  await db.transaction(async (tx) => {
    for (const sec of snap) {
      await tx.query(
        `UPDATE cms_homepage_sections SET title = $1, subtitle = $2, sort_order = $3, status = $4, updated_by = $5, updated_at = NOW() WHERE id = $6`,
        [sec.title, sec.subtitle ?? null, sec.sort_order, sec.status, actor.id, sec.id]
      );
    }
  });
  return c.json({ data: { rolledBack: true } });
});

// ─── Sliders ──────────────────────────────────────────────────────────────────
cmsRoutes.get("/sliders", requirePermission("cms.read"), async (c) => {
  const db = await getDb();
  const res = await db.query("SELECT * FROM cms_sliders ORDER BY sort_order ASC, created_at DESC");
  return c.json({ data: res.rows });
});

cmsRoutes.post("/sliders", requirePermission("cms.write"), async (c) => {
  const parsed = await parseJsonBody(
    c,
    z.object({
      title: z.string().min(1),
      subtitle: z.string().optional(),
      ctaLabel: z.string().optional(),
      ctaUrl: z.string().optional(),
      desktopImageUrl: z.string().min(1),
      mobileImageUrl: z.string().optional(),
      placement: z.string().default("homepage_hero"),
      sortOrder: z.coerce.number().int().default(0),
      status: z.enum(["draft", "scheduled", "published", "archived"]).default("published"),
      startsAt: z.string().nullable().optional(),
      endsAt: z.string().nullable().optional(),
    })
  );
  if ("error" in parsed) return parsed.error;
  const d = parsed.data;
  const actor = c.get("authUser");
  const db = await getDb();
  const res = await db.query(
    `INSERT INTO cms_sliders (title, subtitle, cta_label, cta_url, desktop_image_url, mobile_image_url, placement, sort_order, status, starts_at, ends_at, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
    [d.title, d.subtitle ?? null, d.ctaLabel ?? null, d.ctaUrl ?? null, d.desktopImageUrl, d.mobileImageUrl ?? null, d.placement, d.sortOrder, d.status, d.startsAt ?? null, d.endsAt ?? null, actor.id]
  );
  return c.json({ data: res.rows[0] }, 201);
});

cmsRoutes.patch("/sliders/:id", requirePermission("cms.write"), async (c) => {
  const parsed = await parseJsonBody(c, z.object({ status: z.enum(["draft", "scheduled", "published", "archived"]).optional(), sortOrder: z.coerce.number().int().optional() }));
  if ("error" in parsed) return parsed.error;
  const db = await getDb();
  const res = await db.query(
    "UPDATE cms_sliders SET status = COALESCE($1, status), sort_order = COALESCE($2, sort_order), updated_at = NOW() WHERE id = $3 RETURNING *",
    [parsed.data.status ?? null, parsed.data.sortOrder ?? null, c.req.param("id")]
  );
  return c.json({ data: res.rows[0] });
});

// ─── Banners ──────────────────────────────────────────────────────────────────
cmsRoutes.get("/banners", requirePermission("cms.read"), async (c) => {
  const db = await getDb();
  const res = await db.query("SELECT * FROM cms_banners ORDER BY sort_order ASC, created_at DESC");
  return c.json({ data: res.rows });
});

cmsRoutes.post("/banners", requirePermission("cms.write"), async (c) => {
  const parsed = await parseJsonBody(
    c,
    z.object({
      title: z.string().min(1),
      subtitle: z.string().optional(),
      imageUrl: z.string().min(1),
      linkUrl: z.string().optional(),
      placement: z.enum(["homepage_top", "homepage_mid", "homepage_bottom", "category_top", "sidebar", "popup"]).default("homepage_mid"),
      sortOrder: z.coerce.number().int().default(0),
      status: z.enum(["draft", "scheduled", "published", "archived"]).default("published"),
    })
  );
  if ("error" in parsed) return parsed.error;
  const d = parsed.data;
  const actor = c.get("authUser");
  const db = await getDb();
  const res = await db.query(
    `INSERT INTO cms_banners (title, subtitle, image_url, link_url, placement, sort_order, status, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [d.title, d.subtitle ?? null, d.imageUrl, d.linkUrl ?? null, d.placement, d.sortOrder, d.status, actor.id]
  );
  return c.json({ data: res.rows[0] }, 201);
});

// ─── Static Pages ─────────────────────────────────────────────────────────────
cmsRoutes.get("/pages", requirePermission("cms.read"), async (c) => {
  const db = await getDb();
  const res = await db.query("SELECT * FROM cms_pages WHERE deleted_at IS NULL ORDER BY updated_at DESC");
  return c.json({ data: res.rows });
});

cmsRoutes.post("/pages", requirePermission("cms.write"), async (c) => {
  const parsed = await parseJsonBody(
    c,
    z.object({
      title: z.string().min(1),
      slug: z.string().min(1),
      contentMarkdown: z.string().default(""),
      seoTitle: z.string().optional(),
      seoDescription: z.string().optional(),
      status: z.enum(["draft", "scheduled", "published", "archived"]).default("draft"),
      scheduledAt: z.string().nullable().optional(),
    })
  );
  if ("error" in parsed) return parsed.error;
  const d = parsed.data;
  const actor = c.get("authUser");
  const db = await getDb();
  const res = await db.query(
    `INSERT INTO cms_pages (title, slug, content_markdown, seo_title, seo_description, status, published_at, scheduled_at, author_user_id)
     VALUES ($1, $2, $3, $4, $5, $6, CASE WHEN $6 = 'published' THEN NOW() ELSE NULL END, $7, $8) RETURNING *`,
    [d.title, d.slug.toLowerCase(), d.contentMarkdown, d.seoTitle ?? null, d.seoDescription ?? null, d.status, d.scheduledAt ?? null, actor.id]
  );
  await recordAuditLog({
    actorUserId: actor.id,
    actorEmail: actor.email,
    action: "cms_page.created",
    entityType: "cms_page",
    entityId: res.rows[0].id as string,
    afterData: { slug: d.slug, status: d.status },
  });
  return c.json({ data: res.rows[0] }, 201);
});

cmsRoutes.patch("/pages/:id", requirePermission("cms.write"), async (c) => {
  const parsed = await parseJsonBody(
    c,
    z.object({
      title: z.string().optional(),
      contentMarkdown: z.string().optional(),
      status: z.enum(["draft", "scheduled", "published", "archived"]).optional(),
      seoTitle: z.string().optional(),
      seoDescription: z.string().optional(),
    })
  );
  if ("error" in parsed) return parsed.error;
  const d = parsed.data;
  const db = await getDb();
  const res = await db.query(
    `UPDATE cms_pages SET
      title = COALESCE($1, title),
      content_markdown = COALESCE($2, content_markdown),
      status = COALESCE($3, status),
      published_at = CASE WHEN $3 = 'published' AND published_at IS NULL THEN NOW() ELSE published_at END,
      seo_title = COALESCE($4, seo_title),
      seo_description = COALESCE($5, seo_description),
      updated_at = NOW()
     WHERE id = $6 RETURNING *`,
    [d.title ?? null, d.contentMarkdown ?? null, d.status ?? null, d.seoTitle ?? null, d.seoDescription ?? null, c.req.param("id")]
  );
  return c.json({ data: res.rows[0] });
});

// ─── Navigation Menus ─────────────────────────────────────────────────────────
cmsRoutes.get("/menus", requirePermission("cms.read"), async (c) => {
  const db = await getDb();
  const res = await db.query(
    `SELECT m.*, COALESCE(json_agg(mi.* ORDER BY mi.sort_order) FILTER (WHERE mi.id IS NOT NULL), '[]') AS items
     FROM cms_menus m LEFT JOIN cms_menu_items mi ON mi.menu_id = m.id
     GROUP BY m.id ORDER BY m.location`
  );
  return c.json({ data: res.rows });
});

cmsRoutes.post("/menus/:menuId/items", requirePermission("cms.write"), async (c) => {
  const parsed = await parseJsonBody(
    c,
    z.object({ label: z.string().min(1), url: z.string().min(1), sortOrder: z.coerce.number().int().default(0) })
  );
  if ("error" in parsed) return parsed.error;
  const db = await getDb();
  const res = await db.query(
    `INSERT INTO cms_menu_items (menu_id, label, url, sort_order) VALUES ($1, $2, $3, $4) RETURNING *`,
    [c.req.param("menuId"), parsed.data.label, parsed.data.url, parsed.data.sortOrder]
  );
  return c.json({ data: res.rows[0] }, 201);
});

// ─── Blog Categories & Posts ──────────────────────────────────────────────────
cmsRoutes.get("/blog/categories", requirePermission("cms.read"), async (c) => {
  const db = await getDb();
  const res = await db.query("SELECT * FROM cms_blog_categories ORDER BY sort_order, name");
  return c.json({ data: res.rows });
});

cmsRoutes.post("/blog/categories", requirePermission("cms.write"), async (c) => {
  const parsed = await parseJsonBody(c, z.object({ name: z.string().min(1), slug: z.string().min(1), description: z.string().optional() }));
  if ("error" in parsed) return parsed.error;
  const db = await getDb();
  const res = await db.query(
    "INSERT INTO cms_blog_categories (name, slug, description) VALUES ($1, $2, $3) RETURNING *",
    [parsed.data.name, parsed.data.slug.toLowerCase(), parsed.data.description ?? null]
  );
  return c.json({ data: res.rows[0] }, 201);
});

cmsRoutes.get("/blog/posts", requirePermission("cms.read"), async (c) => {
  const db = await getDb();
  const res = await db.query(
    `SELECT bp.*, bc.name AS category_name
     FROM cms_blog_posts bp LEFT JOIN cms_blog_categories bc ON bc.id = bp.category_id
     WHERE bp.deleted_at IS NULL ORDER BY bp.created_at DESC`
  );
  return c.json({ data: res.rows });
});

cmsRoutes.post("/blog/posts", requirePermission("cms.write"), async (c) => {
  const parsed = await parseJsonBody(
    c,
    z.object({
      categoryId: z.string().uuid().nullable().optional(),
      title: z.string().min(1),
      slug: z.string().min(1),
      excerpt: z.string().optional(),
      contentMarkdown: z.string().default(""),
      featuredImageUrl: z.string().optional(),
      status: z.enum(["draft", "scheduled", "published", "archived"]).default("draft"),
    })
  );
  if ("error" in parsed) return parsed.error;
  const d = parsed.data;
  const actor = c.get("authUser");
  const db = await getDb();
  const res = await db.query(
    `INSERT INTO cms_blog_posts (category_id, title, slug, excerpt, content_markdown, featured_image_url, status, published_at, author_user_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, CASE WHEN $7 = 'published' THEN NOW() ELSE NULL END, $8) RETURNING *`,
    [d.categoryId ?? null, d.title, d.slug.toLowerCase(), d.excerpt ?? null, d.contentMarkdown, d.featuredImageUrl ?? null, d.status, actor.id]
  );
  return c.json({ data: res.rows[0] }, 201);
});

// ─── Announcements & Team Members ─────────────────────────────────────────────
cmsRoutes.get("/announcements", requirePermission("cms.read"), async (c) => {
  const db = await getDb();
  const res = await db.query("SELECT * FROM cms_announcements ORDER BY sort_order ASC, created_at DESC");
  return c.json({ data: res.rows });
});

cmsRoutes.post("/announcements", requirePermission("cms.write"), async (c) => {
  const parsed = await parseJsonBody(
    c,
    z.object({
      badgeText: z.string().optional(),
      message: z.string().min(1),
      linkUrl: z.string().optional(),
      bgColor: z.string().default("#12633D"),
      textColor: z.string().default("#FFFFFF"),
      status: z.enum(["draft", "scheduled", "published", "archived"]).default("published"),
    })
  );
  if ("error" in parsed) return parsed.error;
  const d = parsed.data;
  const actor = c.get("authUser");
  const db = await getDb();
  const res = await db.query(
    `INSERT INTO cms_announcements (badge_text, message, message_i18n, link_url, bg_color, text_color, status, created_by)
     VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, $8) RETURNING *`,
    [
      d.badgeText ?? null,
      d.message,
      JSON.stringify({ EN: d.message, JA: d.message, BN: d.message }),
      d.linkUrl ?? null,
      d.bgColor,
      d.textColor,
      d.status,
      actor.id,
    ]
  );
  return c.json({ data: res.rows[0] }, 201);
});

cmsRoutes.patch("/announcements/:id", requirePermission("cms.write"), async (c) => {
  const parsed = await parseJsonBody(c, z.object({ status: z.enum(["draft", "scheduled", "published", "archived"]) }));
  if ("error" in parsed) return parsed.error;
  const db = await getDb();
  const res = await db.query("UPDATE cms_announcements SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *", [
    parsed.data.status,
    c.req.param("id"),
  ]);
  return c.json({ data: res.rows[0] });
});

cmsRoutes.get("/team", requirePermission("team.manage", "cms.read"), async (c) => {
  const db = await getDb();
  const res = await db.query("SELECT * FROM team_members ORDER BY sort_order ASC, full_name ASC");
  return c.json({ data: res.rows });
});

cmsRoutes.post("/team", requirePermission("team.manage"), async (c) => {
  const parsed = await parseJsonBody(
    c,
    z.object({
      fullName: z.string().min(2),
      roleTitle: z.string().min(2),
      department: z.string().optional(),
      bio: z.string().optional(),
      avatarUrl: z.string().optional(),
      email: z.string().email().optional(),
      isPublic: z.boolean().default(true),
    })
  );
  if ("error" in parsed) return parsed.error;
  const d = parsed.data;
  const db = await getDb();
  const res = await db.query(
    `INSERT INTO team_members (full_name, role_title, department, bio, avatar_url, email, is_public)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [d.fullName, d.roleTitle, d.department ?? null, d.bio ?? null, d.avatarUrl ?? null, d.email ?? null, d.isPublic]
  );
  return c.json({ data: res.rows[0] }, 201);
});

export default cmsRoutes;
