import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Download, ShieldAlert, Plus } from "lucide-react";
import { toast } from "sonner";
import { apiRequest } from "../api/client";
import { DataTable } from "../components/DataTable";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { PageHeader, StatusBadge, formatMoney } from "../components/AdminPrimitives";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";

export function CustomersPage({ mode }: { mode: "customers" | "groups" }) {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [anonId, setAnonId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState("");
  const [groupSlug, setGroupSlug] = useState("");

  const q = useQuery({
    queryKey: ["admin-customers", mode, page, search],
    queryFn: () =>
      apiRequest<{ data: Array<Record<string, unknown>>; meta?: { page: number; totalPages: number; total: number } }>(
        mode === "groups"
          ? "/api/v1/admin/customers/groups"
          : `/api/v1/admin/customers?page=${page}&limit=25&search=${encodeURIComponent(search)}`
      ),
  });

  const createGroup = useMutation({
    mutationFn: () =>
      apiRequest("/api/v1/admin/customers/groups", {
        method: "POST",
        body: JSON.stringify({ name: groupName, slug: groupSlug || groupName.toLowerCase().replace(/\s+/g, "-") }),
      }),
    onSuccess: () => {
      toast.success("Customer group created");
      setGroupName("");
      setGroupSlug("");
      void qc.invalidateQueries({ queryKey: ["admin-customers"] });
    },
  });

  const anonymizeMut = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/v1/admin/customers/${id}/gdpr-anonymize`, { method: "POST" }),
    onSuccess: () => {
      toast.success("Customer personal data anonymized");
      setAnonId(null);
      void qc.invalidateQueries({ queryKey: ["admin-customers"] });
    },
  });

  if (mode === "groups") {
    return (
      <div className="space-y-4">
        <PageHeader title="Customer Groups" />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createGroup.mutate();
          }}
          className="bg-card border border-border rounded-lg p-3 flex flex-wrap items-end gap-2"
        >
          <div>
            <Label className="text-[11px]">Group Name</Label>
            <Input required value={groupName} onChange={(e) => setGroupName(e.target.value)} className="h-8 text-xs w-52 mt-1" />
          </div>
          <div>
            <Label className="text-[11px]">Slug</Label>
            <Input value={groupSlug} onChange={(e) => setGroupSlug(e.target.value)} className="h-8 text-xs w-40 mt-1" />
          </div>
          <Button type="submit" size="sm" className="h-8 text-xs gap-1"><Plus size={13} /> Add Group</Button>
        </form>
        <div className="bg-card border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">Name</th>
                <th className="text-left px-3 py-2">Slug</th>
                <th className="text-right px-3 py-2">Members</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(q.data?.data || []).map((g) => (
                <tr key={String(g.id)}>
                  <td className="px-3 py-2 font-medium">{String(g.name)}</td>
                  <td className="px-3 py-2 font-mono">{String(g.slug)}</td>
                  <td className="px-3 py-2 text-right">{String(g.member_count || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const cols: ColumnDef<Record<string, unknown>, unknown>[] = [
    { accessorKey: "customer_code", header: "Code", cell: ({ row }) => <span className="font-mono">{String(row.original.customer_code)}</span> },
    { accessorKey: "full_name", header: "Customer" },
    { accessorKey: "email", header: "Email" },
    { accessorKey: "total_orders_count", header: "Orders" },
    { accessorKey: "total_spent_amount", header: "Total Spent", cell: ({ row }) => formatMoney(row.original.total_spent_amount as number) },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={String(row.original.status)} /> },
    {
      id: "gdpr",
      header: "Privacy / GDPR",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={() => window.open(`/api/v1/admin/customers/${row.original.id}/gdpr-export`, "_blank")}
            title="Export Personal Data"
          >
            <Download size={12} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-red-600"
            onClick={() => setAnonId(String(row.original.id))}
            title="GDPR Anonymize"
          >
            <ShieldAlert size={12} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Customers" description="Customer CRM, lifetime spend, and GDPR data export/anonymization." />
      <div className="bg-card border border-border rounded-lg p-3">
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search name, email, customer code..."
          className="h-8 text-xs max-w-xs"
        />
      </div>
      <DataTable
        columns={cols}
        data={q.data?.data || []}
        loading={q.isLoading}
        page={page}
        totalPages={q.data?.meta?.totalPages || 1}
        total={q.data?.meta?.total}
        onPageChange={setPage}
      />
      <ConfirmDialog
        open={Boolean(anonId)}
        onOpenChange={(o) => !o && setAnonId(null)}
        title="Anonymize Customer Personal Data"
        description="This permanently scrubs the customer's PII (name, email, phone, saved addresses) while keeping financial order records intact."
        confirmLabel="Anonymize"
        onConfirm={() => {
          if (anonId) anonymizeMut.mutate(anonId);
        }}
      />
    </div>
  );
}

export function VendorsAndTeamPage({ mode }: { mode: "vendors" | "applications" | "payouts" | "team" }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [extra, setExtra] = useState("");

  const endpoint =
    mode === "vendors"
      ? "/api/v1/admin/vendors"
      : mode === "applications"
        ? "/api/v1/admin/vendors/applications"
        : mode === "payouts"
          ? "/api/v1/admin/vendors/payouts"
          : "/api/v1/admin/cms/team";

  const q = useQuery({
    queryKey: ["admin-people-ext", mode],
    queryFn: () => apiRequest<{ data: Array<Record<string, unknown>> }>(endpoint),
  });

  const createMut = useMutation({
    mutationFn: () => {
      if (mode === "vendors") {
        return apiRequest("/api/v1/admin/vendors", {
          method: "POST",
          body: JSON.stringify({ businessName: name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), email, commissionRate: Number(extra || 10) }),
        });
      }
      return apiRequest("/api/v1/admin/cms/team", {
        method: "POST",
        body: JSON.stringify({ fullName: name, roleTitle: extra || "Team Member", email: email || undefined }),
      });
    },
    onSuccess: () => {
      toast.success("Created");
      setName("");
      setEmail("");
      setExtra("");
      void qc.invalidateQueries({ queryKey: ["admin-people-ext", mode] });
    },
  });

  const decideApp = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: "approved" | "rejected" }) =>
      apiRequest(`/api/v1/admin/vendors/applications/${id}/decision`, {
        method: "POST",
        body: JSON.stringify({ decision }),
      }),
    onSuccess: () => {
      toast.success("Vendor application updated");
      void qc.invalidateQueries({ queryKey: ["admin-people-ext"] });
    },
  });

  return (
    <div className="space-y-4">
      <PageHeader title={mode === "applications" ? "Vendor Applications" : mode === "payouts" ? "Vendor Payouts" : mode === "team" ? "Team Members" : "Vendors"} />

      {(mode === "vendors" || mode === "team") && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMut.mutate();
          }}
          className="bg-card border border-border rounded-lg p-3 flex flex-wrap items-end gap-2"
        >
          <div>
            <Label className="text-[11px]">{mode === "vendors" ? "Business Name" : "Full Name"}</Label>
            <Input required value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-xs w-48 mt-1" />
          </div>
          <div>
            <Label className="text-[11px]">Email</Label>
            <Input type="email" required={mode === "vendors"} value={email} onChange={(e) => setEmail(e.target.value)} className="h-8 text-xs w-48 mt-1" />
          </div>
          <div>
            <Label className="text-[11px]">{mode === "vendors" ? "Commission %" : "Role Title"}</Label>
            <Input value={extra} onChange={(e) => setExtra(e.target.value)} className="h-8 text-xs w-36 mt-1" />
          </div>
          <Button type="submit" size="sm" className="h-8 text-xs gap-1"><Plus size={13} /> Add</Button>
        </form>
      )}

      <div className="bg-card border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/50 border-b border-border text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-2">Name / Payout #</th>
              <th className="text-left px-3 py-2">Details</th>
              <th className="text-left px-3 py-2">Status</th>
              <th className="text-right px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(q.data?.data || []).length === 0 ? (
              <tr><td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">No records found.</td></tr>
            ) : (
              (q.data?.data || []).map((r) => (
                <tr key={String(r.id)}>
                  <td className="px-3 py-2 font-medium">{String(r.business_name || r.full_name || r.payout_number)}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {mode === "payouts"
                      ? `Net: ${formatMoney(r.net_amount as number)} (Comm: ${formatMoney(r.commission_amount as number)})`
                      : String(r.email || r.role_title || "")}
                  </td>
                  <td className="px-3 py-2"><StatusBadge status={String(r.status || (r.is_active ? "active" : "inactive"))} /></td>
                  <td className="px-3 py-2 text-right space-x-1">
                    {mode === "applications" && r.status === "submitted" && (
                      <>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => decideApp.mutate({ id: String(r.id), decision: "approved" })}>Approve</Button>
                        <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => decideApp.mutate({ id: String(r.id), decision: "rejected" })}>Reject</Button>
                      </>
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
