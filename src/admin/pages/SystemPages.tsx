import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, Printer, Plus, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { apiRequest } from "../api/client";
import { useAdminAuth } from "../auth/AuthContext";
import { PageHeader, StatusBadge } from "../components/AdminPrimitives";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Switch } from "@/app/components/ui/switch";

const REPORT_TYPES = [
  "sales", "orders", "inventory", "products", "customers", "vendors",
  "payments", "refunds", "shipping", "tax", "discounts",
] as const;

export function ReportsPage() {
  const [reportType, setReportType] = useState<string>("sales");
  const q = useQuery({
    queryKey: ["admin-report", reportType],
    queryFn: () =>
      apiRequest<{ data: { type: string; rows: Array<Record<string, unknown>> } }>(
        `/api/v1/admin/analytics/reports?type=${reportType}`
      ),
  });

  const rows = q.data?.data.rows || [];
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Reports & Financial Reconciliation"
        description="Reconciled sales, tax, COGS, inventory valuation, payment, and refund reports."
        actions={
          <>
            <Button size="sm" variant="outline" onClick={() => window.print()} className="h-8 text-xs gap-1">
              <Printer size={13} /> Print
            </Button>
            <Button
              size="sm"
              onClick={() => window.open(`/api/v1/admin/analytics/reports?type=${reportType}&format=csv`, "_blank")}
              className="h-8 text-xs gap-1"
            >
              <Download size={13} /> Export CSV
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap gap-1.5">
        {REPORT_TYPES.map((t) => (
          <Button
            key={t}
            size="sm"
            variant={reportType === t ? "default" : "outline"}
            onClick={() => setReportType(t)}
            className="h-7 text-xs capitalize"
          >
            {t}
          </Button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-lg overflow-x-auto">
        {rows.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">No records for this report period.</div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground">
              <tr>
                {headers.map((h) => (
                  <th key={h} className="text-left px-3 py-2 capitalize">{h.replace(/_/g, " ")}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r, i) => (
                <tr key={i}>
                  {headers.map((h) => (
                    <td key={h} className="px-3 py-2 font-mono">{String(r[h] ?? "")}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export function RbacAndAuditPage({ mode }: { mode: "users" | "roles" | "permissions" | "audit-logs" }) {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState("");

  const q = useQuery({
    queryKey: ["admin-rbac", mode],
    queryFn: () => apiRequest<{ data: Array<Record<string, unknown>> }>(`/api/v1/admin/rbac/${mode}`),
  });
  const rolesQ = useQuery({
    queryKey: ["admin-rbac-roles-list"],
    queryFn: () => apiRequest<{ data: Array<{ id: string; name: string; slug: string }> }>("/api/v1/admin/rbac/roles"),
    enabled: mode === "users",
  });

  const createUser = useMutation({
    mutationFn: () =>
      apiRequest("/api/v1/admin/rbac/users", {
        method: "POST",
        body: JSON.stringify({ email, fullName, password, roleIds: [roleId] }),
      }),
    onSuccess: () => {
      toast.success("Admin user created");
      setEmail("");
      setFullName("");
      setPassword("");
      void qc.invalidateQueries({ queryKey: ["admin-rbac", "users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <PageHeader title={mode === "audit-logs" ? "Audit Logs" : mode.charAt(0).toUpperCase() + mode.slice(1)} />

      {mode === "users" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createUser.mutate();
          }}
          className="bg-card border border-border rounded-lg p-3 flex flex-wrap items-end gap-2"
        >
          <div>
            <Label className="text-[11px]">Full Name</Label>
            <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-8 text-xs w-44 mt-1" />
          </div>
          <div>
            <Label className="text-[11px]">Email</Label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-8 text-xs w-48 mt-1" />
          </div>
          <div>
            <Label className="text-[11px]">Password</Label>
            <Input type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} className="h-8 text-xs w-36 mt-1" />
          </div>
          <div>
            <Label className="text-[11px]">Role</Label>
            <select required value={roleId} onChange={(e) => setRoleId(e.target.value)} className="h-8 rounded-md border border-border bg-background px-2 text-xs block mt-1">
              <option value="">Select role...</option>
              {(rolesQ.data?.data || []).map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
          <Button type="submit" size="sm" className="h-8 text-xs gap-1"><Plus size={13} /> Add Admin</Button>
        </form>
      )}

      <div className="bg-card border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/50 border-b border-border text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-2">{mode === "audit-logs" ? "Action" : "Name / Key"}</th>
              <th className="text-left px-3 py-2">Details</th>
              <th className="text-left px-3 py-2">{mode === "audit-logs" ? "Timestamp" : "Status / Module"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(q.data?.data || []).map((r, i) => (
              <tr key={String(r.id || i)}>
                <td className="px-3 py-2 font-medium">{String(r.full_name || r.name || r.key || r.action)}</td>
                <td className="px-3 py-2 text-muted-foreground">
                  {mode === "users"
                    ? `${String(r.email)} · ${((r.roles as Array<{ name: string }>) || []).map((x) => x.name).join(", ")}`
                    : mode === "roles"
                      ? `${String(r.slug)} · ${((r.permission_keys as string[]) || []).length} permissions`
                      : mode === "audit-logs"
                        ? `${String(r.actor_email || "system")} · ${String(r.entity_type)}`
                        : String(r.description || "")}
                </td>
                <td className="px-3 py-2">
                  {mode === "audit-logs" ? (
                    new Date(String(r.created_at)).toLocaleString()
                  ) : mode === "users" ? (
                    <StatusBadge status={String(r.status)} />
                  ) : (
                    <span className="font-mono text-[11px]">{String(r.module || (r.is_system ? "System Role" : "Custom"))}</span>
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

export function SettingsPage({ section }: { section: "store" | "seo" | "payment" | "email" | "integrations" }) {
  const qc = useQueryClient();
  const { refreshFeatureFlags } = useAdminAuth();

  const q = useQuery({
    queryKey: ["admin-settings"],
    queryFn: () => apiRequest<{ data: Array<{ key: string; value: Record<string, unknown> }> }>("/api/v1/admin/settings"),
  });

  const paymentMethodsQ = useQuery({
    queryKey: ["admin-payment-methods"],
    queryFn: () => apiRequest<{ data: Array<Record<string, unknown>> }>("/api/v1/admin/payments/methods"),
    enabled: section === "payment",
  });

  const updateSetting = useMutation({
    mutationFn: ({ key, value }: { key: string; value: Record<string, unknown> }) =>
      apiRequest(`/api/v1/admin/settings/${key}`, { method: "PUT", body: JSON.stringify({ value }) }),
    onSuccess: async () => {
      toast.success("Settings saved");
      await qc.invalidateQueries({ queryKey: ["admin-settings"] });
      await refreshFeatureFlags();
    },
  });

  const settingsMap = Object.fromEntries((q.data?.data || []).map((s) => [s.key, s.value]));
  const featureFlags = (settingsMap["feature_flags"] || {}) as Record<string, boolean>;
  const storeProfile = (settingsMap["store.profile"] || {}) as Record<string, string>;
  const seoMeta = (settingsMap["store.seo"] || {}) as Record<string, string>;
  const maintenance = (settingsMap["store.maintenance"] || {}) as Record<string, unknown>;

  return (
    <div className="space-y-4 max-w-3xl">
      <PageHeader title={`${section.toUpperCase()} Settings`} description="Configurable store branding, locale, currency, feature flags, and integrations." />

      {section === "store" && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-lg p-4 space-y-3 text-xs">
            <p className="font-semibold text-sm">Store Profile & Localization</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Store Name</Label>
                <Input
                  defaultValue={storeProfile.name}
                  onBlur={(e) =>
                    updateSetting.mutate({ key: "store.profile", value: { ...storeProfile, name: e.target.value } })
                  }
                  className="h-8 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Currency / Symbol</Label>
                <Input
                  defaultValue={`${storeProfile.currency || "JPY"} (${storeProfile.currencySymbol || "¥"})`}
                  readOnly
                  className="h-8 text-xs mt-1 bg-muted"
                />
              </div>
              <div>
                <Label className="text-xs">Contact Email</Label>
                <Input
                  defaultValue={storeProfile.contactEmail}
                  onBlur={(e) =>
                    updateSetting.mutate({ key: "store.profile", value: { ...storeProfile, contactEmail: e.target.value } })
                  }
                  className="h-8 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Timezone</Label>
                <Input
                  defaultValue={storeProfile.timezone || "Asia/Tokyo"}
                  onBlur={(e) =>
                    updateSetting.mutate({ key: "store.profile", value: { ...storeProfile, timezone: e.target.value } })
                  }
                  className="h-8 text-xs mt-1"
                />
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4 space-y-3 text-xs">
            <p className="font-semibold text-sm flex items-center gap-1.5">
              <ShieldCheck size={15} className="text-primary" /> Feature Flags & Maintenance Mode
            </p>
            <div className="flex items-center justify-between py-1">
              <div>
                <p className="font-medium">Multi-Vendor Marketplace Mode</p>
                <p className="text-[11px] text-muted-foreground">Enables Vendors, Vendor Applications, and Vendor Payouts modules.</p>
              </div>
              <Switch
                checked={Boolean(featureFlags.multi_vendor_enabled)}
                onCheckedChange={(checked) =>
                  updateSetting.mutate({
                    key: "feature_flags",
                    value: { ...featureFlags, multi_vendor_enabled: checked },
                  })
                }
              />
            </div>
            <div className="flex items-center justify-between py-1">
              <div>
                <p className="font-medium">Maintenance Mode</p>
                <p className="text-[11px] text-muted-foreground">Shows maintenance banner on public storefront.</p>
              </div>
              <Switch
                checked={Boolean(maintenance.enabled)}
                onCheckedChange={(checked) =>
                  updateSetting.mutate({
                    key: "store.maintenance",
                    value: { ...maintenance, enabled: checked },
                  })
                }
              />
            </div>
          </div>
        </div>
      )}

      {section === "seo" && (
        <div className="bg-card border border-border rounded-lg p-4 space-y-3 text-xs">
          <div>
            <Label className="text-xs">Default Meta Title</Label>
            <Input
              defaultValue={seoMeta.metaTitle}
              onBlur={(e) => updateSetting.mutate({ key: "store.seo", value: { ...seoMeta, metaTitle: e.target.value } })}
              className="h-8 text-xs mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Default Meta Description</Label>
            <Input
              defaultValue={seoMeta.metaDescription}
              onBlur={(e) =>
                updateSetting.mutate({ key: "store.seo", value: { ...seoMeta, metaDescription: e.target.value } })
              }
              className="h-8 text-xs mt-1"
            />
          </div>
        </div>
      )}

      {section === "payment" && (
        <div className="bg-card border border-border rounded-lg divide-y divide-border text-xs">
          {(paymentMethodsQ.data?.data || []).map((pm) => (
            <div key={String(pm.id)} className="p-3.5 flex items-center justify-between">
              <div>
                <p className="font-semibold">{String(pm.name)}</p>
                <p className="text-[11px] text-muted-foreground">{String(pm.description || pm.provider)}</p>
              </div>
              <Switch
                checked={Boolean(pm.is_enabled)}
                onCheckedChange={async (checked) => {
                  await apiRequest(`/api/v1/admin/payments/methods/${pm.id}`, {
                    method: "PATCH",
                    body: JSON.stringify({ isEnabled: checked }),
                  });
                  toast.success("Payment method updated");
                  void qc.invalidateQueries({ queryKey: ["admin-payment-methods"] });
                }}
              />
            </div>
          ))}
        </div>
      )}

      {(section === "email" || section === "integrations") && (
        <div className="bg-card border border-border rounded-lg p-4 space-y-2 text-xs">
          <p className="font-semibold">Configured Environment Integrations</p>
          <p className="text-muted-foreground">
            Secrets (Cloudflare R2, Resend API Key, Stripe/PayPay Webhook Secrets, Database URL) are managed strictly server-side via environment variables and never exposed to the browser.
          </p>
        </div>
      )}
    </div>
  );
}
