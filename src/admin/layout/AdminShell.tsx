import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  PanelLeftClose, PanelLeftOpen, Menu, Search, Bell, Sun, Moon, Monitor,
  ChevronRight, ChevronDown, LogOut, KeyRound, ShieldCheck, Store, CheckCheck, Globe,
} from "lucide-react";
import { toast } from "sonner";
import { ADMIN_NAV_GROUPS, findNavMeta, type AdminLocale } from "../config/navigation";
import { useAdminAuth } from "../auth/AuthContext";
import { apiRequest } from "../api/client";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/app/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/app/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { Label } from "@/app/components/ui/label";

interface AdminShellProps {
  activeRoute: string;
  onNavigate: (routeId: string) => void;
  onBackToStore: () => void;
  locale: AdminLocale;
  onLocaleChange: (l: AdminLocale) => void;
  children: React.ReactNode;
}

export function AdminShell({
  activeRoute,
  onNavigate,
  onBackToStore,
  locale,
  onLocaleChange,
  children,
}: AdminShellProps) {
  const { user, multiVendorEnabled, hasPermission, logout } = useAdminAuth();
  const qc = useQueryClient();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [themeMode, setThemeMode] = useState<"light" | "dark" | "system">("light");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [mfaOpen, setMfaOpen] = useState(false);

  const meta = findNavMeta(activeRoute, locale);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    dashboard: true,
    orders: true,
    products: true,
  });

  useEffect(() => {
    setExpandedGroups((prev) => ({ ...prev, [meta.groupId]: true }));
  }, [meta.groupId]);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [mfaSecret, setMfaSecret] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [mfaCode, setMfaCode] = useState("");

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const applyTheme = (mode: "light" | "dark" | "system") => {
    setThemeMode(mode);
    const isDark =
      mode === "dark" || (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", isDark);
  };

  const searchRes = useQuery({
    queryKey: ["admin-global-search", searchQuery],
    queryFn: () =>
      apiRequest<{
        data: {
          products: Array<{ id: string; sku: string; name: string; status: string }>;
          orders: Array<{ id: string; order_number: string; customer_name: string; status: string }>;
          customers: Array<{ id: string; customer_code: string; full_name: string; email: string }>;
        };
      }>(`/api/v1/admin/search?q=${encodeURIComponent(searchQuery)}`),
    enabled: searchQuery.trim().length >= 2,
  });

  const notifRes = useQuery({
    queryKey: ["admin-notifications-bell"],
    queryFn: () =>
      apiRequest<{
        data: Array<{ id: string; title: string; message: string; is_read: boolean; action_url: string | null; created_at: string }>;
        meta: { unreadCount: number };
      }>("/api/v1/admin/support/notifications?limit=10"),
    enabled: hasPermission("notifications.read"),
    refetchInterval: 30_000,
  });

  const markAllRead = useMutation({
    mutationFn: () => apiRequest("/api/v1/admin/support/notifications/read-all", { method: "POST" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-notifications-bell"] });
      toast.success(locale === "JA" ? "すべて既読にしました" : "All notifications marked as read");
    },
  });

  const visibleGroups = ADMIN_NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (item.featureFlag === "multi_vendor_enabled" && !multiVendorEnabled) return false;
      return hasPermission(item.permission);
    }),
  })).filter((g) => g.items.length > 0);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const renderSidebarNav = (isMobile = false) => (
    <div className="flex flex-col h-full bg-[#0F172A] text-slate-200 select-none">
      {/* Brand header */}
      <div className="h-14 px-3 flex items-center justify-between border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-8 h-8 rounded-md bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
            B
          </div>
          {(!collapsed || isMobile) && (
            <div className="truncate">
              <p className="text-xs font-semibold text-white truncate">Beticrom Admin</p>
              <p className="text-[10px] text-slate-400 truncate">Commerce & CMS</p>
            </div>
          )}
        </div>
        {!isMobile && (
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
          </button>
        )}
      </div>

      {/* 12 Collapsible Primary Groups */}
      <nav aria-label="Admin Navigation" className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
        {visibleGroups.map((group) => {
          const GroupIcon = group.icon;
          const isSingle = group.items.length === 1;
          const isExpanded = Boolean(expandedGroups[group.id]);
          const isGroupActive = group.items.some((i) => i.id === activeRoute);

          if (isSingle) {
            const only = group.items[0];
            return (
              <button
                key={group.id}
                type="button"
                title={collapsed && !isMobile ? (locale === "JA" ? group.labelJa : group.label) : undefined}
                onClick={() => {
                  onNavigate(only.id);
                  if (isMobile) setMobileOpen(false);
                }}
                className={`w-full min-h-[38px] flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] font-medium transition-colors cursor-pointer ${
                  isGroupActive
                    ? "bg-emerald-600 text-white"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                } ${collapsed && !isMobile ? "justify-center px-0" : ""}`}
              >
                <GroupIcon size={16} className="shrink-0" />
                {(!collapsed || isMobile) && (
                  <span className="truncate">{locale === "JA" ? group.labelJa : group.label}</span>
                )}
              </button>
            );
          }

          return (
            <div key={group.id} className="space-y-0.5">
              <button
                type="button"
                title={collapsed && !isMobile ? (locale === "JA" ? group.labelJa : group.label) : undefined}
                onClick={() => {
                  if (collapsed && !isMobile) {
                    onNavigate(group.items[0].id);
                  } else {
                    toggleGroup(group.id);
                  }
                }}
                aria-expanded={isExpanded}
                className={`w-full min-h-[38px] flex items-center justify-between px-2.5 py-1.5 rounded-md text-[13px] font-medium transition-colors cursor-pointer ${
                  isGroupActive ? "text-white bg-white/10" : "text-slate-300 hover:bg-white/10 hover:text-white"
                } ${collapsed && !isMobile ? "justify-center px-0" : ""}`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <GroupIcon size={16} className="shrink-0" />
                  {(!collapsed || isMobile) && (
                    <span className="truncate">{locale === "JA" ? group.labelJa : group.label}</span>
                  )}
                </span>
                {(!collapsed || isMobile) &&
                  (isExpanded ? <ChevronDown size={13} className="opacity-60" /> : <ChevronRight size={13} className="opacity-60" />)}
              </button>

              {(!collapsed || isMobile) && isExpanded && (
                <div className="pl-4 space-y-0.5 border-l border-white/10 ml-3.5">
                  {group.items.map((item) => {
                    const active = activeRoute === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          onNavigate(item.id);
                          if (isMobile) setMobileOpen(false);
                        }}
                        className={`w-full min-h-[34px] flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                          active
                            ? "bg-emerald-600 text-white"
                            : "text-slate-400 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <span className="truncate">{locale === "JA" ? item.labelJa : item.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom Storefront Link */}
      <div className="p-2 border-t border-white/10 shrink-0">
        <button
          type="button"
          onClick={onBackToStore}
          className={`w-full min-h-[40px] flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white cursor-pointer ${
            collapsed && !isMobile ? "justify-center px-0" : ""
          }`}
        >
          <Store size={15} className="shrink-0" />
          {(!collapsed || isMobile) && <span>{locale === "JA" ? "ストア画面へ" : "View Storefront"}</span>}
        </button>
      </div>
    </div>
  );

  const unreadCount = notifRes.data?.meta?.unreadCount ?? 0;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#F8FAFC] dark:bg-zinc-950 text-foreground">
      {/* Desktop Sidebar (240px / 64px) */}
      <aside className={`hidden md:block shrink-0 transition-[width] duration-150 border-r border-border ${collapsed ? "w-16" : "w-60"}`}>
        {renderSidebarNav(false)}
      </aside>

      {/* Mobile Drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-64 border-r-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Admin Navigation</SheetTitle>
          </SheetHeader>
          {renderSidebarNav(true)}
        </SheetContent>
      </Sheet>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Sticky Top Header (56px) */}
        <header className="h-14 shrink-0 bg-card border-b border-border px-3 sm:px-5 flex items-center justify-between gap-2 z-20">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
              className="md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <Menu size={18} />
            </button>

            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs min-w-0 truncate">
              <span className="text-muted-foreground hidden sm:inline">{meta.group}</span>
              <ChevronRight size={13} className="text-muted-foreground hidden sm:inline shrink-0" />
              <span className="font-semibold text-foreground truncate">{meta.label}</span>
            </nav>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Global Command Palette */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchOpen(true)}
              className="h-8 px-2.5 text-xs text-muted-foreground gap-2 hidden sm:inline-flex"
            >
              <Search size={13} />
              <span>{locale === "JA" ? "検索 / コマンド..." : "Search / Jump..."}</span>
              <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-muted font-mono">Ctrl+K</kbd>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchOpen(true)}
              className="h-10 w-10 sm:hidden p-0"
              aria-label="Global search"
            >
              <Search size={16} />
            </Button>

            {/* EN / JA Locale Switcher */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onLocaleChange(locale === "EN" ? "JA" : "EN")}
              className="h-8 px-2 text-xs gap-1 font-medium"
              aria-label="Switch language"
            >
              <Globe size={14} />
              <span>{locale}</span>
            </Button>

            {/* Theme Selector (Light / Dark / System) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="Theme mode">
                  {themeMode === "dark" ? <Moon size={15} /> : themeMode === "system" ? <Monitor size={15} /> : <Sun size={15} />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36 text-xs">
                <DropdownMenuItem onClick={() => applyTheme("light")} className="gap-2 text-xs cursor-pointer">
                  <Sun size={13} /> Light
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => applyTheme("dark")} className="gap-2 text-xs cursor-pointer">
                  <Moon size={13} /> Dark
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => applyTheme("system")} className="gap-2 text-xs cursor-pointer">
                  <Monitor size={13} /> System
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Notification Center */}
            {hasPermission("notifications.read") && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 relative" aria-label="Notifications">
                    <Bell size={15} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 p-0">
                  <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
                    <span className="text-xs font-semibold">{locale === "JA" ? "通知" : "Notifications"}</span>
                    <button
                      type="button"
                      onClick={() => markAllRead.mutate()}
                      className="text-[11px] text-primary hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCheck size={12} />
                      {locale === "JA" ? "すべて既読" : "Mark all read"}
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-border">
                    {(notifRes.data?.data || []).length === 0 ? (
                      <p className="p-4 text-xs text-muted-foreground text-center">No notifications yet.</p>
                    ) : (
                      (notifRes.data?.data || []).map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            void apiRequest(`/api/v1/admin/support/notifications/${n.id}/read`, { method: "POST" }).then(() =>
                              qc.invalidateQueries({ queryKey: ["admin-notifications-bell"] })
                            );
                            onNavigate("support/notifications");
                          }}
                          className={`p-3 text-xs cursor-pointer hover:bg-muted/50 ${
                            !n.is_read ? "bg-emerald-50/40 dark:bg-emerald-950/20" : ""
                          }`}
                        >
                          <p className="font-medium text-foreground">{n.title}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="p-2 border-t border-border text-center">
                    <button
                      type="button"
                      onClick={() => onNavigate("support/notifications")}
                      className="text-[11px] font-medium text-primary hover:underline cursor-pointer"
                    >
                      View all notifications
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {/* Admin Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-muted cursor-pointer">
                  <div className="w-7 h-7 rounded-full bg-[#0F172A] text-white text-xs font-semibold flex items-center justify-center">
                    {(user?.fullName || "A").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="hidden lg:block text-left">
                    <p className="text-xs font-medium leading-none">{user?.fullName}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{user?.roles.join(", ")}</p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-xs">
                  <p className="font-semibold">{user?.fullName}</p>
                  <p className="text-[11px] font-normal text-muted-foreground">{user?.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setPwOpen(true)} className="text-xs gap-2 cursor-pointer">
                  <KeyRound size={13} /> Change Password
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={async () => {
                    try {
                      const res = await apiRequest<{ data: { secret: string; otpauthUrl: string } }>("/api/v1/auth/mfa/setup", { method: "POST" });
                      setMfaSecret(res.data);
                      setMfaOpen(true);
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Failed to initialize MFA");
                    }
                  }}
                  className="text-xs gap-2 cursor-pointer"
                >
                  <ShieldCheck size={13} /> Two-Factor Auth (MFA)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onBackToStore} className="text-xs gap-2 cursor-pointer">
                  <Store size={13} /> Storefront
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void logout()} className="text-xs gap-2 text-red-600 cursor-pointer">
                  <LogOut size={13} /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-5">{children}</main>
      </div>

      {/* Global Command Palette & Search Dialog */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm">Command Palette & Search</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search orders, SKUs, customers, or jump to a section..."
            className="text-xs h-9"
          />
          <div className="max-h-72 overflow-y-auto space-y-3 text-xs">
            {/* Quick Navigation Commands */}
            <div>
              <p className="text-[10px] font-semibold uppercase text-muted-foreground mb-1">Quick Navigation</p>
              <div className="grid grid-cols-2 gap-1">
                {visibleGroups
                  .flatMap((g) => g.items)
                  .filter(
                    (it) =>
                      !searchQuery.trim() ||
                      it.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      it.labelJa.includes(searchQuery)
                  )
                  .slice(0, 6)
                  .map((it) => (
                    <button
                      key={it.id}
                      type="button"
                      onClick={() => {
                        onNavigate(it.id);
                        setSearchOpen(false);
                      }}
                      className="text-left px-2.5 py-1.5 rounded hover:bg-muted cursor-pointer truncate"
                    >
                      → {locale === "JA" ? it.labelJa : it.label}
                    </button>
                  ))}
              </div>
            </div>

            {searchRes.data?.data.products.length ? (
              <div>
                <p className="text-[10px] font-semibold uppercase text-muted-foreground mb-1">Products</p>
                {searchRes.data.data.products.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      onNavigate("catalog/products");
                      setSearchOpen(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded hover:bg-muted flex justify-between cursor-pointer"
                  >
                    <span className="truncate">{p.name}</span>
                    <span className="font-mono text-muted-foreground">{p.sku}</span>
                  </button>
                ))}
              </div>
            ) : null}
            {searchRes.data?.data.orders.length ? (
              <div>
                <p className="text-[10px] font-semibold uppercase text-muted-foreground mb-1">Orders</p>
                {searchRes.data.data.orders.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => {
                      onNavigate("sales/orders");
                      setSearchOpen(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded hover:bg-muted flex justify-between cursor-pointer"
                  >
                    <span className="font-mono font-medium">{o.order_number}</span>
                    <span className="text-muted-foreground">{o.customer_name}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="text-sm">Change Password</DialogTitle></DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await apiRequest("/api/v1/auth/change-password", {
                  method: "POST",
                  body: JSON.stringify({ currentPassword, newPassword }),
                });
                toast.success("Password updated");
                setCurrentPassword("");
                setNewPassword("");
                setPwOpen(false);
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Failed");
              }
            }}
            className="space-y-3"
          >
            <div>
              <Label className="text-xs">Current Password</Label>
              <Input type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="text-xs h-8 mt-1" />
            </div>
            <div>
              <Label className="text-xs">New Password (min 8 chars)</Label>
              <Input type="password" minLength={8} required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="text-xs h-8 mt-1" />
            </div>
            <Button type="submit" className="w-full h-8 text-xs">Update Password</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* MFA Enrollment Dialog */}
      <Dialog open={mfaOpen} onOpenChange={setMfaOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="text-sm">Two-Factor Authentication (TOTP)</DialogTitle></DialogHeader>
          {mfaSecret && (
            <div className="space-y-3 text-xs">
              <p className="text-muted-foreground">Add this secret key to your authenticator app:</p>
              <div className="p-2.5 rounded bg-muted font-mono text-[11px] break-all">{mfaSecret.secret}</div>
              <div>
                <Label className="text-xs">Verify 6-digit code</Label>
                <Input value={mfaCode} onChange={(e) => setMfaCode(e.target.value)} maxLength={6} placeholder="123456" className="text-xs h-8 mt-1 font-mono" />
              </div>
              <Button
                className="w-full h-8 text-xs"
                onClick={async () => {
                  try {
                    await apiRequest("/api/v1/auth/mfa/enable", { method: "POST", body: JSON.stringify({ code: mfaCode }) });
                    toast.success("MFA enabled");
                    setMfaOpen(false);
                    setMfaCode("");
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Invalid code");
                  }
                }}
              >
                Enable MFA
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
