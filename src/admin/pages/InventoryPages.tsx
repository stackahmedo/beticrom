import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Sliders, CalendarClock, ArrowLeftRight, Barcode } from "lucide-react";
import { toast } from "sonner";
import { apiRequest } from "../api/client";
import { DataTable } from "../components/DataTable";
import { KpiCard, PageHeader, StatusBadge, formatMoney } from "../components/AdminPrimitives";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";

interface StockRow {
  id: string;
  variant_id: string;
  warehouse_id: string;
  sku: string;
  barcode: string | null;
  product_name: string;
  variant_title: string;
  warehouse_name: string;
  physical_qty: number;
  reserved_qty: number;
  available_qty: number;
  incoming_qty: number;
  damaged_qty: number;
  low_stock_threshold: number;
  stock_valuation: number;
  nearest_expiry_date: string | null;
}

export function StockManagementPage({ initialFilter = "all" }: { initialFilter?: "all" | "low" | "out" | "expiring" }) {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "low" | "out" | "expiring">(initialFilter);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [adjustItem, setAdjustItem] = useState<StockRow | null>(null);
  const [adjType, setAdjType] = useState("add");
  const [adjQty, setAdjQty] = useState("10");
  const [adjReason, setAdjReason] = useState("");

  const [batchItem, setBatchItem] = useState<StockRow | null>(null);
  const [batchNo, setBatchNo] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [batchQty, setBatchQty] = useState("20");

  const [transferItem, setTransferItem] = useState<StockRow | null>(null);
  const [toWarehouseId, setToWarehouseId] = useState("");
  const [transferQty, setTransferQty] = useState("5");

  const valQ = useQuery({
    queryKey: ["admin-inventory-valuation"],
    queryFn: () =>
      apiRequest<{
        data: {
          total_skus: number;
          total_available_units: number;
          total_reserved_units: number;
          total_incoming_units: number;
          total_valuation: number;
          expiring_batches_count: number;
        };
      }>("/api/v1/admin/inventory/valuation"),
  });

  const warehousesQ = useQuery({
    queryKey: ["admin-warehouses-list"],
    queryFn: () => apiRequest<{ data: Array<{ id: string; name: string }> }>("/api/v1/admin/inventory/warehouses"),
  });

  const stockQ = useQuery({
    queryKey: ["admin-stock", filter, page, search],
    queryFn: () =>
      apiRequest<{ data: StockRow[]; meta: { page: number; totalPages: number; total: number } }>(
        `/api/v1/admin/inventory/stock?filter=${filter}&page=${page}&limit=25&search=${encodeURIComponent(search)}`
      ),
  });

  const adjustMut = useMutation({
    mutationFn: () =>
      apiRequest("/api/v1/admin/inventory/adjust", {
        method: "POST",
        body: JSON.stringify({
          inventoryItemId: adjustItem?.id,
          adjustmentType: adjType,
          quantity: Number(adjQty),
          reason: adjReason,
        }),
      }),
    onSuccess: () => {
      toast.success("Inventory adjusted and movement logged");
      setAdjustItem(null);
      setAdjReason("");
      void qc.invalidateQueries({ queryKey: ["admin-stock"] });
      void qc.invalidateQueries({ queryKey: ["admin-inventory-valuation"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const batchMut = useMutation({
    mutationFn: () =>
      apiRequest("/api/v1/admin/inventory/batches", {
        method: "POST",
        body: JSON.stringify({
          variantId: batchItem?.variant_id,
          warehouseId: batchItem?.warehouse_id,
          batchNumber: batchNo,
          expiryDate: expiryDate || null,
          quantity: Number(batchQty),
        }),
      }),
    onSuccess: () => {
      toast.success("Batch & expiry recorded (FEFO tracked)");
      setBatchItem(null);
      setBatchNo("");
      setExpiryDate("");
      void qc.invalidateQueries({ queryKey: ["admin-stock"] });
      void qc.invalidateQueries({ queryKey: ["admin-inventory-valuation"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const transferMut = useMutation({
    mutationFn: () =>
      apiRequest("/api/v1/admin/inventory/transfers", {
        method: "POST",
        body: JSON.stringify({
          variantId: transferItem?.variant_id,
          fromWarehouseId: transferItem?.warehouse_id,
          toWarehouseId,
          quantity: Number(transferQty),
        }),
      }),
    onSuccess: () => {
      toast.success("Stock transferred between warehouses");
      setTransferItem(null);
      void qc.invalidateQueries({ queryKey: ["admin-stock"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const columns: ColumnDef<StockRow, unknown>[] = [
    {
      accessorKey: "sku",
      header: "SKU",
      cell: ({ row }) => (
        <div>
          <span className="font-mono font-semibold text-primary">{row.original.sku}</span>
          {row.original.barcode && <span className="block text-[10px] font-mono text-muted-foreground">{row.original.barcode}</span>}
        </div>
      ),
    },
    { accessorKey: "product_name", header: "Product", cell: ({ row }) => <span className="max-w-[200px] truncate block">{row.original.product_name}</span> },
    { accessorKey: "warehouse_name", header: "Warehouse" },
    {
      accessorKey: "available_qty",
      header: "Avail / Res / Inc",
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          <strong className={row.original.available_qty <= 0 ? "text-red-600" : row.original.available_qty <= row.original.low_stock_threshold ? "text-amber-600" : "text-emerald-600"}>
            {row.original.available_qty}
          </strong>
          {" / "}
          {row.original.reserved_qty}
          {" / "}
          {row.original.incoming_qty}
        </span>
      ),
    },
    {
      accessorKey: "nearest_expiry_date",
      header: "FEFO Expiry",
      cell: ({ row }) =>
        row.original.nearest_expiry_date ? (
          <span className="text-[11px] font-mono">{String(row.original.nearest_expiry_date).slice(0, 10)}</span>
        ) : (
          <span className="text-[11px] text-muted-foreground">—</span>
        ),
    },
    {
      accessorKey: "stock_valuation",
      header: "Valuation",
      cell: ({ row }) => <span className="tabular-nums">{formatMoney(row.original.stock_valuation)}</span>,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1" onClick={() => setAdjustItem(row.original)}>
            <Sliders size={11} /> Adj
          </Button>
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setBatchItem(row.original)} title="Add Batch / Expiry">
            <CalendarClock size={12} />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setTransferItem(row.original)} title="Transfer Warehouse">
            <ArrowLeftRight size={12} />
          </Button>
        </div>
      ),
    },
  ];

  const v = valQ.data?.data;

  return (
    <div className="space-y-4">
      <PageHeader title="Inventory & Expiry (FEFO)" description="Track available/reserved/incoming stock, food lot expiries, warehouse transfers, and inventory cost valuation." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Inventory Valuation" value={formatMoney(v?.total_valuation)} subtext={`${v?.total_skus ?? 0} SKUs`} />
        <KpiCard label="Available Units" value={(v?.total_available_units ?? 0).toLocaleString()} tone="success" />
        <KpiCard label="Reserved / Incoming" value={`${v?.total_reserved_units ?? 0} / ${v?.total_incoming_units ?? 0}`} />
        <KpiCard label="Expiring Batches (≤30d)" value={v?.expiring_batches_count ?? 0} tone={(v?.expiring_batches_count ?? 0) > 0 ? "warning" : "default"} />
      </div>

      {/* Filter Pills + Barcode/SKU Scan */}
      <div className="bg-card border border-border rounded-lg p-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: "all", label: "All Stock" },
            { id: "low", label: "Low Stock" },
            { id: "out", label: "Out of Stock" },
            { id: "expiring", label: "Expiring Soon (≤30d)" },
          ].map((f) => (
            <Button
              key={f.id}
              size="sm"
              variant={filter === f.id ? "default" : "outline"}
              className="h-8 text-xs"
              onClick={() => { setFilter(f.id as typeof filter); setPage(1); }}
            >
              {f.label}
            </Button>
          ))}
        </div>

        <div className="relative">
          <Barcode size={14} className="absolute left-2.5 top-2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Scan barcode, SKU, or product..."
            className="h-8 text-xs pl-8 w-60"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={stockQ.data?.data || []}
        loading={stockQ.isLoading}
        error={stockQ.error?.message}
        onRetry={() => void stockQ.refetch()}
        page={page}
        totalPages={stockQ.data?.meta.totalPages || 1}
        total={stockQ.data?.meta.total}
        onPageChange={setPage}
        renderMobileCard={(s) => (
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-mono font-semibold text-primary">{s.sku}</span>
              <span className="font-bold">{s.available_qty} avail</span>
            </div>
            <p className="font-medium truncate">{s.product_name}</p>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>{s.warehouse_name} · Val: {formatMoney(s.stock_valuation)}</span>
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setAdjustItem(s)}>Adjust</Button>
            </div>
          </div>
        )}
      />

      {/* Stock Adjustment Dialog */}
      <Dialog open={Boolean(adjustItem)} onOpenChange={(o) => !o && setAdjustItem(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="text-sm">Adjust Stock: {adjustItem?.sku}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); adjustMut.mutate(); }} className="space-y-3 text-xs">
            <div>
              <Label className="text-xs">Action</Label>
              <select value={adjType} onChange={(e) => setAdjType(e.target.value)} className="w-full h-8 rounded-md border border-border bg-background px-2 text-xs mt-1">
                <option value="add">Add Physical Stock</option>
                <option value="subtract">Subtract Physical Stock</option>
                <option value="set_physical">Set Exact Physical Qty</option>
                <option value="mark_damaged">Mark Damaged / Expired</option>
                <option value="set_threshold">Set Reorder Threshold</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Quantity</Label>
              <Input type="number" min={0} required value={adjQty} onChange={(e) => setAdjQty(e.target.value)} className="h-8 text-xs mt-1" />
            </div>
            <div>
              <Label className="text-xs">Audit Reason *</Label>
              <Input required minLength={3} value={adjReason} onChange={(e) => setAdjReason(e.target.value)} placeholder="e.g. Cycle count / Spoilage" className="h-8 text-xs mt-1" />
            </div>
            <Button type="submit" disabled={adjustMut.isPending} className="w-full h-8 text-xs">Save Adjustment</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Batch & Expiry Dialog */}
      <Dialog open={Boolean(batchItem)} onOpenChange={(o) => !o && setBatchItem(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="text-sm">Add Batch & Expiry: {batchItem?.sku}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); batchMut.mutate(); }} className="space-y-3 text-xs">
            <div>
              <Label className="text-xs">Batch / Lot Number *</Label>
              <Input required value={batchNo} onChange={(e) => setBatchNo(e.target.value)} placeholder="LOT-2026-11A" className="h-8 text-xs mt-1 font-mono" />
            </div>
            <div>
              <Label className="text-xs">Expiry Date (FEFO)</Label>
              <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="h-8 text-xs mt-1" />
            </div>
            <div>
              <Label className="text-xs">Quantity Received</Label>
              <Input type="number" min={1} required value={batchQty} onChange={(e) => setBatchQty(e.target.value)} className="h-8 text-xs mt-1" />
            </div>
            <Button type="submit" disabled={batchMut.isPending} className="w-full h-8 text-xs">Record Batch</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Warehouse Transfer Dialog */}
      <Dialog open={Boolean(transferItem)} onOpenChange={(o) => !o && setTransferItem(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="text-sm">Transfer Stock: {transferItem?.sku}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); transferMut.mutate(); }} className="space-y-3 text-xs">
            <div>
              <Label className="text-xs">Destination Warehouse</Label>
              <select required value={toWarehouseId} onChange={(e) => setToWarehouseId(e.target.value)} className="w-full h-8 rounded-md border border-border bg-background px-2 text-xs mt-1">
                <option value="">Select warehouse...</option>
                {(warehousesQ.data?.data || [])
                  .filter((w) => w.id !== transferItem?.warehouse_id)
                  .map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Quantity (Max {transferItem?.available_qty})</Label>
              <Input type="number" min={1} max={transferItem?.available_qty || 1} required value={transferQty} onChange={(e) => setTransferQty(e.target.value)} className="h-8 text-xs mt-1" />
            </div>
            <Button type="submit" disabled={transferMut.isPending} className="w-full h-8 text-xs">Execute Transfer</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function StockMovementsPage() {
  const [page, setPage] = useState(1);
  const q = useQuery({
    queryKey: ["admin-stock-movements", page],
    queryFn: () =>
      apiRequest<{ data: Array<Record<string, unknown>>; meta: { page: number; totalPages: number; total: number } }>(
        `/api/v1/admin/inventory/movements?page=${page}&limit=25`
      ),
  });

  const cols: ColumnDef<Record<string, unknown>, unknown>[] = [
    { accessorKey: "sku", header: "SKU", cell: ({ row }) => <span className="font-mono">{String(row.original.sku)}</span> },
    { accessorKey: "product_name", header: "Product" },
    { accessorKey: "movement_type", header: "Type", cell: ({ row }) => <StatusBadge status={String(row.original.movement_type)} /> },
    { accessorKey: "qty_delta", header: "Delta", cell: ({ row }) => <span className="font-mono font-bold">{String(row.original.qty_delta)}</span> },
    { accessorKey: "available_after", header: "Available After" },
    { accessorKey: "reason", header: "Reason" },
    { accessorKey: "created_at", header: "Timestamp", cell: ({ row }) => new Date(String(row.original.created_at)).toLocaleString() },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Movements & Transfers" description="Immutable ledger of reservations, deductions, warehouse transfers, and adjustments." />
      <DataTable columns={cols} data={q.data?.data || []} loading={q.isLoading} page={page} totalPages={q.data?.meta.totalPages || 1} total={q.data?.meta.total} onPageChange={setPage} />
    </div>
  );
}

export function WarehousesSuppliersPage({ mode }: { mode: "warehouses" | "suppliers" | "purchase-orders" }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  const q = useQuery({
    queryKey: ["admin-inv-entity", mode],
    queryFn: () => apiRequest<{ data: Array<Record<string, unknown>> }>(`/api/v1/admin/inventory/${mode}`),
  });

  const createMut = useMutation({
    mutationFn: () =>
      apiRequest(`/api/v1/admin/inventory/${mode}`, { method: "POST", body: JSON.stringify({ code, name }) }),
    onSuccess: () => {
      toast.success("Saved");
      setName("");
      setCode("");
      void qc.invalidateQueries({ queryKey: ["admin-inv-entity", mode] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const receivePo = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/v1/admin/inventory/purchase-orders/${id}/receive`, { method: "POST" }),
    onSuccess: () => {
      toast.success("Purchase order received into inventory");
      void qc.invalidateQueries({ queryKey: ["admin-inv-entity", mode] });
    },
  });

  return (
    <div className="space-y-4">
      <PageHeader title={mode === "purchase-orders" ? "Purchase Orders" : mode.charAt(0).toUpperCase() + mode.slice(1)} />
      {mode !== "purchase-orders" && (
        <form onSubmit={(e) => { e.preventDefault(); createMut.mutate(); }} className="bg-card border border-border rounded-lg p-3 flex flex-wrap items-end gap-2">
          <div>
            <Label className="text-[11px]">Code</Label>
            <Input required value={code} onChange={(e) => setCode(e.target.value)} className="h-8 text-xs w-36 mt-1" />
          </div>
          <div>
            <Label className="text-[11px]">Name</Label>
            <Input required value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-xs w-60 mt-1" />
          </div>
          <Button type="submit" size="sm" className="h-8 text-xs gap-1"><Plus size={13} /> Add</Button>
        </form>
      )}
      <div className="bg-card border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/50 border-b border-border text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-2">Code / PO#</th>
              <th className="text-left px-3 py-2">Name / Supplier</th>
              <th className="text-left px-3 py-2">Status / Details</th>
              <th className="text-right px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(q.data?.data || []).map((r) => (
              <tr key={String(r.id)} className="h-11">
                <td className="px-3 py-2 font-mono font-semibold">{String(r.code || r.po_number)}</td>
                <td className="px-3 py-2">{String(r.name || r.supplier_name)}</td>
                <td className="px-3 py-2">
                  {mode === "purchase-orders" ? (
                    <span className="flex items-center gap-2">
                      <StatusBadge status={String(r.status)} />
                      <span>{formatMoney(r.total_amount as number)}</span>
                    </span>
                  ) : (
                    String(r.city || r.country || "Active")
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  {mode === "purchase-orders" && r.status !== "received" && (
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => receivePo.mutate(String(r.id))}>Receive Stock</Button>
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
