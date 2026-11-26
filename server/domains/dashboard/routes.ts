import { Hono } from "hono";
import * as XLSX from "xlsx";
import { getDb } from "../../db/client.js";
import { requireAdminAuth } from "../../middleware/auth.js";
import { isVendorScoped, requirePermission } from "../../middleware/rbac.js";

const dashboardRoutes = new Hono();
dashboardRoutes.use("*", requireAdminAuth);

function parseDateRange(c: { req: { query: (k: string) => string | undefined } }) {
  const to = c.req.query("to") ? new Date(c.req.query("to")!) : new Date();
  const from = c.req.query("from")
    ? new Date(c.req.query("from")!)
    : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
  const spanMs = Math.max(24 * 60 * 60 * 1000, to.getTime() - from.getTime());
  const prevTo = new Date(from.getTime());
  const prevFrom = new Date(from.getTime() - spanMs);
  return { from: from.toISOString(), to: to.toISOString(), prevFrom: prevFrom.toISOString(), prevTo: prevTo.toISOString() };
}

function calcDeltaPct(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 10000) / 100;
}

dashboardRoutes.get("/dashboard", requirePermission("dashboard.read"), async (c) => {
  const db = await getDb();
  const { from, to, prevFrom, prevTo } = parseDateRange(c);
  const vendorFilter = isVendorScoped(c) ? c.get("authUser").vendorId : null;
  const vendorClause = vendorFilter ? "AND vendor_id = $3" : "";

  // Sales metrics from real orders & refunds
  const salesQuery = `
    SELECT
      COALESCE(SUM(CASE WHEN created_at >= CURRENT_DATE AND status NOT IN ('cancelled') THEN total_amount ELSE 0 END), 0)::float8 AS today_sales,
      COALESCE(SUM(CASE WHEN created_at >= DATE_TRUNC('week', NOW()) AND status NOT IN ('cancelled') THEN total_amount ELSE 0 END), 0)::float8 AS weekly_sales,
      COALESCE(SUM(CASE WHEN created_at >= DATE_TRUNC('month', NOW()) AND status NOT IN ('cancelled') THEN total_amount ELSE 0 END), 0)::float8 AS monthly_sales,
      COALESCE(SUM(CASE WHEN created_at >= DATE_TRUNC('year', NOW()) AND status NOT IN ('cancelled') THEN total_amount ELSE 0 END), 0)::float8 AS yearly_sales,
      COALESCE(SUM(CASE WHEN created_at BETWEEN $1 AND $2 AND status NOT IN ('cancelled') THEN subtotal_amount ELSE 0 END), 0)::float8 AS period_gross_sales,
      COALESCE(SUM(CASE WHEN created_at BETWEEN $1 AND $2 AND status NOT IN ('cancelled') THEN discount_amount ELSE 0 END), 0)::float8 AS period_discounts,
      COALESCE(SUM(CASE WHEN created_at BETWEEN $1 AND $2 AND status NOT IN ('cancelled') THEN total_amount ELSE 0 END), 0)::float8 AS period_total_sales,
      COUNT(*) FILTER (WHERE created_at BETWEEN $1 AND $2)::int AS total_orders,
      COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_orders,
      COUNT(*) FILTER (WHERE status = 'pending' AND created_at < NOW() - INTERVAL '24 hours')::int AS overdue_orders,
      COUNT(*) FILTER (WHERE status IN ('confirmed', 'processing', 'packed'))::int AS processing_orders,
      COUNT(*) FILTER (WHERE status IN ('shipped', 'out_for_delivery'))::int AS shipped_orders,
      COUNT(*) FILTER (WHERE status IN ('delivered', 'completed'))::int AS delivered_orders,
      COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled_orders
    FROM orders
    WHERE 1=1 ${vendorClause}
  `;
  const salesParams = vendorFilter ? [from, to, vendorFilter] : [from, to];
  const prevSalesParams = vendorFilter ? [prevFrom, prevTo, vendorFilter] : [prevFrom, prevTo];

  const [salesRes, prevSalesRes, refundRes, cogsRes, customerRes, inventoryRes, trendRes, statusDistRes, topProductsRes, recentOrdersRes, activitiesRes] =
    await Promise.all([
      db.query<Record<string, number>>(salesQuery, salesParams),
      db.query<Record<string, number>>(salesQuery, prevSalesParams),
      db.query<{ total_refunds: number }>(
        `SELECT COALESCE(SUM(amount), 0)::float8 AS total_refunds FROM refunds WHERE status = 'completed' AND created_at BETWEEN $1 AND $2`,
        [from, to]
      ),
      db.query<{ total_cogs: number }>(
        `SELECT COALESCE(SUM(oi.cost_price * GREATEST(0, oi.quantity - oi.returned_qty)), 0)::float8 AS total_cogs
         FROM order_items oi JOIN orders o ON o.id = oi.order_id
         WHERE o.created_at BETWEEN $1 AND $2 AND o.status NOT IN ('cancelled')`,
        [from, to]
      ),
      db.query<{ total_customers: number; new_customers: number; returning_customers: number }>(
        `SELECT
           COUNT(*) FILTER (WHERE deleted_at IS NULL)::int AS total_customers,
           COUNT(*) FILTER (WHERE deleted_at IS NULL AND created_at BETWEEN $1 AND $2)::int AS new_customers,
           COUNT(*) FILTER (WHERE deleted_at IS NULL AND total_orders_count > 1)::int AS returning_customers
         FROM customers`,
        [from, to]
      ),
      db.query<{ total_skus: number; low_stock: number; out_of_stock: number }>(
        `SELECT
           COUNT(*)::int AS total_skus,
           COUNT(*) FILTER (WHERE available_qty > 0 AND available_qty <= low_stock_threshold)::int AS low_stock,
           COUNT(*) FILTER (WHERE available_qty <= 0)::int AS out_of_stock
         FROM inventory_items`
      ),
      db.query<{ day: string; sales: number; orders: number }>(
        `SELECT TO_CHAR(DATE_TRUNC('day', created_at), 'YYYY-MM-DD') AS day,
                COALESCE(SUM(total_amount), 0)::float8 AS sales,
                COUNT(*)::int AS orders
         FROM orders
         WHERE created_at BETWEEN $1 AND $2 AND status NOT IN ('cancelled')
         GROUP BY 1 ORDER BY 1 ASC`,
        [from, to]
      ),
      db.query<{ status: string; count: number }>(
        `SELECT status, COUNT(*)::int AS count FROM orders GROUP BY status ORDER BY count DESC`
      ),
      db.query(
        `SELECT oi.sku, oi.product_name, SUM(oi.quantity)::int AS units_sold, SUM(oi.line_total)::float8 AS revenue
         FROM order_items oi JOIN orders o ON o.id = oi.order_id
         WHERE o.status NOT IN ('cancelled')
         GROUP BY oi.sku, oi.product_name
         ORDER BY revenue DESC LIMIT 8`
      ),
      db.query(
        `SELECT id, order_number, invoice_number, customer_name, total_amount::float8, payment_method_code, payment_status, status, created_at
         FROM orders ORDER BY created_at DESC LIMIT 8`
      ),
      db.query(
        `SELECT id, actor_email, action, entity_type, entity_id, created_at
         FROM audit_logs ORDER BY created_at DESC LIMIT 10`
      ),
    ]);

  const s = salesRes.rows[0];
  const ps = prevSalesRes.rows[0];
  const refunds = Number(refundRes.rows[0]?.total_refunds || 0);
  const cogs = Number(cogsRes.rows[0]?.total_cogs || 0);
  const grossSales = Number(s?.period_gross_sales || 0);
  const discounts = Number(s?.period_discounts || 0);
  const netSales = Math.max(0, grossSales - discounts - refunds);
  const grossProfit = netSales - cogs;

  const inv = inventoryRes.rows[0];
  const cust = customerRes.rows[0];

  const alerts: Array<{ level: "warning" | "error" | "info"; title: string; count: number; route: string }> = [];
  if ((s?.overdue_orders || 0) > 0) {
    alerts.push({ level: "error", title: "Overdue pending orders (>24h)", count: s.overdue_orders, route: "/admin/sales/pending" });
  }
  if ((inv?.out_of_stock || 0) > 0) {
    alerts.push({ level: "error", title: "Out of stock SKUs", count: inv.out_of_stock, route: "/admin/inventory/out-of-stock" });
  }
  if ((inv?.low_stock || 0) > 0) {
    alerts.push({ level: "warning", title: "Low stock SKUs", count: inv.low_stock, route: "/admin/inventory/low-stock" });
  }

  return c.json({
    data: {
      range: { from, to },
      kpis: {
        todaySales: s?.today_sales || 0,
        weeklySales: s?.weekly_sales || 0,
        monthlySales: s?.monthly_sales || 0,
        yearlySales: s?.yearly_sales || 0,
        grossSales,
        discounts,
        refunds,
        netSales,
        cogs,
        grossProfit,
        salesComparisonPct: calcDeltaPct(s?.period_total_sales || 0, ps?.period_total_sales || 0),
        totalOrders: s?.total_orders || 0,
        ordersComparisonPct: calcDeltaPct(s?.total_orders || 0, ps?.total_orders || 0),
        pendingOrders: s?.pending_orders || 0,
        overdueOrders: s?.overdue_orders || 0,
        processingOrders: s?.processing_orders || 0,
        shippedOrders: s?.shipped_orders || 0,
        deliveredOrders: s?.delivered_orders || 0,
        cancelledOrders: s?.cancelled_orders || 0,
        totalCustomers: cust?.total_customers || 0,
        newCustomers: cust?.new_customers || 0,
        returningCustomers: cust?.returning_customers || 0,
        totalSkus: inv?.total_skus || 0,
        lowStockCount: inv?.low_stock || 0,
        outOfStockCount: inv?.out_of_stock || 0,
      },
      formulas: {
        grossSales: "SUM(order_items.unit_price * quantity) excluding cancelled orders",
        netSales: "Gross Sales - Discounts - Completed Refunds",
        grossProfit: "Net Sales - COGS (order_items.cost_price * net_units)",
        periodComparison: "((current - previous) / previous) * 100, or null when previous = 0",
      },
      salesTrend: trendRes.rows,
      orderStatusDistribution: statusDistRes.rows,
      topSellingProducts: topProductsRes.rows,
      recentOrders: recentOrdersRes.rows,
      recentActivities: activitiesRes.rows,
      operationalAlerts: alerts,
    },
  });
});

// ─── Reconciled Reports (11 Report Types + CSV Export) ────────────────────────
dashboardRoutes.get("/reports", requirePermission("reports.read"), async (c) => {
  const reportType = c.req.query("type") || "sales";
  const format = c.req.query("format"); // 'csv' or json
  const { from, to } = parseDateRange(c);
  const db = await getDb();

  let rows: Record<string, unknown>[] = [];

  if (reportType === "sales" || reportType === "orders") {
    const res = await db.query(
      `SELECT DATE_TRUNC('day', created_at)::date AS date,
              COUNT(*)::int AS orders_count,
              SUM(subtotal_amount)::float8 AS gross_sales,
              SUM(discount_amount)::float8 AS discounts,
              SUM(tax_amount)::float8 AS tax_collected,
              SUM(shipping_amount)::float8 AS shipping_revenue,
              SUM(refunded_amount)::float8 AS refunds,
              SUM(total_amount - refunded_amount)::float8 AS net_total
       FROM orders
       WHERE created_at BETWEEN $1 AND $2 AND status NOT IN ('cancelled')
       GROUP BY 1 ORDER BY 1 DESC`,
      [from, to]
    );
    rows = res.rows;
  } else if (reportType === "inventory") {
    const res = await db.query(
      `SELECT pv.sku, p.name AS product_name, inv.physical_qty, inv.reserved_qty, inv.available_qty,
              inv.damaged_qty, pv.cost_price::float8, (inv.physical_qty * pv.cost_price)::float8 AS stock_valuation
       FROM inventory_items inv
       JOIN product_variants pv ON pv.id = inv.variant_id
       JOIN products p ON p.id = pv.product_id
       ORDER BY stock_valuation DESC LIMIT 200`
    );
    rows = res.rows;
  } else if (reportType === "products") {
    const res = await db.query(
      `SELECT oi.sku, oi.product_name, SUM(oi.quantity)::int AS units_sold,
              SUM(oi.line_total)::float8 AS revenue, SUM(oi.cost_price * oi.quantity)::float8 AS cogs
       FROM order_items oi JOIN orders o ON o.id = oi.order_id
       WHERE o.created_at BETWEEN $1 AND $2 AND o.status NOT IN ('cancelled')
       GROUP BY oi.sku, oi.product_name ORDER BY revenue DESC`,
      [from, to]
    );
    rows = res.rows;
  } else if (reportType === "customers") {
    const res = await db.query(
      `SELECT customer_code, full_name, email, total_orders_count, total_spent_amount::float8, last_order_at
       FROM customers WHERE deleted_at IS NULL ORDER BY total_spent_amount DESC LIMIT 200`
    );
    rows = res.rows;
  } else if (reportType === "vendors") {
    const res = await db.query(
      `SELECT v.business_name, v.commission_rate::float8,
              COUNT(DISTINCT oi.order_id)::int AS orders_count,
              COALESCE(SUM(oi.line_total), 0)::float8 AS gross_sales,
              COALESCE(SUM(oi.commission_amount), 0)::float8 AS commission_earned
       FROM vendors v LEFT JOIN order_items oi ON oi.vendor_id = v.id
       GROUP BY v.id ORDER BY gross_sales DESC`
    );
    rows = res.rows;
  } else if (reportType === "payments") {
    const res = await db.query(
      `SELECT pt.created_at, o.order_number, pt.payment_method_code, pt.provider, pt.status, pt.amount::float8, pt.reconciled
       FROM payment_transactions pt JOIN orders o ON o.id = pt.order_id
       WHERE pt.created_at BETWEEN $1 AND $2 ORDER BY pt.created_at DESC`,
      [from, to]
    );
    rows = res.rows;
  } else if (reportType === "refunds") {
    const res = await db.query(
      `SELECT r.refund_number, o.order_number, r.amount::float8, r.status, r.reason, r.created_at
       FROM refunds r JOIN orders o ON o.id = r.order_id
       WHERE r.created_at BETWEEN $1 AND $2 ORDER BY r.created_at DESC`,
      [from, to]
    );
    rows = res.rows;
  } else if (reportType === "shipping") {
    const res = await db.query(
      `SELECT courier_name, temperature_zone, status, COUNT(*)::int AS shipments_count, COALESCE(SUM(shipping_cost), 0)::float8 AS total_cost
       FROM shipments WHERE created_at BETWEEN $1 AND $2 GROUP BY 1, 2, 3`,
      [from, to]
    );
    rows = res.rows;
  } else if (reportType === "tax") {
    const res = await db.query(
      `SELECT DATE_TRUNC('month', created_at)::date AS month,
              SUM(tax_amount)::float8 AS total_tax_collected,
              SUM(subtotal_amount)::float8 AS taxable_subtotal
       FROM orders WHERE created_at BETWEEN $1 AND $2 AND status NOT IN ('cancelled')
       GROUP BY 1 ORDER BY 1 DESC`,
      [from, to]
    );
    rows = res.rows;
  } else if (reportType === "discounts") {
    const res = await db.query(
      `SELECT COALESCE(coupon_code, 'NONE') AS coupon_code, COUNT(*)::int AS orders_count, SUM(discount_amount)::float8 AS total_discount
       FROM orders WHERE created_at BETWEEN $1 AND $2 AND discount_amount > 0
       GROUP BY 1 ORDER BY total_discount DESC`,
      [from, to]
    );
    rows = res.rows;
  }

  if (format === "csv") {
    const ws = XLSX.utils.json_to_sheet(rows);
    const csv = XLSX.utils.sheet_to_csv(ws);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="beticrom-report-${reportType}.csv"`,
      },
    });
  }

  return c.json({ data: { type: reportType, range: { from, to }, rows } });
});

export default dashboardRoutes;
