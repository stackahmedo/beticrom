import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye, Printer, Truck, CreditCard, RotateCcw, CheckCircle2, PackageCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { apiRequest } from "../api/client";
import { DataTable } from "../components/DataTable";
import { KpiCard, PageHeader, StatusBadge, formatMoney } from "../components/AdminPrimitives";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/app/components/ui/sheet";
import { ORDER_TRANSITIONS, type OrderStatus } from "../../../server/domains/orders/stateMachine";

interface OrderRow {
  id: string;
  order_number: string;
  invoice_number: string;
  customer_name: string;
  customer_email: string;
  items_count: number;
  total_amount: string;
  paid_amount: string;
  payment_method_code: string;
  payment_status: string;
  fulfillment_status: string;
  status: OrderStatus;
  courier_name: string | null;
  tracking_number: string | null;
  created_at: string;
}

const ORDER_TABS = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "confirmed", label: "Confirmed" },
  { id: "processing", label: "Processing" },
  { id: "packed", label: "Packed" },
  { id: "shipped", label: "Shipped" },
  { id: "delivered", label: "Delivered" },
  { id: "cancelled", label: "Cancelled" },
] as const;

export function OrdersPage({ initialStatus = "all" }: { initialStatus?: string }) {
  const qc = useQueryClient();
  const [statusTab, setStatusTab] = useState(initialStatus);
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<OrderRow[]>([]);
  const [drawerOrderId, setDrawerOrderId] = useState<string | null>(null);

  const summaryQ = useQuery({
    queryKey: ["admin-orders-summary"],
    queryFn: () =>
      apiRequest<{ data: { total_orders: number; awaiting_confirmation: number; to_fulfill: number; overdue_pending: number } }>(
        "/api/v1/admin/orders/summary"
      ),
  });

  const q = useQuery({
    queryKey: ["admin-orders", statusTab, paymentFilter, page, search],
    queryFn: () =>
      apiRequest<{ data: OrderRow[]; meta: { page: number; totalPages: number; total: number } }>(
        `/api/v1/admin/orders?status=${statusTab}&paymentStatus=${paymentFilter}&page=${page}&limit=25&search=${encodeURIComponent(search)}`
      ),
  });

  const bulkMut = useMutation({
    mutationFn: (toStatus: "confirmed" | "processing" | "packed" | "cancelled") =>
      apiRequest<{ data: { updatedCount: number } }>("/api/v1/admin/orders/bulk-transition", {
        method: "POST",
        body: JSON.stringify({ ids: selected.map((s) => s.id), toStatus }),
      }),
    onSuccess: (res) => {
      toast.success(`Updated ${res.data.updatedCount} orders`);
      setSelected([]);
      void qc.invalidateQueries({ queryKey: ["admin-orders"] });
      void qc.invalidateQueries({ queryKey: ["admin-orders-summary"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cols: ColumnDef<OrderRow, unknown>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <input type="checkbox" checked={table.getIsAllRowsSelected()} onChange={table.getToggleAllRowsSelectedHandler()} />
      ),
      cell: ({ row }) => (
        <input type="checkbox" checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} />
      ),
    },
    {
      accessorKey: "order_number",
      header: "Order #",
      cell: ({ row }) => (
        <div>
          <span className="font-mono font-semibold text-primary">{row.original.order_number}</span>
          <span className="block text-[10px] text-muted-foreground">{row.original.invoice_number}</span>
        </div>
      ),
    },
    {
      accessorKey: "created_at",
      header: "Date",
      cell: ({ row }) => new Date(row.original.created_at).toLocaleDateString(),
    },
    {
      accessorKey: "customer_name",
      header: "Customer",
      cell: ({ row }) => (
        <div className="max-w-[180px]">
          <p className="font-medium truncate">{row.original.customer_name}</p>
          <p className="text-[10px] text-muted-foreground truncate">{row.original.customer_email}</p>
        </div>
      ),
    },
    { accessorKey: "items_count", header: "Items" },
    {
      accessorKey: "total_amount",
      header: "Total",
      cell: ({ row }) => <span className="font-semibold tabular-nums">{formatMoney(row.original.total_amount)}</span>,
    },
    {
      accessorKey: "payment_status",
      header: "Payment",
      cell: ({ row }) => (
        <div className="space-y-0.5">
          <StatusBadge status={row.original.payment_status} />
          <span className="block text-[10px] uppercase text-muted-foreground">{row.original.payment_method_code}</span>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Fulfillment",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setDrawerOrderId(row.original.id)}>
          <Eye size={12} /> Inspect
        </Button>
      ),
    },
  ];

  const sum = summaryQ.data?.data;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Orders"
        description="Confirm, pack, ship, invoice, and reconcile orders from one unified workspace."
        actions={
          <div className="flex flex-wrap gap-1.5">
            <Button
              size="sm"
              variant={statusTab === "pending" && paymentFilter === "all" ? "default" : "outline"}
              className="h-8 text-xs"
              onClick={() => { setStatusTab("pending"); setPaymentFilter("all"); setPage(1); }}
            >
              Needs Confirmation
            </Button>
            <Button
              size="sm"
              variant={statusTab === "confirmed" ? "default" : "outline"}
              className="h-8 text-xs"
              onClick={() => { setStatusTab("confirmed"); setPaymentFilter("all"); setPage(1); }}
            >
              Ready to Pack
            </Button>
            <Button
              size="sm"
              variant={paymentFilter === "pending" ? "default" : "outline"}
              className="h-8 text-xs"
              onClick={() => { setStatusTab("all"); setPaymentFilter("pending"); setPage(1); }}
            >
              Unpaid Orders
            </Button>
          </div>
        }
      />

      {/* Compact Operational Summary */}
      <div className="grid grid-cols-3 gap-3">
        <KpiCard label="Total Orders" value={sum?.total_orders ?? 0} />
        <KpiCard
          label="Awaiting Confirmation"
          value={sum?.awaiting_confirmation ?? 0}
          tone={(sum?.overdue_pending ?? 0) > 0 ? "warning" : "default"}
          subtext={sum?.overdue_pending ? `${sum.overdue_pending} overdue (>24h)` : undefined}
        />
        <KpiCard label="To Fulfill" value={sum?.to_fulfill ?? 0} tone="success" />
      </div>

      {/* Status Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-border">
        {ORDER_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => { setStatusTab(t.id); setPage(1); }}
            className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors cursor-pointer min-h-[36px] ${
              statusTab === t.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search, Filters & Bulk Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-card border border-border rounded-lg p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search order #, invoice #, customer..."
            className="h-8 text-xs w-60"
          />
          <select
            value={paymentFilter}
            onChange={(e) => { setPaymentFilter(e.target.value); setPage(1); }}
            className="h-8 rounded-md border border-border bg-background px-2 text-xs"
          >
            <option value="all">All Payment Statuses</option>
            <option value="pending">Unpaid / Pending</option>
            <option value="paid">Paid</option>
            <option value="partially_refunded">Partially Refunded</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>

        {selected.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-muted-foreground font-medium">{selected.length} selected:</span>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => bulkMut.mutate("confirmed")}>
              <CheckCircle2 size={12} /> Confirm
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => bulkMut.mutate("packed")}>
              <PackageCheck size={12} /> Pack
            </Button>
            <Button size="sm" variant="destructive" className="h-7 text-xs gap-1" onClick={() => bulkMut.mutate("cancelled")}>
              <XCircle size={12} /> Cancel
            </Button>
          </div>
        )}
      </div>

      <DataTable
        columns={cols}
        data={q.data?.data || []}
        loading={q.isLoading}
        error={q.error?.message}
        onRetry={() => void q.refetch()}
        page={page}
        totalPages={q.data?.meta.totalPages || 1}
        total={q.data?.meta.total}
        onPageChange={setPage}
        enableRowSelection
        onSelectionChange={setSelected}
        renderMobileCard={(o) => (
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-mono font-semibold text-primary">{o.order_number}</span>
              <span className="font-bold tabular-nums">{formatMoney(o.total_amount)}</span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>{o.customer_name} · {o.items_count} items</span>
              <span>{new Date(o.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1.5">
                <StatusBadge status={o.status} />
                <StatusBadge status={o.payment_status} />
              </div>
              <Button size="sm" variant="outline" className="h-9 px-3 text-xs" onClick={() => setDrawerOrderId(o.id)}>
                Inspect
              </Button>
            </div>
          </div>
        )}
      />

      {/* Side Drawer for Quick Order Inspection & Fulfillment */}
      <Sheet open={Boolean(drawerOrderId)} onOpenChange={(o) => !o && setDrawerOrderId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-4 sm:p-6">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-base">Order Operations Drawer</SheetTitle>
          </SheetHeader>
          {drawerOrderId && <OrderDrawerBody orderId={drawerOrderId} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function OrderDrawerBody({ orderId }: { orderId: string }) {
  const qc = useQueryClient();
  const [noteText, setNoteText] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [courierName, setCourierName] = useState("Yamato Transport");
  const [cancelReason, setCancelReason] = useState("");
  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");

  const detailQ = useQuery({
    queryKey: ["admin-order-detail", orderId],
    queryFn: () => apiRequest<{ data: Record<string, unknown> }>(`/api/v1/admin/orders/${orderId}`),
  });

  const transitionMut = useMutation({
    mutationFn: (toStatus: OrderStatus) =>
      apiRequest(`/api/v1/admin/orders/${orderId}/transition`, {
        method: "POST",
        body: JSON.stringify({
          toStatus,
          reason: toStatus === "cancelled" ? cancelReason || "Cancelled by staff" : undefined,
          trackingNumber: trackingNumber || undefined,
          courierName,
        }),
      }),
    onSuccess: () => {
      toast.success("Order status updated");
      void qc.invalidateQueries({ queryKey: ["admin-order-detail", orderId] });
      void qc.invalidateQueries({ queryKey: ["admin-orders"] });
      void qc.invalidateQueries({ queryKey: ["admin-orders-summary"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const noteMut = useMutation({
    mutationFn: () =>
      apiRequest(`/api/v1/admin/orders/${orderId}/notes`, {
        method: "POST",
        body: JSON.stringify({ note: noteText }),
      }),
    onSuccess: () => {
      setNoteText("");
      toast.success("Note added");
      void qc.invalidateQueries({ queryKey: ["admin-order-detail", orderId] });
    },
  });

  const o = detailQ.data?.data;
  if (!o) return <div className="text-xs text-muted-foreground py-8">Loading order details...</div>;

  const currentStatus = o.status as OrderStatus;
  const nextStatuses = ORDER_TRANSITIONS[currentStatus] || [];
  const addr = (o.shipping_address || {}) as Record<string, string>;
  const items = (o.items || []) as Array<Record<string, unknown>>;
  const history = (o.statusHistory || []) as Array<Record<string, unknown>>;
  const notes = (o.notes || []) as Array<Record<string, unknown>>;

  return (
    <div className="space-y-4 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border">
        <div>
          <p className="font-mono text-sm font-bold text-primary">{String(o.order_number)}</p>
          <p className="text-[11px] text-muted-foreground">Invoice {String(o.invoice_number || "")}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button size="sm" variant="outline" onClick={() => window.print()} className="h-8 text-xs gap-1">
            <Printer size={12} /> Invoice
          </Button>
          <Button size="sm" variant="outline" onClick={() => { setPayAmount(String(Number(o.total_amount) - Number(o.paid_amount))); setPayOpen(true); }} className="h-8 text-xs gap-1">
            <CreditCard size={12} /> Pay
          </Button>
          <Button size="sm" variant="outline" onClick={() => { setRefundAmount(String(o.paid_amount)); setRefundOpen(true); }} className="h-8 text-xs gap-1">
            <RotateCcw size={12} /> Refund
          </Button>
        </div>
      </div>

      {/* Independent Statuses */}
      <div className="flex flex-wrap gap-3 p-3 rounded-lg bg-muted/40 border border-border">
        <span>Order: <StatusBadge status={currentStatus} /></span>
        <span>Payment: <StatusBadge status={String(o.payment_status)} /></span>
        <span>Fulfillment: <StatusBadge status={String(o.fulfillment_status)} /></span>
      </div>

      {/* Fulfillment & Transition Controls */}
      {nextStatuses.length > 0 && (
        <div className="p-3 rounded-lg border border-border space-y-2.5">
          <p className="font-semibold">Next Actions</p>
          {nextStatuses.includes("shipped") && (
            <div className="grid grid-cols-2 gap-2">
              <Input value={courierName} onChange={(e) => setCourierName(e.target.value)} placeholder="Courier" className="h-8 text-xs" />
              <Input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="Tracking #" className="h-8 text-xs" />
            </div>
          )}
          {nextStatuses.includes("cancelled") && (
            <Input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Cancellation reason (optional)" className="h-8 text-xs" />
          )}
          <div className="flex flex-wrap gap-1.5">
            {nextStatuses.map((st) => (
              <Button
                key={st}
                size="sm"
                variant={st === "cancelled" ? "destructive" : "default"}
                className="h-8 text-xs capitalize gap-1"
                onClick={() => transitionMut.mutate(st)}
              >
                {st === "shipped" && <Truck size={12} />}
                Mark {st.replace(/_/g, " ")}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Customer & Address */}
      <div className="p-3 rounded-lg border border-border space-y-1">
        <p className="font-semibold">Customer & Shipping Address</p>
        <p className="font-medium">{String(o.customer_name)} ({String(o.customer_phone || "")})</p>
        <p className="text-muted-foreground">{String(o.customer_email)}</p>
        <p>〒{addr.postalCode} {addr.prefecture} {addr.city} {addr.addressLine1} {addr.addressLine2 || ""}</p>
      </div>

      {/* Items */}
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-muted/50 border-b border-border text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-2">Item</th>
              <th className="text-right px-3 py-2">Qty</th>
              <th className="text-right px-3 py-2">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((it) => (
              <tr key={String(it.id)}>
                <td className="px-3 py-2">
                  <p className="font-medium">{String(it.product_name)}</p>
                  <p className="text-[10px] font-mono text-muted-foreground">{String(it.sku)}</p>
                </td>
                <td className="px-3 py-2 text-right">{String(it.quantity)}</td>
                <td className="px-3 py-2 text-right font-semibold">{formatMoney(it.line_total as number)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-3 border-t border-border text-right space-y-0.5">
          <p>Subtotal: {formatMoney(o.subtotal_amount as number)} · Shipping: {formatMoney(o.shipping_amount as number)}</p>
          <p className="font-bold text-sm text-primary">Total: {formatMoney(o.total_amount as number)} (Paid: {formatMoney(o.paid_amount as number)})</p>
        </div>
      </div>

      {/* Internal Notes */}
      <div className="p-3 rounded-lg border border-border space-y-2">
        <p className="font-semibold">Staff Notes</p>
        <div className="flex gap-1.5">
          <Input value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add internal note..." className="h-8 text-xs" />
          <Button size="sm" className="h-8 text-xs" onClick={() => noteMut.mutate()}>Add</Button>
        </div>
        {notes.map((n) => (
          <div key={String(n.id)} className="p-2 rounded bg-muted/40 text-[11px]">
            <p>{String(n.note)}</p>
            <p className="text-[10px] text-muted-foreground">{String(n.author_name || "Staff")} · {new Date(String(n.created_at)).toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div className="p-3 rounded-lg border border-border space-y-1.5">
        <p className="font-semibold">Timeline</p>
        {history.map((h) => (
          <div key={String(h.id)} className="flex justify-between text-[11px]">
            <span>{h.from_status ? `${h.from_status} → ` : ""}<strong>{String(h.to_status)}</strong></span>
            <span className="text-muted-foreground">{new Date(String(h.created_at)).toLocaleString()}</span>
          </div>
        ))}
      </div>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="text-sm">Record Payment</DialogTitle></DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await apiRequest("/api/v1/admin/payments/transactions/record", {
                  method: "POST",
                  body: JSON.stringify({ orderId, amount: Number(payAmount), paymentMethodCode: o.payment_method_code }),
                });
                toast.success("Payment recorded");
                setPayOpen(false);
                void qc.invalidateQueries({ queryKey: ["admin-order-detail", orderId] });
                void qc.invalidateQueries({ queryKey: ["admin-orders"] });
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Failed");
              }
            }}
            className="space-y-3 text-xs"
          >
            <div>
              <Label className="text-xs">Amount (¥)</Label>
              <Input type="number" min={1} required value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="h-8 text-xs mt-1" />
            </div>
            <Button type="submit" className="w-full h-8 text-xs">Record & Reconcile</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="text-sm">Issue Refund</DialogTitle></DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await apiRequest("/api/v1/admin/returns/refunds", {
                  method: "POST",
                  body: JSON.stringify({ orderId, amount: Number(refundAmount), reason: refundReason }),
                });
                toast.success("Refund issued");
                setRefundOpen(false);
                void qc.invalidateQueries({ queryKey: ["admin-order-detail", orderId] });
                void qc.invalidateQueries({ queryKey: ["admin-orders"] });
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Refund rejected");
              }
            }}
            className="space-y-3 text-xs"
          >
            <div>
              <Label className="text-xs">Refund Amount (¥)</Label>
              <Input type="number" min={1} required value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} className="h-8 text-xs mt-1" />
            </div>
            <div>
              <Label className="text-xs">Reason</Label>
              <Input required minLength={3} value={refundReason} onChange={(e) => setRefundReason(e.target.value)} className="h-8 text-xs mt-1" />
            </div>
            <Button type="submit" variant="destructive" className="w-full h-8 text-xs">Process Refund</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function ReturnsPage() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-returns"],
    queryFn: () => apiRequest<{ data: Array<Record<string, unknown>> }>("/api/v1/admin/returns"),
  });

  const transition = useMutation({
    mutationFn: ({ id, toStatus }: { id: string; toStatus: string }) =>
      apiRequest(`/api/v1/admin/returns/${id}/transition`, { method: "POST", body: JSON.stringify({ toStatus }) }),
    onSuccess: () => {
      toast.success("Return updated");
      void qc.invalidateQueries({ queryKey: ["admin-returns"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Returns & Refunds" description="Requested → Review → Approved/Rejected → Received → Inspected → Refund/Replacement → Completed." />
      <div className="bg-card border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/50 border-b border-border text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-2">Return #</th>
              <th className="text-left px-3 py-2">Order #</th>
              <th className="text-left px-3 py-2">Reason</th>
              <th className="text-left px-3 py-2">Status</th>
              <th className="text-right px-3 py-2">Requested</th>
              <th className="text-right px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(q.data?.data || []).length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">No return requests yet.</td></tr>
            ) : (
              (q.data?.data || []).map((r) => (
                <tr key={String(r.id)} className="h-11">
                  <td className="px-3 py-2 font-mono font-semibold">{String(r.return_number)}</td>
                  <td className="px-3 py-2 font-mono">{String(r.order_number)}</td>
                  <td className="px-3 py-2">{String(r.reason)}</td>
                  <td className="px-3 py-2"><StatusBadge status={String(r.status)} /></td>
                  <td className="px-3 py-2 text-right">{formatMoney(r.requested_refund_amount as number)}</td>
                  <td className="px-3 py-2 text-right space-x-1">
                    {r.status === "return_requested" && (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => transition.mutate({ id: String(r.id), toStatus: "approved" })}>Approve</Button>
                    )}
                    {r.status === "approved" && (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => transition.mutate({ id: String(r.id), toStatus: "product_received" })}>Mark Received</Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function PaymentsAndInvoicesPage({ mode }: { mode: "payments" | "invoices" }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-sales-ledger", mode],
    queryFn: () =>
      apiRequest<{ data: Array<Record<string, unknown>> }>(
        mode === "payments" ? "/api/v1/admin/payments/transactions" : "/api/v1/admin/orders/invoices"
      ),
  });

  const reconcile = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/v1/admin/payments/transactions/${id}/reconcile`, { method: "POST" }),
    onSuccess: () => {
      toast.success("Transaction reconciled");
      void qc.invalidateQueries({ queryKey: ["admin-sales-ledger", "payments"] });
    },
  });

  return (
    <div className="space-y-4">
      <PageHeader title={mode === "payments" ? "Transactions" : "Invoices"} />
      <div className="bg-card border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/50 border-b border-border text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-2">{mode === "payments" ? "Order #" : "Invoice #"}</th>
              <th className="text-left px-3 py-2">Customer / Method</th>
              <th className="text-left px-3 py-2">Status</th>
              <th className="text-right px-3 py-2">Amount</th>
              <th className="text-right px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(q.data?.data || []).length === 0 ? (
              <tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">No records found.</td></tr>
            ) : (
              (q.data?.data || []).map((r) => (
                <tr key={String(r.id)} className="h-11">
                  <td className="px-3 py-2 font-mono font-semibold">{String(r.invoice_number || r.order_number)}</td>
                  <td className="px-3 py-2">{String(r.customer_name)} · {String(r.payment_method_code || r.order_number)}</td>
                  <td className="px-3 py-2"><StatusBadge status={String(r.status)} /></td>
                  <td className="px-3 py-2 text-right font-semibold">{formatMoney((r.amount || r.total_amount) as number)}</td>
                  <td className="px-3 py-2 text-right">
                    {mode === "payments" && !r.reconciled ? (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => reconcile.mutate(String(r.id))}>Reconcile</Button>
                    ) : (
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => window.print()}>Print</Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
