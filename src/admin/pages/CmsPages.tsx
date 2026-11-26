import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Upload, Trash2, Copy, GripVertical, Monitor, Smartphone, History, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { apiRequest } from "../api/client";
import { PageHeader, StatusBadge } from "../components/AdminPrimitives";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";

interface CmsSectionItem {
  id: string;
  section_key: string;
  title: string;
  subtitle: string | null;
  section_type: string;
  sort_order: number;
  status: "draft" | "scheduled" | "published" | "archived";
}

export function VisualHomepageEditor() {
  const qc = useQueryClient();
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [sections, setSections] = useState<CmsSectionItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState("featured_products");

  const q = useQuery({
    queryKey: ["admin-cms-homepage-visual"],
    queryFn: () => apiRequest<{ data: CmsSectionItem[] }>("/api/v1/admin/cms/homepage-sections"),
  });

  const versionsQ = useQuery({
    queryKey: ["admin-cms-versions"],
    queryFn: () =>
      apiRequest<{ data: Array<{ id: string; version_number: number; label: string; created_at: string }> }>(
        "/api/v1/admin/cms/homepage-versions"
      ),
  });

  useEffect(() => {
    if (q.data?.data) {
      setSections(q.data.data);
      if (!selectedId && q.data.data[0]) setSelectedId(q.data.data[0].id);
    }
  }, [q.data, selectedId]);

  const reorderMut = useMutation({
    mutationFn: (orderedIds: string[]) =>
      apiRequest("/api/v1/admin/cms/homepage-sections/reorder", {
        method: "POST",
        body: JSON.stringify({ orderedIds, label: "Visual editor save" }),
      }),
    onSuccess: () => {
      toast.success("Homepage layout saved & version snapshot created");
      void qc.invalidateQueries({ queryKey: ["admin-cms-homepage-visual"] });
      void qc.invalidateQueries({ queryKey: ["admin-cms-versions"] });
    },
  });

  const upsertMut = useMutation({
    mutationFn: (payload: { sectionKey: string; title: string; subtitle?: string; sectionType: string; sortOrder: number; status: string }) =>
      apiRequest("/api/v1/admin/cms/homepage-sections", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      toast.success("Section updated");
      setNewTitle("");
      void qc.invalidateQueries({ queryKey: ["admin-cms-homepage-visual"] });
    },
  });

  const rollbackMut = useMutation({
    mutationFn: (versionId: string) =>
      apiRequest(`/api/v1/admin/cms/homepage-versions/${versionId}/rollback`, { method: "POST" }),
    onSuccess: () => {
      toast.success("Rolled back to selected version");
      void qc.invalidateQueries({ queryKey: ["admin-cms-homepage-visual"] });
    },
  });

  const selected = sections.find((s) => s.id === selectedId) || sections[0];

  const handleDrop = (targetIdx: number) => {
    if (dragIdx === null || dragIdx === targetIdx) return;
    const copy = [...sections];
    const [moved] = copy.splice(dragIdx, 1);
    copy.splice(targetIdx, 0, moved);
    setSections(copy);
    setDragIdx(null);
    reorderMut.mutate(copy.map((c) => c.id));
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Visual Homepage CMS"
        description="Drag sections to reorder, preview Desktop & 360px Mobile, edit contextual settings, and roll back versions."
        actions={
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant={previewDevice === "desktop" ? "default" : "outline"}
              className="h-8 text-xs gap-1"
              onClick={() => setPreviewDevice("desktop")}
            >
              <Monitor size={13} /> Desktop
            </Button>
            <Button
              size="sm"
              variant={previewDevice === "mobile" ? "default" : "outline"}
              className="h-8 text-xs gap-1"
              onClick={() => setPreviewDevice("mobile")}
            >
              <Smartphone size={13} /> Mobile (360px)
            </Button>
          </div>
        }
      />

      {/* 3-Panel Visual Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Panel 1: Draggable Section Navigation */}
        <div className="lg:col-span-3 bg-card border border-border rounded-lg p-3 space-y-3">
          <p className="text-xs font-semibold">Sections (Drag to Reorder)</p>
          <div className="space-y-1.5">
            {sections.map((sec, idx) => (
              <div
                key={sec.id}
                draggable
                onDragStart={() => setDragIdx(idx)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(idx)}
                onClick={() => setSelectedId(sec.id)}
                className={`p-2 rounded-md border text-xs flex items-center justify-between gap-2 cursor-pointer ${
                  selected?.id === sec.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <GripVertical size={13} className="text-muted-foreground shrink-0" />
                  <span className="truncate font-medium">{sec.title}</span>
                </div>
                <StatusBadge status={sec.status} />
              </div>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newTitle.trim()) return;
              upsertMut.mutate({
                sectionKey: `${newType}_${Date.now().toString().slice(-4)}`,
                title: newTitle,
                sectionType: newType,
                sortOrder: sections.length + 1,
                status: "draft",
              });
            }}
            className="pt-2 border-t border-border space-y-2"
          >
            <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="New section title..." className="h-8 text-xs" />
            <select value={newType} onChange={(e) => setNewType(e.target.value)} className="w-full h-8 rounded-md border border-border bg-background px-2 text-xs">
              <option value="hero_slider">Hero Slider</option>
              <option value="featured_categories">Featured Categories</option>
              <option value="featured_products">Featured Products</option>
              <option value="deal_carousel">Deal Carousel</option>
              <option value="banner_grid">Banner Grid</option>
            </select>
            <Button type="submit" size="sm" variant="outline" className="w-full h-8 text-xs gap-1">
              <Plus size={12} /> Add Section
            </Button>
          </form>
        </div>

        {/* Panel 2: Live Storefront Preview */}
        <div className="lg:col-span-6 bg-muted/40 border border-border rounded-lg p-4 flex flex-col items-center">
          <div
            className={`bg-white dark:bg-zinc-900 border border-border rounded-lg shadow-xs overflow-hidden transition-all ${
              previewDevice === "mobile" ? "w-[360px]" : "w-full"
            }`}
          >
            <div className="bg-[#12633D] text-white px-3 py-1.5 text-[11px] font-medium flex justify-between">
              <span>Beticrom Halal Market</span>
              <span>{previewDevice.toUpperCase()} PREVIEW</span>
            </div>
            <div className="p-3 space-y-2.5 max-h-[460px] overflow-y-auto">
              {sections.filter((s) => s.status !== "archived").length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-12">Add sections on the left to preview homepage layout.</p>
              ) : (
                sections
                  .filter((s) => s.status !== "archived")
                  .map((sec) => (
                    <div
                      key={sec.id}
                      onClick={() => setSelectedId(sec.id)}
                      className={`p-3 rounded-md border cursor-pointer transition-colors ${
                        selected?.id === sec.id ? "border-primary ring-1 ring-primary/30" : "border-border"
                      } ${sec.status === "draft" ? "opacity-60 border-dashed" : ""}`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold">{sec.title}</span>
                        <span className="text-[10px] uppercase text-muted-foreground">{sec.section_type} · {sec.status}</span>
                      </div>
                      {sec.subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{sec.subtitle}</p>}
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>

        {/* Panel 3: Contextual Settings & Version Rollback */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-card border border-border rounded-lg p-3 space-y-3 text-xs">
            <p className="font-semibold">Section Settings</p>
            {selected ? (
              <div className="space-y-2.5">
                <div>
                  <Label className="text-[11px]">Title</Label>
                  <Input
                    key={selected.id + "-t"}
                    defaultValue={selected.title}
                    onBlur={(e) =>
                      upsertMut.mutate({
                        sectionKey: selected.section_key,
                        title: e.target.value,
                        subtitle: selected.subtitle || undefined,
                        sectionType: selected.section_type,
                        sortOrder: selected.sort_order,
                        status: selected.status,
                      })
                    }
                    className="h-8 text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-[11px]">Visibility</Label>
                  <select
                    value={selected.status}
                    onChange={(e) =>
                      upsertMut.mutate({
                        sectionKey: selected.section_key,
                        title: selected.title,
                        subtitle: selected.subtitle || undefined,
                        sectionType: selected.section_type,
                        sortOrder: selected.sort_order,
                        status: e.target.value,
                      })
                    }
                    className="w-full h-8 rounded-md border border-border bg-background px-2 text-xs mt-1"
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">Select a section to edit.</p>
            )}
          </div>

          <div className="bg-card border border-border rounded-lg p-3 space-y-2 text-xs">
            <p className="font-semibold flex items-center gap-1.5">
              <History size={13} /> Version History
            </p>
            <div className="space-y-1.5 max-h-44 overflow-y-auto">
              {(versionsQ.data?.data || []).length === 0 ? (
                <p className="text-[11px] text-muted-foreground">Reorder sections to create snapshots.</p>
              ) : (
                (versionsQ.data?.data || []).map((v) => (
                  <div key={v.id} className="flex items-center justify-between gap-2 p-1.5 rounded bg-muted/40">
                    <div className="min-w-0">
                      <p className="font-medium truncate">v{v.version_number} · {v.label}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(v.created_at).toLocaleString()}</p>
                    </div>
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={() => rollbackMut.mutate(v.id)}>
                      <RotateCcw size={11} />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MediaLibraryPage() {
  const qc = useQueryClient();
  const [folder, setFolder] = useState("general");
  const q = useQuery({
    queryKey: ["admin-media"],
    queryFn: () => apiRequest<{ data: Array<Record<string, unknown>> }>("/api/v1/media?limit=50"),
  });

  const handleUpload = async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", folder);
    try {
      await apiRequest("/api/v1/media/upload", { method: "POST", body: fd });
      toast.success("Media uploaded");
      void qc.invalidateQueries({ queryKey: ["admin-media"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    }
  };

  const delMut = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/v1/media/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Media deleted");
      void qc.invalidateQueries({ queryKey: ["admin-media"] });
    },
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Media Library" description="Validated uploads (MIME, magic-bytes & size checked) stored in Cloudflare R2 or local storage." />

      <div className="bg-card border border-border rounded-lg p-3 flex flex-wrap items-center gap-3">
        <Input value={folder} onChange={(e) => setFolder(e.target.value)} placeholder="Folder" className="h-8 text-xs w-36" />
        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium cursor-pointer">
          <Upload size={13} /> Upload Image / File
          <input
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleUpload(f);
            }}
          />
        </label>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {(q.data?.data || []).map((m) => (
          <div key={String(m.id)} className="bg-card border border-border rounded-lg overflow-hidden text-xs">
            <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
              {String(m.mime_type).startsWith("image/") ? (
                <img src={String(m.url)} alt={String(m.filename)} className="w-full h-full object-cover" />
              ) : (
                <span className="font-mono text-[10px]">{String(m.filename)}</span>
              )}
            </div>
            <div className="p-2 space-y-1">
              <p className="truncate font-medium">{String(m.filename)}</p>
              <div className="flex justify-between">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-1.5"
                  onClick={() => {
                    void navigator.clipboard.writeText(String(m.url));
                    toast.success("URL copied");
                  }}
                >
                  <Copy size={11} />
                </Button>
                <Button size="sm" variant="ghost" className="h-6 px-1.5 text-red-600" onClick={() => delMut.mutate(String(m.id))}>
                  <Trash2 size={11} />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CmsSectionPage({
  mode,
}: {
  mode: "homepage" | "sliders" | "banners" | "pages" | "menus" | "blog-categories" | "blog-posts" | "announcements";
}) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [slugOrUrl, setSlugOrUrl] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"published" | "draft">("published");

  const endpointMap = {
    homepage: "/api/v1/admin/cms/homepage-sections",
    sliders: "/api/v1/admin/cms/sliders",
    banners: "/api/v1/admin/cms/banners",
    pages: "/api/v1/admin/cms/pages",
    menus: "/api/v1/admin/cms/menus",
    "blog-categories": "/api/v1/admin/cms/blog/categories",
    "blog-posts": "/api/v1/admin/cms/blog/posts",
    announcements: "/api/v1/admin/cms/announcements",
  };

  const q = useQuery({
    queryKey: ["admin-cms", mode],
    queryFn: () => apiRequest<{ data: Array<Record<string, unknown>> }>(endpointMap[mode]),
  });

  const createMut = useMutation({
    mutationFn: () => {
      if (mode === "homepage") {
        return apiRequest(endpointMap[mode], {
          method: "POST",
          body: JSON.stringify({
            sectionKey: slugOrUrl || title.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
            title,
            sectionType: "featured_products",
            status,
          }),
        });
      }
      if (mode === "sliders") {
        return apiRequest(endpointMap[mode], {
          method: "POST",
          body: JSON.stringify({ title, desktopImageUrl: slugOrUrl || "/beticrom-logo.png", ctaLabel: "Shop Now", status }),
        });
      }
      if (mode === "banners") {
        return apiRequest(endpointMap[mode], {
          method: "POST",
          body: JSON.stringify({ title, imageUrl: slugOrUrl || "/beticrom-logo.png", status }),
        });
      }
      if (mode === "pages") {
        return apiRequest(endpointMap[mode], {
          method: "POST",
          body: JSON.stringify({ title, slug: slugOrUrl || title.toLowerCase().replace(/[^a-z0-9]+/g, "-"), contentMarkdown: content, status }),
        });
      }
      if (mode === "blog-categories") {
        return apiRequest(endpointMap[mode], {
          method: "POST",
          body: JSON.stringify({ name: title, slug: slugOrUrl || title.toLowerCase().replace(/[^a-z0-9]+/g, "-") }),
        });
      }
      if (mode === "blog-posts") {
        return apiRequest(endpointMap[mode], {
          method: "POST",
          body: JSON.stringify({ title, slug: slugOrUrl || title.toLowerCase().replace(/[^a-z0-9]+/g, "-"), contentMarkdown: content, status }),
        });
      }
      return apiRequest(endpointMap[mode], {
        method: "POST",
        body: JSON.stringify({ message: title, linkUrl: slugOrUrl || undefined, status }),
      });
    },
    onSuccess: () => {
      toast.success("CMS item saved and synced");
      setTitle("");
      setSlugOrUrl("");
      setContent("");
      void qc.invalidateQueries({ queryKey: ["admin-cms", mode] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const togglePublish = useMutation({
    mutationFn: ({ id, nextStatus }: { id: string; nextStatus: string }) => {
      const target =
        mode === "announcements"
          ? `/api/v1/admin/cms/announcements/${id}`
          : mode === "sliders"
            ? `/api/v1/admin/cms/sliders/${id}`
            : `/api/v1/admin/cms/pages/${id}`;
      return apiRequest(target, { method: "PATCH", body: JSON.stringify({ status: nextStatus }) });
    },
    onSuccess: () => {
      toast.success("Publication status updated");
      void qc.invalidateQueries({ queryKey: ["admin-cms", mode] });
    },
  });

  return (
    <div className="space-y-4">
      <PageHeader title={`Storefront CMS: ${mode.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}`} description="Changes published here immediately reflect on the live storefront." />

      {mode !== "menus" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMut.mutate();
          }}
          className="bg-card border border-border rounded-lg p-3 space-y-2.5 text-xs"
        >
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <Label className="text-[11px]">{mode === "announcements" ? "Announcement Message" : "Title / Name"}</Label>
              <Input required value={title} onChange={(e) => setTitle(e.target.value)} className="h-8 text-xs w-64 mt-1" />
            </div>
            <div>
              <Label className="text-[11px]">{mode === "sliders" || mode === "banners" ? "Image URL" : "Slug / Key / Link"}</Label>
              <Input value={slugOrUrl} onChange={(e) => setSlugOrUrl(e.target.value)} className="h-8 text-xs w-56 mt-1" />
            </div>
            <div>
              <Label className="text-[11px]">State</Label>
              <select value={status} onChange={(e) => setStatus(e.target.value as "published" | "draft")} className="h-8 rounded-md border border-border bg-background px-2 text-xs block mt-1">
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </div>
            <Button type="submit" size="sm" className="h-8 text-xs gap-1"><Plus size={13} /> Save</Button>
          </div>
          {(mode === "pages" || mode === "blog-posts") && (
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Markdown / page body..." rows={3} className="text-xs" />
          )}
        </form>
      )}

      <div className="bg-card border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/50 border-b border-border text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-2">Title / Name</th>
              <th className="text-left px-3 py-2">Slug / Key / Location</th>
              <th className="text-left px-3 py-2">Status</th>
              <th className="text-right px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(q.data?.data || []).map((r) => (
              <tr key={String(r.id)}>
                <td className="px-3 py-2 font-medium">{String(r.title || r.name || r.message)}</td>
                <td className="px-3 py-2 font-mono text-muted-foreground">{String(r.slug || r.section_key || r.location || r.placement || "")}</td>
                <td className="px-3 py-2"><StatusBadge status={String(r.status || (r.is_active ? "active" : "draft"))} /></td>
                <td className="px-3 py-2 text-right">
                  {(mode === "announcements" || mode === "sliders" || mode === "pages") && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => togglePublish.mutate({ id: String(r.id), nextStatus: r.status === "published" ? "draft" : "published" })}
                    >
                      {r.status === "published" ? "Unpublish" : "Publish"}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
