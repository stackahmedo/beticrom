import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard, BarChart3, ShoppingBag, RotateCcw, FileText, CreditCard,
  Package, FolderTree, Award, Globe, SlidersHorizontal, Warehouse, ArrowLeftRight,
  Building2, Users, ClipboardList, UserCheck, Store, Percent, Ticket, Zap,
  Megaphone, MessageSquareQuote, PanelsTopLeft, Image, FileEdit, Newspaper,
  Menu, Library, BellRing, Navigation, DollarSign, Truck, Send, MapPin,
  Mail, LifeBuoy, Bell, PieChart, ShieldCheck, KeyRound, History, UsersRound,
  Settings, Search, Plug,
} from "lucide-react";

export type AdminLocale = "EN" | "JA";

export interface NavItemConfig {
  id: string;
  label: string;
  labelJa: string;
  icon: LucideIcon;
  permission?: string | string[];
  featureFlag?: "multi_vendor_enabled";
}

export interface NavGroupConfig {
  id: string;
  label: string;
  labelJa: string;
  icon: LucideIcon;
  items: NavItemConfig[];
}

/**
 * Restructured 12-group task-oriented navigation (down from 65 exposed items).
 * Every operational capability remains accessible via unified tabs, filters, and drawers.
 */
export const ADMIN_NAV_GROUPS: NavGroupConfig[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    labelJa: "ダッシュボード",
    icon: LayoutDashboard,
    items: [
      { id: "overview/dashboard", label: "Overview", labelJa: "概要", icon: LayoutDashboard, permission: "dashboard.read" },
      { id: "overview/analytics", label: "Analytics", labelJa: "分析", icon: BarChart3, permission: ["analytics.read", "dashboard.read"] },
    ],
  },
  {
    id: "orders",
    label: "Orders",
    labelJa: "注文管理",
    icon: ShoppingBag,
    items: [
      { id: "sales/orders", label: "All Orders", labelJa: "注文一覧", icon: ShoppingBag, permission: "orders.read" },
      { id: "sales/returns", label: "Returns & Refunds", labelJa: "返品・返金", icon: RotateCcw, permission: "returns.read" },
      { id: "sales/invoices", label: "Invoices", labelJa: "請求書", icon: FileText, permission: ["invoices.read", "orders.read"] },
      { id: "sales/payments", label: "Transactions", labelJa: "決済履歴", icon: CreditCard, permission: "payments.read" },
    ],
  },
  {
    id: "products",
    label: "Products",
    labelJa: "商品管理",
    icon: Package,
    items: [
      { id: "catalog/products", label: "All Products", labelJa: "商品一覧", icon: Package, permission: "products.read" },
      { id: "catalog/categories", label: "Categories", labelJa: "カテゴリー", icon: FolderTree, permission: ["taxonomy.read", "products.read"] },
      { id: "catalog/brands", label: "Brands", labelJa: "ブランド", icon: Award, permission: ["taxonomy.read", "products.read"] },
      { id: "catalog/countries", label: "Origins", labelJa: "原産国", icon: Globe, permission: ["taxonomy.read", "products.read"] },
      { id: "catalog/attributes", label: "Attributes & Variants", labelJa: "属性・バリエーション", icon: SlidersHorizontal, permission: ["taxonomy.read", "products.read"] },
    ],
  },
  {
    id: "inventory",
    label: "Inventory",
    labelJa: "在庫管理",
    icon: Warehouse,
    items: [
      { id: "inventory/stock", label: "Stock & Expiry", labelJa: "在庫・賞味期限", icon: Warehouse, permission: "inventory.read" },
      { id: "inventory/movements", label: "Movements & Transfers", labelJa: "入出庫・倉庫間移動", icon: ArrowLeftRight, permission: "inventory.read" },
      { id: "inventory/warehouses", label: "Warehouses", labelJa: "倉庫", icon: Building2, permission: ["warehouses.manage", "inventory.read"] },
      { id: "inventory/suppliers", label: "Suppliers", labelJa: "仕入先", icon: Users, permission: ["suppliers.manage", "inventory.read"] },
      { id: "inventory/purchase-orders", label: "Purchase Orders", labelJa: "発注管理", icon: ClipboardList, permission: ["purchase_orders.manage", "inventory.read"] },
    ],
  },
  {
    id: "customers",
    label: "Customers",
    labelJa: "顧客管理",
    icon: Users,
    items: [
      { id: "people/customers", label: "Customers", labelJa: "顧客一覧", icon: Users, permission: "customers.read" },
      { id: "people/customer-groups", label: "Customer Groups", labelJa: "顧客グループ", icon: UserCheck, permission: "customers.read" },
      { id: "people/vendors", label: "Vendors & Payouts", labelJa: "出品者・精算", icon: Store, permission: "vendors.read", featureFlag: "multi_vendor_enabled" },
    ],
  },
  {
    id: "marketing",
    label: "Marketing",
    labelJa: "マーケティング",
    icon: Percent,
    items: [
      { id: "marketing/offers", label: "Offers", labelJa: "セール・割引", icon: Percent, permission: "marketing.read" },
      { id: "marketing/coupons", label: "Coupons", labelJa: "クーポン", icon: Ticket, permission: "marketing.read" },
      { id: "marketing/flash-sales", label: "Flash Sales", labelJa: "タイムセール", icon: Zap, permission: "marketing.read" },
      { id: "marketing/campaigns", label: "Campaigns", labelJa: "キャンペーン", icon: Megaphone, permission: "marketing.read" },
      { id: "marketing/reviews", label: "Reviews", labelJa: "レビュー", icon: MessageSquareQuote, permission: ["reviews.moderate", "marketing.read"] },
    ],
  },
  {
    id: "online-store",
    label: "Online Store",
    labelJa: "オンラインストア",
    icon: PanelsTopLeft,
    items: [
      { id: "cms/visual-editor", label: "Visual Homepage CMS", labelJa: "ビジュアルCMS", icon: PanelsTopLeft, permission: "cms.read" },
      { id: "cms/sliders", label: "Sliders & Banners", labelJa: "スライダー・バナー", icon: Image, permission: "cms.read" },
      { id: "cms/pages", label: "Pages", labelJa: "固定ページ", icon: FileEdit, permission: "cms.read" },
      { id: "cms/blog-posts", label: "Blog", labelJa: "ブログ", icon: Newspaper, permission: "cms.read" },
      { id: "cms/menus", label: "Navigation", labelJa: "ナビゲーション", icon: Menu, permission: "cms.read" },
      { id: "cms/media", label: "Media Library", labelJa: "メディア", icon: Library, permission: "media.read" },
      { id: "cms/announcements", label: "Announcements", labelJa: "お知らせバー", icon: BellRing, permission: "cms.read" },
    ],
  },
  {
    id: "shipping",
    label: "Shipping",
    labelJa: "配送・物流",
    icon: Truck,
    items: [
      { id: "logistics/zones", label: "Shipping Zones", labelJa: "配送ゾーン", icon: Navigation, permission: "shipping.read" },
      { id: "logistics/rates", label: "Shipping Rates", labelJa: "配送料金", icon: DollarSign, permission: "shipping.read" },
      { id: "logistics/couriers", label: "Couriers", labelJa: "配送業者", icon: Truck, permission: "shipping.read" },
      { id: "logistics/shipments", label: "Shipments", labelJa: "発送追跡", icon: Send, permission: ["shipping.read", "orders.read"] },
      { id: "logistics/countries", label: "Regions & Areas", labelJa: "地域設定", icon: MapPin, permission: "shipping.read" },
    ],
  },
  {
    id: "support",
    label: "Support",
    labelJa: "サポート",
    icon: LifeBuoy,
    items: [
      { id: "support/messages", label: "Contact Messages", labelJa: "お問い合わせ", icon: Mail, permission: "support.read" },
      { id: "support/tickets", label: "Support Tickets", labelJa: "サポートチケット", icon: LifeBuoy, permission: "support.read" },
      { id: "support/notifications", label: "Notifications", labelJa: "通知センター", icon: Bell, permission: "notifications.read" },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    labelJa: "レポート",
    icon: PieChart,
    items: [
      { id: "system/reports", label: "Financial & Ops Reports", labelJa: "財務・業務レポート", icon: PieChart, permission: "reports.read" },
    ],
  },
  {
    id: "team-access",
    label: "Team & Access",
    labelJa: "チーム・権限",
    icon: ShieldCheck,
    items: [
      { id: "system/users", label: "Admin Users", labelJa: "管理者ユーザー", icon: ShieldCheck, permission: "users.read" },
      { id: "system/roles", label: "Roles & Permissions", labelJa: "ロール・権限", icon: KeyRound, permission: ["roles.manage", "users.read"] },
      { id: "system/audit-logs", label: "Audit Logs", labelJa: "監査ログ", icon: History, permission: "audit.read" },
      { id: "people/team", label: "Team Directory", labelJa: "チーム紹介", icon: UsersRound, permission: ["team.manage", "cms.read"] },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    labelJa: "設定",
    icon: Settings,
    items: [
      { id: "system/settings-store", label: "Business & Store", labelJa: "ストア基本設定", icon: Settings, permission: "settings.read" },
      { id: "system/settings-payment", label: "Payments", labelJa: "決済設定", icon: CreditCard, permission: ["settings.read", "payments.read"] },
      { id: "system/settings-seo", label: "SEO Metadata", labelJa: "SEO設定", icon: Search, permission: "settings.read" },
      { id: "system/settings-email", label: "Email & Notifications", labelJa: "メール設定", icon: Mail, permission: "settings.read" },
      { id: "system/settings-integrations", label: "Technical Integrations", labelJa: "外部連携", icon: Plug, permission: "settings.read" },
    ],
  },
];

export function findNavMeta(routeId: string, locale: AdminLocale = "EN"): { groupId: string; group: string; label: string } {
  for (const g of ADMIN_NAV_GROUPS) {
    const item = g.items.find((i) => i.id === routeId);
    if (item) {
      return {
        groupId: g.id,
        group: locale === "JA" ? g.labelJa : g.label,
        label: locale === "JA" ? item.labelJa : item.label,
      };
    }
  }
  return {
    groupId: "dashboard",
    group: locale === "JA" ? "ダッシュボード" : "Dashboard",
    label: locale === "JA" ? "概要" : "Overview",
  };
}
