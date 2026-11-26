import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import {
  ShoppingBag, TrendingUp, Users, AlertTriangle, Plus, Package, ClipboardList, Info,
} from "lucide-react";
import { apiRequest } from "../api/client";
import { ErrorState, KpiCard, PageHeader, StatusBadge, TableSkeleton, formatMoney } from "../components/AdminPrimitives";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";

interface DashboardResponse {
  data: {
    range: { from: string; to: string };
    kpis: {
      todaySales: number;
      weeklySales: number;
      monthlySales: number;
      yearlySales: number;
      grossSales: number;
      discounts: number;
      refunds: number;
      netSales: number;
      cogs: number;
      grossProfit: number;
      salesComparisonPct: number | null;
      totalOrders: number;
      ordersComparisonPct: number | null;
      pendingOrders: number;
      overdueOrders: number;
      processingOrders: number;
      shippedOrders: number;
      deliveredOrders: number;
      cancelledOrders: number;
      totalCustomers: number;
      newCustomers: number;
      returningCustomers: number;
      totalSkus: number;
      lowStockCount: number;
      outOfStockCount: number;
    };
    formulas: Record<string, string>;
    salesTrend: Array<{ day: string; sales: number; orders: number }>;
    orderStatusDistribution: Array<{ status: string; count: number }>;
    topSellingProducts: Array<{ sku: string; product_name: string; units_sold: number; revenue: number }>;
    recentOrders: Array<{
      id: string;
      order_number: string;
      invoice_number: string;
      customer_name: string;
      total_amount: number;
      payment_method_code: string;
      payment_status: string;
      status: string;
      created_at: string;
    }>;
    recentActivities: Array<{ id: string; actor_email: string; action: string; entity_type: string; created_at: string }>;
    operationalAlerts: Array<{ level: "warning" | "error" | "info"; title: string; count: number; route: string }>;
  };
}

const PIE_COLORS = ["#12633D", "#0EA5E9", "#F59E0B", "#EF4444", "#8B5CF6", "#64748B"];

export function DashboardPage({
  mode = "dashboard",
  onNavigate,
}: {
  mode?: "dashboard" | "analytics";
  onNavigate: (routeId: string) => void;
}) {
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));

  const query = useQuery({
    queryKey: ["admin-dashboard", fromDate, toDate],
    queryFn: () =>
      apiRequest<DashboardResponse>(
        `/api/v1/admin/analytics/dashboard?from=${encodeURIComponent(fromDate)}&to=${encodeURIComponent(
          toDate + "T23:59:59Z"
        )}`
      ),
  });

  if (query.isLoading) {
    return (
      <div className="space-y-4">
        <PageHeader title={mode === "analytics" ? "Analytics" : "Dashboard"} />
        <TableSkeleton rows={8} />
      </div>
    );
  }

  if (query.error || !query.data) {
    return <ErrorState message={query.error?.message || "Failed to load dashboard"} onRetry={() => void query.refetch()} />;
  }

  const { kpis, formulas, salesTrend, orderStatusDistribution, topSellingProducts, recentOrders, recentActivities, operationalAlerts } =
    query.data.data;

  return (
    <div className="space-y-5">
      <PageHeader
        title={mode === "analytics" ? "Commerce Analytics" : "Operations Dashboard"}
        description="Real-time metrics calculated directly from PostgreSQL transactions and inventory ledgers."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-8 text-xs w-36"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-8 text-xs w-36"
            />
            <Button size="sm" variant="outline" onClick={() => onNavigate("catalog/add-product")} className="h-8 text-xs gap-1">
              <Plus size={13} /> Add Product
            </Button>
            <Button size="sm" variant="outline" onClick={() => onNavigate("inventory/stock")} className="h-8 text-xs gap-1">
              <Package size={13} /> Stock
            </Button>
            <Button size="sm" onClick={() => onNavigate("sales/all")} className="h-8 text-xs gap-1">
              <ClipboardList size={13} /> Orders
            </Button>
          </div>
        }
      />

      {/* Operational Alerts */}
      {operationalAlerts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {operationalAlerts.map((a) => (
            <button
              key={a.title}
              type="button"
              onClick={() => onNavigate(a.route)}
              className={`text-left p-3 rounded-lg border flex items-center justify-between cursor-pointer transition-colors ${
                a.level === "error"
                  ? "bg-red-50/70 border-red-200 dark:bg-red-950/30 dark:border-red-900"
                  : "bg-amber-50/70 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900"
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-medium">
                <AlertTriangle size={15} className={a.level === "error" ? "text-red-600" : "text-amber-600"} />
                <span>{a.title}</span>
              </div>
              <span className="text-sm font-bold tabular-nums">{a.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Row 1: Revenue & Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Today's Sales"
          value={formatMoney(kpis.todaySales)}
          subtext={`Weekly: ${formatMoney(kpis.weeklySales)}`}
          icon={<TrendingUp size={15} />}
        />
        <KpiCard
          label="Monthly Sales"
          value={formatMoney(kpis.monthlySales)}
          subtext={`Yearly: ${formatMoney(kpis.yearlySales)}`}
          deltaPct={kpis.salesComparisonPct}
        />
        <KpiCard
          label="Net Sales (Period)"
          value={formatMoney(kpis.netSales)}
          subtext={`Gross: ${formatMoney(kpis.grossSales)} · Refunds: ${formatMoney(kpis.refunds)}`}
          tone="success"
        />
        <KpiCard
          label="Gross Profit (Period)"
          value={formatMoney(kpis.grossProfit)}
          subtext={`COGS: ${formatMoney(kpis.cogs)}`}
          tone="success"
        />
      </div>

      {/* Row 2: Orders, Customers & Inventory KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard
          label="Total Orders"
          value={kpis.totalOrders}
          deltaPct={kpis.ordersComparisonPct}
          icon={<ShoppingBag size={14} />}
        />
        <KpiCard
          label="Pending / Overdue"
          value={`${kpis.pendingOrders} / ${kpis.overdueOrders}`}
          tone={kpis.overdueOrders > 0 ? "danger" : "default"}
        />
        <KpiCard
          label="Processing / Shipped"
          value={`${kpis.processingOrders} / ${kpis.shippedOrders}`}
        />
        <KpiCard
          label="Delivered / Cancelled"
          value={`${kpis.deliveredOrders} / ${kpis.cancelledOrders}`}
        />
        <KpiCard
          label="Customers (New / Ret.)"
          value={kpis.totalCustomers}
          subtext={`${kpis.newCustomers} new · ${kpis.returningCustomers} returning`}
          icon={<Users size={14} />}
        />
        <KpiCard
          label="Low / Out of Stock"
          value={`${kpis.lowStockCount} / ${kpis.outOfStockCount}`}
          subtext={`Total SKUs: ${kpis.totalSkus}`}
          tone={kpis.outOfStockCount > 0 ? "warning" : "default"}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card border border-border rounded-lg p-4">
          <h2 className="text-xs font-semibold text-foreground mb-3">Sales Trend (Selected Period)</h2>
          <div className="h-64 w-full">
            {salesTrend.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                No order transactions in selected date range.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesTrend}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.25} />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <RechartsTooltip />
                  <Area type="monotone" dataKey="sales" stroke="#12633D" fill="#12633D" fillOpacity={0.15} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <h2 className="text-xs font-semibold text-foreground mb-3">Order Status Distribution</h2>
          <div className="h-64 w-full">
            {orderStatusDistribution.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                No orders recorded yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={orderStatusDistribution}
                    dataKey="count"
                    nameKey="status"
                    innerRadius={45}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {orderStatusDistribution.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Tables: Recent Orders, Top Products, Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-xs font-semibold">Recent Orders</h2>
            <button
              type="button"
              onClick={() => onNavigate("sales/all")}
              className="text-[11px] text-primary hover:underline cursor-pointer"
            >
              View all
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Order</th>
                  <th className="text-left px-3 py-2 font-medium">Customer</th>
                  <th className="text-left px-3 py-2 font-medium">Payment</th>
                  <th className="text-left px-3 py-2 font-medium">Status</th>
                  <th className="text-right px-3 py-2 font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                      No orders placed yet.
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-muted/30">
                      <td className="px-3 py-2 font-mono font-medium">{o.order_number}</td>
                      <td className="px-3 py-2 truncate max-w-[140px]">{o.customer_name}</td>
                      <td className="px-3 py-2 uppercase text-[11px]">{o.payment_method_code}</td>
                      <td className="px-3 py-2">
                        <StatusBadge status={o.status} />
                      </td>
                      <td className="px-3 py-2 text-right font-semibold tabular-nums">{formatMoney(o.total_amount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-xs font-semibold">Recent Activities & Top SKUs</h2>
          </div>
          <div className="p-3 space-y-3 text-xs">
            {topSellingProducts.slice(0, 4).map((p) => (
              <div key={p.sku} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium truncate">{p.product_name}</p>
                  <p className="text-[11px] text-muted-foreground">{p.units_sold} units</p>
                </div>
                <span className="font-semibold tabular-nums">{formatMoney(p.revenue)}</span>
              </div>
            ))}
            <div className="border-t border-border pt-2 space-y-1.5">
              {recentActivities.slice(0, 5).map((a) => (
                <div key={a.id} className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="truncate">{a.action}</span>
                  <span className="shrink-0">{new Date(a.created_at).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Documented Metric Formulas */}
      <div className="bg-muted/40 border border-border rounded-lg p-3 text-[11px] text-muted-foreground flex flex-wrap gap-x-6 gap-y-1">
        <span className="inline-flex items-center gap-1 font-semibold text-foreground">
          <Info size={12} /> Verified Metric Formulas:
        </span>
        {Object.entries(formulas).map(([k, v]) => (
          <span key={k}>
            <strong>{k}:</strong> {v}
          </span>
        ))}
      </div>
    </div>
  );
}
