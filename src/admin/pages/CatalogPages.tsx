import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import * as XLSX from "xlsx";
import { Plus, Download, Upload, Copy, Archive, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiRequest } from "../api/client";
import { DataTable } from "../components/DataTable";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { PageHeader, StatusBadge, formatMoney } from "../components/AdminPrimitives";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";

interface ProductRow {
  id: string;
  sku: string;
  name: string;
  slug: string;
  regular_price: string;
  sale_price: string | null;
  cost_price: string;
  status: string;
  storage_type: string;
  halal_tier: string;
  category_name: string | null;
  brand_name: string | null;
  available_stock: number;
  featured_image_url: string | null;
}

export function AllProductsPage({ onNavigate }: { onNavigate: (r: string) => void }) {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [selected, setSelected] = useState<ProductRow[]>([]);
  const [archiveId, setArchiveId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  const productsQuery = useQuery({
    queryKey: ["admin-products", page, search, status, stockFilter],
    queryFn: () =>
      apiRequest<{ data: ProductRow[]; meta: { page: number; totalPages: number; total: number } }>(
        `/api/v1/admin/catalog/products?page=${page}&limit=25&search=${encodeURIComponent(search)}&status=${status}&stockFilter=${stockFilter}`
      ),
  });

  const bulkMut = useMutation({
    mutationFn: (payload: { ids: string[]; action: "publish" | "draft" | "archive" }) =>
      apiRequest("/api/v1/admin/catalog/products/bulk", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => {
      toast.success("Bulk action applied");
      void qc.invalidateQueries({ queryKey: ["admin-products"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const duplicateMut = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/v1/admin/catalog/products/${id}/duplicate`, { method: "POST" }),
    onSuccess: () => {
      toast.success("Product duplicated as draft");
      void qc.invalidateQueries({ queryKey: ["admin-products"] });
    },
  });

  const archiveMut = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/v1/admin/catalog/products/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Product archived");
      setArchiveId(null);
      void qc.invalidateQueries({ queryKey: ["admin-products"] });
    },
  });

  const columns: ColumnDef<ProductRow, unknown>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
        />
      ),
      cell: ({ row }) => (
        <input type="checkbox" checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} />
      ),
    },
    {
      accessorKey: "sku",
      header: "SKU",
      cell: ({ row }) => <span className="font-mono font-semibold text-primary">{row.original.sku}</span>,
    },
    {
      accessorKey: "name",
      header: "Product",
      cell: ({ row }) => (
        <div className="flex items-center gap-2 max-w-[260px]">
          {row.original.featured_image_url && (
            <img src={row.original.featured_image_url} alt="" className="w-8 h-8 rounded object-cover shrink-0 bg-muted" />
          )}
          <div className="min-w-0">
            <p className="font-medium truncate">{row.original.name}</p>
            <p className="text-[10px] text-muted-foreground truncate">
              {row.original.category_name || "Uncategorized"} · {row.original.brand_name || "Generic"}
            </p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "regular_price",
      header: "Price",
      cell: ({ row }) => (
        <div className="tabular-nums">
          <span className="font-semibold">{formatMoney(row.original.sale_price ?? row.original.regular_price)}</span>
          {row.original.sale_price && (
            <span className="block text-[10px] line-through text-muted-foreground">
              {formatMoney(row.original.regular_price)}
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "available_stock",
      header: "Stock",
      cell: ({ row }) => (
        <span
          className={`font-semibold tabular-nums ${
            row.original.available_stock <= 0
              ? "text-red-600"
              : row.original.available_stock <= 10
                ? "text-amber-600"
                : "text-foreground"
          }`}
        >
          {row.original.available_stock}
        </span>
      ),
    },
    {
      accessorKey: "storage_type",
      header: "Storage",
      cell: ({ row }) => <StatusBadge status={row.original.storage_type} />,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditId(row.original.id)} title="Edit">
            <Edit size={13} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2"
            onClick={() => duplicateMut.mutate(row.original.id)}
            title="Duplicate"
          >
            <Copy size={13} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-red-600"
            onClick={() => setArchiveId(row.original.id)}
            title="Archive"
          >
            <Archive size={13} />
          </Button>
        </div>
      ),
    },
  ];

  if (editId) {
    return <ProductFormPage productId={editId} onDone={() => setEditId(null)} />;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="All Products"
        description="Manage catalog items, pricing, variants, SEO metadata, and publication status."
        actions={
          <>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1.5"
              onClick={() => onNavigate("catalog/import")}
            >
              <Upload size={13} /> Import
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1.5"
              onClick={() => window.open(`/api/v1/admin/catalog/products-export?format=csv&status=${status}`, "_blank")}
            >
              <Download size={13} /> Export
            </Button>
            <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => onNavigate("catalog/add-product")}>
              <Plus size={13} /> Add Product
            </Button>
          </>
        }
      />

      {/* Filters & Bulk Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-card border border-border rounded-lg p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search name, SKU, barcode..."
            className="h-8 text-xs w-60"
          />
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="h-8 rounded-md border border-border bg-background px-2 text-xs"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="inactive">Inactive</option>
            <option value="archived">Archived</option>
          </select>
          <select
            value={stockFilter}
            onChange={(e) => {
              setStockFilter(e.target.value);
              setPage(1);
            }}
            className="h-8 rounded-md border border-border bg-background px-2 text-xs"
          >
            <option value="all">All Stock</option>
            <option value="low">Low Stock</option>
            <option value="out">Out of Stock</option>
          </select>
        </div>

        {selected.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground">{selected.length} selected:</span>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => bulkMut.mutate({ ids: selected.map((s) => s.id), action: "publish" })}
            >
              Publish
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => bulkMut.mutate({ ids: selected.map((s) => s.id), action: "archive" })}
            >
              Archive
            </Button>
          </div>
        )}
      </div>

      <DataTable
        columns={columns}
        data={productsQuery.data?.data || []}
        loading={productsQuery.isLoading}
        error={productsQuery.error?.message}
        onRetry={() => void productsQuery.refetch()}
        page={page}
        totalPages={productsQuery.data?.meta.totalPages || 1}
        total={productsQuery.data?.meta.total}
        onPageChange={setPage}
        enableRowSelection
        onSelectionChange={setSelected}
        renderMobileCard={(p) => (
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {p.featured_image_url && <img src={p.featured_image_url} alt="" className="w-9 h-9 rounded object-cover shrink-0" />}
                <div className="min-w-0">
                  <p className="font-medium truncate">{p.name}</p>
                  <p className="text-[11px] font-mono text-primary">{p.sku}</p>
                </div>
              </div>
              <span className="font-bold tabular-nums shrink-0">{formatMoney(p.sale_price ?? p.regular_price)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <StatusBadge status={p.status} />
                <span className="text-[11px] text-muted-foreground">Stock: {p.available_stock}</span>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" className="h-8 px-2.5 text-xs" onClick={() => setEditId(p.id)}>Edit</Button>
                <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={() => duplicateMut.mutate(p.id)}>Copy</Button>
              </div>
            </div>
          </div>
        )}
      />

      <ConfirmDialog
        open={Boolean(archiveId)}
        onOpenChange={(o) => !o && setArchiveId(null)}
        title="Archive Product"
        description="This will hide the product from the public storefront while preserving order history snapshots."
        confirmLabel="Archive"
        onConfirm={() => {
          if (archiveId) archiveMut.mutate(archiveId);
        }}
      />
    </div>
  );
}

const productFormSchema = z.object({
  name: z.string().min(2),
  sku: z.string().min(2),
  slug: z.string().optional(),
  barcode: z.string().optional(),
  shortDescription: z.string().optional(),
  fullDescription: z.string().optional(),
  regularPrice: z.coerce.number().min(0),
  salePrice: z.string().optional(),
  costPrice: z.coerce.number().min(0).default(0),
  stockQuantity: z.coerce.number().int().min(0).default(0),
  lowStockThreshold: z.coerce.number().int().min(0).default(10),
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
  originCountryId: z.string().optional(),
  storageType: z.enum(["dry", "cool", "frozen"]).default("dry"),
  halalTier: z.enum(["certified", "supplier", "nopork", "not_halal"]).default("certified"),
  status: z.enum(["draft", "active", "inactive", "archived"]).default("active"),
  featuredImageUrl: z.string().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
});

export function ProductFormPage({ productId, onDone }: { productId?: string; onDone: () => void }) {
  const qc = useQueryClient();
  const categoriesQ = useQuery({
    queryKey: ["admin-categories"],
    queryFn: () => apiRequest<{ data: Array<{ id: string; name: string }> }>("/api/v1/admin/catalog/categories"),
  });
  const brandsQ = useQuery({
    queryKey: ["admin-brands"],
    queryFn: () => apiRequest<{ data: Array<{ id: string; name: string }> }>("/api/v1/admin/catalog/brands"),
  });
  const countriesQ = useQuery({
    queryKey: ["admin-countries"],
    queryFn: () => apiRequest<{ data: Array<{ id: string; name: string }> }>("/api/v1/admin/catalog/countries"),
  });

  const existingQ = useQuery({
    queryKey: ["admin-product-detail", productId],
    queryFn: () => apiRequest<{ data: Record<string, unknown> }>(`/api/v1/admin/catalog/products/${productId}`),
    enabled: Boolean(productId),
  });

  const form = useForm<z.infer<typeof productFormSchema>>({
    resolver: zodResolver(productFormSchema) as never,
    values: existingQ.data?.data
      ? {
          name: String(existingQ.data.data.name || ""),
          sku: String(existingQ.data.data.sku || ""),
          slug: String(existingQ.data.data.slug || ""),
          barcode: String(existingQ.data.data.barcode || ""),
          shortDescription: String(existingQ.data.data.short_description || ""),
          fullDescription: String(existingQ.data.data.full_description || ""),
          regularPrice: Number(existingQ.data.data.regular_price || 0),
          salePrice: existingQ.data.data.sale_price ? String(existingQ.data.data.sale_price) : "",
          costPrice: Number(existingQ.data.data.cost_price || 0),
          stockQuantity: Number((existingQ.data.data.variants as Array<{ physical_qty?: number }>)?.[0]?.physical_qty || 0),
          lowStockThreshold: 10,
          categoryId: String(existingQ.data.data.category_id || ""),
          brandId: String(existingQ.data.data.brand_id || ""),
          originCountryId: String(existingQ.data.data.origin_country_id || ""),
          storageType: (existingQ.data.data.storage_type as "dry" | "cool" | "frozen") || "dry",
          halalTier: (existingQ.data.data.halal_tier as "certified" | "supplier" | "nopork" | "not_halal") || "certified",
          status: (existingQ.data.data.status as "draft" | "active" | "inactive" | "archived") || "active",
          featuredImageUrl: String(existingQ.data.data.featured_image_url || ""),
          seoTitle: String(existingQ.data.data.seo_title || ""),
          seoDescription: String(existingQ.data.data.seo_description || ""),
        }
      : {
          name: "",
          sku: "",
          regularPrice: 0,
          costPrice: 0,
          stockQuantity: 20,
          lowStockThreshold: 10,
          storageType: "dry",
          halalTier: "certified",
          status: "active",
        },
  });

  const saveMut = useMutation({
    mutationFn: (vals: z.infer<typeof productFormSchema>) => {
      const payload = {
        ...vals,
        salePrice: vals.salePrice ? Number(vals.salePrice) : null,
        categoryId: vals.categoryId || null,
        brandId: vals.brandId || null,
        originCountryId: vals.originCountryId || null,
        featuredImageUrl: vals.featuredImageUrl || null,
      };
      return productId
        ? apiRequest(`/api/v1/admin/catalog/products/${productId}`, { method: "PATCH", body: JSON.stringify(payload) })
        : apiRequest("/api/v1/admin/catalog/products", { method: "POST", body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      if (!productId) localStorage.removeItem("beticrom_product_draft");
      toast.success(productId ? "Product updated" : "Product created");
      void qc.invalidateQueries({ queryKey: ["admin-products"] });
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Auto-save draft for new product creation
  const watchedValues = form.watch();
  React.useEffect(() => {
    if (!productId && watchedValues.name) {
      localStorage.setItem("beticrom_product_draft", JSON.stringify(watchedValues));
    }
  }, [productId, watchedValues]);

  const handleImageDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", "products");
    try {
      const res = await apiRequest<{ data: { url: string } }>("/api/v1/media/upload", { method: "POST", body: fd });
      form.setValue("featuredImageUrl", res.data.url);
      toast.success("Product image uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    }
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <PageHeader
        title={productId ? "Edit Product" : "Add New Product"}
        description={!productId ? "Changes auto-save locally as a draft until published." : undefined}
        actions={
          <div className="flex gap-2">
            {!productId && localStorage.getItem("beticrom_product_draft") && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => {
                  const raw = localStorage.getItem("beticrom_product_draft");
                  if (raw) {
                    form.reset(JSON.parse(raw));
                    toast.info("Restored unsaved draft");
                  }
                }}
              >
                Restore Draft
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onDone} className="h-8 text-xs">
              Back to Products
            </Button>
          </div>
        }
      />

      <form onSubmit={form.handleSubmit((v) => saveMut.mutate(v))} className="space-y-4">
        <div className="bg-card border border-border rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="md:col-span-2 font-semibold text-sm">Basic Information</div>
          <div>
            <Label className="text-xs">Product Name *</Label>
            <Input {...form.register("name")} className="h-8 text-xs mt-1" />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">SKU *</Label>
              <button
                type="button"
                onClick={() => form.setValue("sku", `BTC-${String(Date.now()).slice(-6)}`)}
                className="text-[10px] text-primary hover:underline cursor-pointer"
              >
                Generate SKU
              </button>
            </div>
            <Input {...form.register("sku")} className="h-8 text-xs mt-1 font-mono" />
          </div>
          <div>
            <Label className="text-xs">Slug (auto if blank)</Label>
            <Input {...form.register("slug")} className="h-8 text-xs mt-1 font-mono" />
          </div>
          <div>
            <Label className="text-xs">Barcode</Label>
            <Input {...form.register("barcode")} className="h-8 text-xs mt-1 font-mono" />
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs">Short Description</Label>
            <Input {...form.register("shortDescription")} className="h-8 text-xs mt-1" />
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs">Full Description</Label>
            <Textarea {...form.register("fullDescription")} rows={3} className="text-xs mt-1" />
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="sm:col-span-3 font-semibold text-sm">Pricing, Stock & Classification</div>
          <div>
            <Label className="text-xs">Regular Price (¥) *</Label>
            <Input type="number" {...form.register("regularPrice")} className="h-8 text-xs mt-1" />
          </div>
          <div>
            <Label className="text-xs">Sale Price (¥)</Label>
            <Input type="number" {...form.register("salePrice")} className="h-8 text-xs mt-1" />
          </div>
          <div>
            <Label className="text-xs">Cost Price (¥)</Label>
            <Input type="number" {...form.register("costPrice")} className="h-8 text-xs mt-1" />
          </div>
          <div>
            <Label className="text-xs">Stock Quantity</Label>
            <Input type="number" {...form.register("stockQuantity")} className="h-8 text-xs mt-1" />
          </div>
          <div>
            <Label className="text-xs">Category</Label>
            <select {...form.register("categoryId")} className="w-full h-8 rounded-md border border-border bg-background px-2 text-xs mt-1">
              <option value="">Select category</option>
              {(categoriesQ.data?.data || []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs">Brand</Label>
            <select {...form.register("brandId")} className="w-full h-8 rounded-md border border-border bg-background px-2 text-xs mt-1">
              <option value="">Select brand</option>
              {(brandsQ.data?.data || []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs">Country of Origin</Label>
            <select {...form.register("originCountryId")} className="w-full h-8 rounded-md border border-border bg-background px-2 text-xs mt-1">
              <option value="">Select country</option>
              {(countriesQ.data?.data || []).map((co) => (
                <option key={co.id} value={co.id}>
                  {co.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs">Storage Tier</Label>
            <select {...form.register("storageType")} className="w-full h-8 rounded-md border border-border bg-background px-2 text-xs mt-1">
              <option value="dry">Dry</option>
              <option value="cool">Cool</option>
              <option value="frozen">Frozen</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Halal Tier</Label>
            <select {...form.register("halalTier")} className="w-full h-8 rounded-md border border-border bg-background px-2 text-xs mt-1">
              <option value="certified">Certified Halal</option>
              <option value="supplier">Supplier Declared</option>
              <option value="nopork">No Pork / Alcohol</option>
              <option value="not_halal">Non-Halal</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Status</Label>
            <select {...form.register("status")} className="w-full h-8 rounded-md border border-border bg-background px-2 text-xs mt-1">
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Featured Image URL (or drag & drop image below)</Label>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleImageDrop}
              className="mt-1 p-2 rounded-md border border-dashed border-border bg-muted/20 space-y-1.5"
            >
              <Input {...form.register("featuredImageUrl")} placeholder="https://... or drop an image file here" className="h-8 text-xs" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4 grid grid-cols-1 gap-3 text-xs">
          <div className="font-semibold text-sm">SEO Metadata</div>
          <div>
            <Label className="text-xs">Meta Title</Label>
            <Input {...form.register("seoTitle")} className="h-8 text-xs mt-1" />
          </div>
          <div>
            <Label className="text-xs">Meta Description</Label>
            <Textarea {...form.register("seoDescription")} rows={2} className="text-xs mt-1" />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onDone} className="h-8 text-xs">
            Cancel
          </Button>
          <Button type="submit" disabled={saveMut.isPending} className="h-8 text-xs">
            {saveMut.isPending ? "Saving..." : productId ? "Save Changes" : "Create Product"}
          </Button>
        </div>
      </form>
    </div>
  );
}

// ─── Taxonomy Pages (Categories, Subcategories, Brands, Countries, Attributes, Variants) ─
export function TaxonomyPage({ kind }: { kind: "categories" | "subcategories" | "brands" | "countries" | "attributes" | "variants" }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [extra, setExtra] = useState("");
  const [parentId, setParentId] = useState("");
  const [reassignModal, setReassignModal] = useState<{ id: string; name: string; count: number } | null>(null);
  const [reassignTo, setReassignTo] = useState("");

  const endpoint =
    kind === "subcategories"
      ? "/api/v1/admin/catalog/categories"
      : `/api/v1/admin/catalog/${kind}`;

  const q = useQuery({
    queryKey: ["admin-taxonomy", kind],
    queryFn: () => apiRequest<{ data: Array<Record<string, unknown>> }>(endpoint),
  });

  const rows =
    kind === "subcategories"
      ? (q.data?.data || []).filter((r) => Boolean(r.parent_id))
      : kind === "categories"
        ? (q.data?.data || []).filter((r) => !r.parent_id)
        : q.data?.data || [];

  const createMut = useMutation({
    mutationFn: () => {
      if (kind === "categories" || kind === "subcategories") {
        return apiRequest("/api/v1/admin/catalog/categories", {
          method: "POST",
          body: JSON.stringify({ name, parentId: kind === "subcategories" ? parentId || null : null }),
        });
      }
      if (kind === "brands") {
        return apiRequest("/api/v1/admin/catalog/brands", { method: "POST", body: JSON.stringify({ name }) });
      }
      if (kind === "countries") {
        return apiRequest("/api/v1/admin/catalog/countries", {
          method: "POST",
          body: JSON.stringify({ name, code: extra || name.slice(0, 2) }),
        });
      }
      return apiRequest("/api/v1/admin/catalog/attributes", {
        method: "POST",
        body: JSON.stringify({ name, values: extra.split(",").map((s) => s.trim()).filter(Boolean) }),
      });
    },
    onSuccess: () => {
      toast.success("Created successfully");
      setName("");
      setExtra("");
      void qc.invalidateQueries({ queryKey: ["admin-taxonomy"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteCategory = async (id: string, targetId?: string) => {
    try {
      await apiRequest(`/api/v1/admin/catalog/categories/${id}${targetId ? `?reassignToId=${targetId}` : ""}`, {
        method: "DELETE",
      });
      toast.success("Category removed");
      setReassignModal(null);
      void qc.invalidateQueries({ queryKey: ["admin-taxonomy"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader title={kind.charAt(0).toUpperCase() + kind.slice(1)} />

      {kind !== "variants" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMut.mutate();
          }}
          className="bg-card border border-border rounded-lg p-3 flex flex-wrap items-end gap-2"
        >
          {kind === "subcategories" && (
            <div>
              <Label className="text-[11px]">Parent Category</Label>
              <select
                required
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="h-8 rounded-md border border-border bg-background px-2 text-xs block mt-1"
              >
                <option value="">Select parent</option>
                {(q.data?.data || [])
                  .filter((c) => !c.parent_id)
                  .map((c) => (
                    <option key={String(c.id)} value={String(c.id)}>
                      {String(c.name)}
                    </option>
                  ))}
              </select>
            </div>
          )}
          <div>
            <Label className="text-[11px]">Name</Label>
            <Input required value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-xs w-52 mt-1" />
          </div>
          {(kind === "countries" || kind === "attributes") && (
            <div>
              <Label className="text-[11px]">{kind === "countries" ? "ISO Code" : "Values (comma-separated)"}</Label>
              <Input value={extra} onChange={(e) => setExtra(e.target.value)} className="h-8 text-xs w-56 mt-1" />
            </div>
          )}
          <Button type="submit" size="sm" className="h-8 text-xs gap-1">
            <Plus size={13} /> Add
          </Button>
        </form>
      )}

      <div className="bg-card border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/50 border-b border-border text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-2">Name / SKU</th>
              <th className="text-left px-3 py-2">Details</th>
              <th className="text-right px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={String(r.id)} className="hover:bg-muted/30">
                <td className="px-3 py-2 font-medium">{String(r.name || r.sku || r.product_name)}</td>
                <td className="px-3 py-2 text-muted-foreground">
                  {kind === "categories" || kind === "subcategories"
                    ? `${Number(r.product_count || 0)} products${r.parent_name ? ` · Parent: ${r.parent_name}` : ""}`
                    : kind === "variants"
                      ? `${String(r.product_name)} · Available: ${String(r.available_qty)}`
                      : String(r.slug || r.code || "")}
                </td>
                <td className="px-3 py-2 text-right">
                  {(kind === "categories" || kind === "subcategories") && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-red-600"
                      onClick={() => {
                        const cnt = Number(r.product_count || 0);
                        if (cnt > 0) {
                          setReassignModal({ id: String(r.id), name: String(r.name), count: cnt });
                        } else {
                          void deleteCategory(String(r.id));
                        }
                      }}
                    >
                      <Trash2 size={13} />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Safe Category Reassignment Dialog */}
      <Dialog open={Boolean(reassignModal)} onOpenChange={(o) => !o && setReassignModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Safe Category Reassignment Required</DialogTitle>
          </DialogHeader>
          {reassignModal && (
            <div className="space-y-3 text-xs">
              <p className="text-muted-foreground">
                <strong>{reassignModal.name}</strong> is referenced by <strong>{reassignModal.count}</strong> products. Select a
                replacement category before deleting:
              </p>
              <select
                value={reassignTo}
                onChange={(e) => setReassignTo(e.target.value)}
                className="w-full h-8 rounded-md border border-border bg-background px-2 text-xs"
              >
                <option value="">Select replacement category...</option>
                {(q.data?.data || [])
                  .filter((c) => c.id !== reassignModal.id)
                  .map((c) => (
                    <option key={String(c.id)} value={String(c.id)}>
                      {String(c.name)}
                    </option>
                  ))}
              </select>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setReassignModal(null)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={!reassignTo}
                  onClick={() => void deleteCategory(reassignModal.id, reassignTo)}
                >
                  Reassign & Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Product Import & Export ──────────────────────────────────────────────────
export function ProductImportExportPage({ mode }: { mode: "import" | "export" }) {
  const qc = useQueryClient();
  const [parsedRows, setParsedRows] = useState<Array<Record<string, unknown>>>([]);
  const [filename, setFilename] = useState("");
  const [duplicatePolicy, setDuplicatePolicy] = useState<"skip" | "update">("skip");

  const jobsQ = useQuery({
    queryKey: ["admin-import-jobs"],
    queryFn: () => apiRequest<{ data: Array<Record<string, unknown>> }>("/api/v1/admin/catalog/products-import/jobs"),
    enabled: mode === "import",
  });

  const runMut = useMutation({
    mutationFn: () =>
      apiRequest<{ data: Record<string, unknown> }>("/api/v1/admin/catalog/products-import/run", {
        method: "POST",
        body: JSON.stringify({
          filename: filename || "import.csv",
          fileFormat: filename.endsWith(".xlsx") ? "xlsx" : "csv",
          duplicatePolicy,
          idempotencyKey: `${filename}-${parsedRows.length}-${duplicatePolicy}`,
          rows: parsedRows,
        }),
      }),
    onSuccess: (res) => {
      toast.success(`Import completed: ${res.data.created_count} created, ${res.data.updated_count} updated`);
      setParsedRows([]);
      void qc.invalidateQueries({ queryKey: ["admin-import-jobs"] });
      void qc.invalidateQueries({ queryKey: ["admin-products"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (mode === "export") {
    return (
      <div className="space-y-4">
        <PageHeader title="Product Export" description="Export filtered catalog data to CSV or XLSX." />
        <div className="bg-card border border-border rounded-lg p-5 flex flex-wrap gap-3">
          <Button
            size="sm"
            onClick={() => window.open("/api/v1/admin/catalog/products-export?format=csv", "_blank")}
            className="gap-1.5 text-xs"
          >
            <Download size={14} /> Export All Products (CSV)
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open("/api/v1/admin/catalog/products-export?format=xlsx", "_blank")}
            className="gap-1.5 text-xs"
          >
            <Download size={14} /> Export All Products (XLSX)
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Product Import (CSV / XLSX)"
        actions={
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1.5"
            onClick={() => window.open("/api/v1/admin/catalog/products-import/template", "_blank")}
          >
            <Download size={13} /> Download Sample Template
          </Button>
        }
      />

      <div className="bg-card border border-border rounded-lg p-4 space-y-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            type="file"
            accept=".csv,.xlsx,.xls"
            className="h-9 text-xs max-w-xs"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setFilename(file.name);
              const buf = await file.arrayBuffer();
              const wb = XLSX.read(buf);
              const ws = wb.Sheets[wb.SheetNames[0]];
              const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
              setParsedRows(rows);
              toast.info(`Parsed ${rows.length} rows for preview`);
            }}
          />
          <select
            value={duplicatePolicy}
            onChange={(e) => setDuplicatePolicy(e.target.value as "skip" | "update")}
            className="h-9 rounded-md border border-border bg-background px-2 text-xs"
          >
            <option value="skip">Duplicate SKU: Skip</option>
            <option value="update">Duplicate SKU: Update</option>
          </select>
          <Button
            size="sm"
            disabled={parsedRows.length === 0 || runMut.isPending}
            onClick={() => runMut.mutate()}
            className="h-9 text-xs gap-1.5"
          >
            <Upload size={13} /> {runMut.isPending ? "Importing..." : `Run Import (${parsedRows.length} rows)`}
          </Button>
        </div>

        {parsedRows.length > 0 && (
          <div className="border border-border rounded overflow-x-auto max-h-56">
            <table className="w-full text-[11px]">
              <thead className="bg-muted/60 border-b border-border">
                <tr>
                  <th className="text-left px-2 py-1.5">SKU</th>
                  <th className="text-left px-2 py-1.5">Name</th>
                  <th className="text-left px-2 py-1.5">Regular Price</th>
                  <th className="text-left px-2 py-1.5">Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {parsedRows.slice(0, 10).map((r, i) => (
                  <tr key={i}>
                    <td className="px-2 py-1 font-mono">{String(r.sku || "")}</td>
                    <td className="px-2 py-1">{String(r.name || "")}</td>
                    <td className="px-2 py-1">{String(r.regular_price || "")}</td>
                    <td className="px-2 py-1">{String(r.stock_quantity || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border text-xs font-semibold">Import History</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">File</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-right px-3 py-2">Created / Updated / Skipped / Errors</th>
                <th className="text-right px-3 py-2">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(jobsQ.data?.data || []).map((j) => (
                <tr key={String(j.id)}>
                  <td className="px-3 py-2 font-medium">{String(j.filename)}</td>
                  <td className="px-3 py-2"><StatusBadge status={String(j.status)} /></td>
                  <td className="px-3 py-2 text-right font-mono">
                    {String(j.created_count)} / {String(j.updated_count)} / {String(j.skipped_count)} / {String(j.error_count)}
                  </td>
                  <td className="px-3 py-2 text-right text-muted-foreground">
                    {new Date(String(j.created_at)).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
