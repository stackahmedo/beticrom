import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminAuthProvider, useAdminAuth } from "./auth/AuthContext";
import { AdminLoginPage } from "./auth/AdminLoginPage";
import { AdminShell } from "./layout/AdminShell";
import type { AdminLocale } from "./config/navigation";
import { DashboardPage } from "./pages/DashboardPage";
import { AllProductsPage, ProductFormPage, TaxonomyPage, ProductImportExportPage } from "./pages/CatalogPages";
import { StockManagementPage, StockMovementsPage, WarehousesSuppliersPage } from "./pages/InventoryPages";
import { OrdersPage, ReturnsPage, PaymentsAndInvoicesPage } from "./pages/SalesPages";
import { CustomersPage, VendorsAndTeamPage } from "./pages/PeoplePages";
import { MarketingPage } from "./pages/MarketingPages";
import { VisualHomepageEditor, MediaLibraryPage, CmsSectionPage } from "./pages/CmsPages";
import { LogisticsPage } from "./pages/LogisticsPages";
import { SupportPage } from "./pages/SupportPages";
import { ReportsPage, RbacAndAuditPage, SettingsPage } from "./pages/SystemPages";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 15_000,
    },
  },
});

function AdminWorkspace({ onBackToStore }: { onBackToStore: () => void }) {
  const { user, loading } = useAdminAuth();
  const [activeRoute, setActiveRoute] = useState("overview/dashboard");
  const [locale, setLocale] = useState<AdminLocale>("EN");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-zinc-950 text-xs text-muted-foreground">
        Verifying administrator session...
      </div>
    );
  }

  if (!user) {
    return <AdminLoginPage onBackToStore={onBackToStore} />;
  }

  const renderPage = () => {
    switch (activeRoute) {
      case "overview/dashboard":
        return <DashboardPage mode="dashboard" onNavigate={setActiveRoute} />;
      case "overview/analytics":
        return <DashboardPage mode="analytics" onNavigate={setActiveRoute} />;

      // Unified Orders Workspace + Legacy Route Aliases
      case "sales/orders":
      case "sales/all":
        return <OrdersPage initialStatus="all" />;
      case "sales/pending":
        return <OrdersPage initialStatus="pending" />;
      case "sales/confirmed":
        return <OrdersPage initialStatus="confirmed" />;
      case "sales/processing":
        return <OrdersPage initialStatus="processing" />;
      case "sales/packed":
        return <OrdersPage initialStatus="packed" />;
      case "sales/shipped":
        return <OrdersPage initialStatus="shipped" />;
      case "sales/delivered":
        return <OrdersPage initialStatus="delivered" />;
      case "sales/cancelled":
        return <OrdersPage initialStatus="cancelled" />;
      case "sales/returns":
        return <ReturnsPage />;
      case "sales/payments":
        return <PaymentsAndInvoicesPage mode="payments" />;
      case "sales/invoices":
        return <PaymentsAndInvoicesPage mode="invoices" />;

      // Catalog
      case "catalog/products":
        return <AllProductsPage onNavigate={setActiveRoute} />;
      case "catalog/add-product":
        return <ProductFormPage onDone={() => setActiveRoute("catalog/products")} />;
      case "catalog/categories":
        return <TaxonomyPage kind="categories" />;
      case "catalog/subcategories":
        return <TaxonomyPage kind="subcategories" />;
      case "catalog/brands":
        return <TaxonomyPage kind="brands" />;
      case "catalog/countries":
        return <TaxonomyPage kind="countries" />;
      case "catalog/attributes":
        return <TaxonomyPage kind="attributes" />;
      case "catalog/variants":
        return <TaxonomyPage kind="variants" />;
      case "catalog/import":
        return <ProductImportExportPage mode="import" />;
      case "catalog/export":
        return <ProductImportExportPage mode="export" />;

      // Inventory
      case "inventory/stock":
        return <StockManagementPage initialFilter="all" />;
      case "inventory/low-stock":
        return <StockManagementPage initialFilter="low" />;
      case "inventory/out-of-stock":
        return <StockManagementPage initialFilter="out" />;
      case "inventory/movements":
        return <StockMovementsPage />;
      case "inventory/warehouses":
        return <WarehousesSuppliersPage mode="warehouses" />;
      case "inventory/suppliers":
        return <WarehousesSuppliersPage mode="suppliers" />;
      case "inventory/purchase-orders":
        return <WarehousesSuppliersPage mode="purchase-orders" />;

      // People
      case "people/customers":
        return <CustomersPage mode="customers" />;
      case "people/customer-groups":
        return <CustomersPage mode="groups" />;
      case "people/vendors":
        return <VendorsAndTeamPage mode="vendors" />;
      case "people/vendor-applications":
        return <VendorsAndTeamPage mode="applications" />;
      case "people/vendor-payouts":
        return <VendorsAndTeamPage mode="payouts" />;
      case "people/team":
        return <VendorsAndTeamPage mode="team" />;

      // Marketing
      case "marketing/offers":
        return <MarketingPage mode="offers" />;
      case "marketing/coupons":
        return <MarketingPage mode="coupons" />;
      case "marketing/flash-sales":
        return <MarketingPage mode="flash-sales" />;
      case "marketing/campaigns":
        return <MarketingPage mode="campaigns" />;
      case "marketing/reviews":
        return <MarketingPage mode="reviews" />;

      // Online Store / Visual CMS
      case "cms/visual-editor":
        return <VisualHomepageEditor />;
      case "cms/homepage":
        return <CmsSectionPage mode="homepage" />;
      case "cms/sliders":
        return <CmsSectionPage mode="sliders" />;
      case "cms/banners":
        return <CmsSectionPage mode="banners" />;
      case "cms/pages":
        return <CmsSectionPage mode="pages" />;
      case "cms/menus":
        return <CmsSectionPage mode="menus" />;
      case "cms/blog-categories":
        return <CmsSectionPage mode="blog-categories" />;
      case "cms/blog-posts":
        return <CmsSectionPage mode="blog-posts" />;
      case "cms/media":
        return <MediaLibraryPage />;
      case "cms/announcements":
        return <CmsSectionPage mode="announcements" />;

      // Shipping
      case "logistics/countries":
        return <LogisticsPage mode="countries" />;
      case "logistics/regions":
        return <LogisticsPage mode="regions" />;
      case "logistics/cities":
        return <LogisticsPage mode="cities" />;
      case "logistics/zones":
        return <LogisticsPage mode="zones" />;
      case "logistics/rates":
        return <LogisticsPage mode="rates" />;
      case "logistics/couriers":
        return <LogisticsPage mode="couriers" />;
      case "logistics/shipments":
        return <LogisticsPage mode="shipments" />;

      // Support
      case "support/messages":
        return <SupportPage mode="messages" />;
      case "support/tickets":
        return <SupportPage mode="tickets" />;
      case "support/notifications":
        return <SupportPage mode="notifications" />;

      // Reports, Team & Settings
      case "system/reports":
        return <ReportsPage />;
      case "system/users":
        return <RbacAndAuditPage mode="users" />;
      case "system/roles":
        return <RbacAndAuditPage mode="roles" />;
      case "system/permissions":
        return <RbacAndAuditPage mode="permissions" />;
      case "system/audit-logs":
        return <RbacAndAuditPage mode="audit-logs" />;
      case "system/settings-store":
        return <SettingsPage section="store" />;
      case "system/settings-seo":
        return <SettingsPage section="seo" />;
      case "system/settings-payment":
        return <SettingsPage section="payment" />;
      case "system/settings-email":
        return <SettingsPage section="email" />;
      case "system/settings-integrations":
        return <SettingsPage section="integrations" />;

      default:
        return <DashboardPage mode="dashboard" onNavigate={setActiveRoute} />;
    }
  };

  return (
    <AdminShell
      activeRoute={activeRoute}
      onNavigate={setActiveRoute}
      onBackToStore={onBackToStore}
      locale={locale}
      onLocaleChange={setLocale}
    >
      {renderPage()}
    </AdminShell>
  );
}

export function AdminApp({ onBackToStore }: { onBackToStore: () => void }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AdminAuthProvider>
        <AdminWorkspace onBackToStore={onBackToStore} />
      </AdminAuthProvider>
    </QueryClientProvider>
  );
}
