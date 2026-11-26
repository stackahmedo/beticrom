import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { apiRequest } from "../api/client";
import { PageHeader, StatusBadge, formatMoney } from "../components/AdminPrimitives";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";

export function MarketingPage({ mode }: { mode: "offers" | "coupons" | "flash-sales" | "campaigns" | "reviews" }) {
  const qc = useQueryClient();
  const [nameOrCode, setNameOrCode] = useState("");
  const [value, setValue] = useState("10");
  const [type, setType] = useState("percentage");
  const [replyText, setReplyText] = useState<Record<string, string>>({});

  const q = useQuery({
    queryKey: ["admin-marketing", mode],
    queryFn: () => apiRequest<{ data: Array<Record<string, unknown>> }>(`/api/v1/admin/marketing/${mode}`),
  });

  const createMut = useMutation({
    mutationFn: () => {
      if (mode === "coupons") {
        return apiRequest("/api/v1/admin/marketing/coupons", {
          method: "POST",
          body: JSON.stringify({ code: nameOrCode, discountType: type, discountValue: Number(value) }),
        });
      }
      if (mode === "offers") {
        return apiRequest("/api/v1/admin/marketing/offers", {
          method: "POST",
          body: JSON.stringify({ name: nameOrCode, promotionType: type, discountValue: Number(value) }),
        });
      }
      if (mode === "flash-sales") {
        return apiRequest("/api/v1/admin/marketing/flash-sales", {
          method: "POST",
          body: JSON.stringify({
            name: nameOrCode,
            startsAt: new Date().toISOString(),
            endsAt: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
            status: "active",
          }),
        });
      }
      return apiRequest("/api/v1/admin/marketing/campaigns", {
        method: "POST",
        body: JSON.stringify({ name: nameOrCode, budgetAmount: Number(value) }),
      });
    },
    onSuccess: () => {
      toast.success("Saved");
      setNameOrCode("");
      void qc.invalidateQueries({ queryKey: ["admin-marketing", mode] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const modReview = useMutation({
    mutationFn: ({ id, status, merchantReply }: { id: string; status?: string; merchantReply?: string }) =>
      apiRequest(`/api/v1/admin/marketing/reviews/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status, merchantReply }),
      }),
    onSuccess: () => {
      toast.success("Review updated");
      void qc.invalidateQueries({ queryKey: ["admin-marketing", "reviews"] });
    },
  });

  return (
    <div className="space-y-4">
      <PageHeader title={mode.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} />

      {mode !== "reviews" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMut.mutate();
          }}
          className="bg-card border border-border rounded-lg p-3 flex flex-wrap items-end gap-2"
        >
          <div>
            <Label className="text-[11px]">{mode === "coupons" ? "Coupon Code" : "Name"}</Label>
            <Input required value={nameOrCode} onChange={(e) => setNameOrCode(e.target.value)} className="h-8 text-xs w-48 mt-1" />
          </div>
          {(mode === "coupons" || mode === "offers") && (
            <>
              <div>
                <Label className="text-[11px]">Type</Label>
                <select value={type} onChange={(e) => setType(e.target.value)} className="h-8 rounded-md border border-border bg-background px-2 text-xs block mt-1">
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (¥)</option>
                  <option value="free_shipping">Free Shipping</option>
                </select>
              </div>
              <div>
                <Label className="text-[11px]">Value</Label>
                <Input type="number" min={0} value={value} onChange={(e) => setValue(e.target.value)} className="h-8 text-xs w-28 mt-1" />
              </div>
            </>
          )}
          <Button type="submit" size="sm" className="h-8 text-xs gap-1"><Plus size={13} /> Create</Button>
        </form>
      )}

      <div className="bg-card border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/50 border-b border-border text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-2">{mode === "reviews" ? "Product & Review" : "Name / Code"}</th>
              <th className="text-left px-3 py-2">Details</th>
              <th className="text-left px-3 py-2">Status</th>
              <th className="text-right px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(q.data?.data || []).length === 0 ? (
              <tr><td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">No records yet.</td></tr>
            ) : (
              (q.data?.data || []).map((r) => (
                <tr key={String(r.id)}>
                  <td className="px-3 py-2 font-medium">
                    {mode === "reviews" ? (
                      <div>
                        <p className="font-semibold">{String(r.product_name)} ({String(r.rating)}★)</p>
                        <p className="text-muted-foreground">{String(r.review_text)}</p>
                      </div>
                    ) : (
                      <span className="font-mono">{String(r.code || r.name)}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {mode === "coupons"
                      ? `${String(r.discount_type)} · ${String(r.discount_value)} · Used ${String(r.usage_count)}`
                      : mode === "offers"
                        ? `${String(r.promotion_type)} · ${String(r.discount_value)}`
                        : mode === "campaigns"
                          ? `Budget: ${formatMoney(r.budget_amount as number)}`
                          : String(r.reviewer_name || "")}
                  </td>
                  <td className="px-3 py-2"><StatusBadge status={String(r.status || (r.is_active ? "active" : "inactive"))} /></td>
                  <td className="px-3 py-2 text-right">
                    {mode === "reviews" && (
                      <div className="flex items-center justify-end gap-1">
                        <Input
                          value={replyText[String(r.id)] || ""}
                          onChange={(e) => setReplyText((p) => ({ ...p, [String(r.id)]: e.target.value }))}
                          placeholder="Reply..."
                          className="h-7 text-xs w-36"
                        />
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => modReview.mutate({ id: String(r.id), status: "published", merchantReply: replyText[String(r.id)] || undefined })}>
                          Publish
                        </Button>
                        <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => modReview.mutate({ id: String(r.id), status: "rejected" })}>
                          Reject
                        </Button>
                      </div>
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
