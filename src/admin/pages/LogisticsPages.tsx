import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { apiRequest } from "../api/client";
import { PageHeader, StatusBadge, formatMoney } from "../components/AdminPrimitives";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";

export function LogisticsPage({ mode }: { mode: "countries" | "regions" | "cities" | "zones" | "rates" | "couriers" | "shipments" }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [parentId, setParentId] = useState("");

  const q = useQuery({
    queryKey: ["admin-logistics", mode],
    queryFn: () => apiRequest<{ data: Array<Record<string, unknown>> }>(`/api/v1/admin/shipping/${mode}`),
  });

  const countriesQ = useQuery({
    queryKey: ["admin-logistics-countries"],
    queryFn: () => apiRequest<{ data: Array<{ id: string; name: string }> }>("/api/v1/admin/shipping/countries"),
    enabled: mode === "regions",
  });
  const regionsQ = useQuery({
    queryKey: ["admin-logistics-regions"],
    queryFn: () => apiRequest<{ data: Array<{ id: string; name: string }> }>("/api/v1/admin/shipping/regions"),
    enabled: mode === "cities",
  });
  const zonesQ = useQuery({
    queryKey: ["admin-logistics-zones"],
    queryFn: () => apiRequest<{ data: Array<{ id: string; name: string }> }>("/api/v1/admin/shipping/zones"),
    enabled: mode === "rates",
  });

  const createMut = useMutation({
    mutationFn: () => {
      if (mode === "countries") return apiRequest("/api/v1/admin/shipping/countries", { method: "POST", body: JSON.stringify({ code, name }) });
      if (mode === "regions") return apiRequest("/api/v1/admin/shipping/regions", { method: "POST", body: JSON.stringify({ countryId: parentId, code, name }) });
      if (mode === "cities") return apiRequest("/api/v1/admin/shipping/cities", { method: "POST", body: JSON.stringify({ regionId: parentId, name, postalCodePrefix: code }) });
      if (mode === "zones") return apiRequest("/api/v1/admin/shipping/zones", { method: "POST", body: JSON.stringify({ code, name }) });
      if (mode === "rates") return apiRequest("/api/v1/admin/shipping/rates", { method: "POST", body: JSON.stringify({ zoneId: parentId, name, rateType: "flat", baseRate: Number(code || 880) }) });
      return apiRequest("/api/v1/admin/shipping/couriers", { method: "POST", body: JSON.stringify({ code, name }) });
    },
    onSuccess: () => {
      toast.success("Saved");
      setName("");
      setCode("");
      void qc.invalidateQueries({ queryKey: ["admin-logistics", mode] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <PageHeader title={`Logistics: ${mode.charAt(0).toUpperCase() + mode.slice(1)}`} description="Configurable geographic hierarchy and multi-courier shipping rules." />

      {mode !== "shipments" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMut.mutate();
          }}
          className="bg-card border border-border rounded-lg p-3 flex flex-wrap items-end gap-2"
        >
          {(mode === "regions" || mode === "cities" || mode === "rates") && (
            <div>
              <Label className="text-[11px]">{mode === "regions" ? "Country" : mode === "cities" ? "Region" : "Shipping Zone"}</Label>
              <select required value={parentId} onChange={(e) => setParentId(e.target.value)} className="h-8 rounded-md border border-border bg-background px-2 text-xs block mt-1">
                <option value="">Select...</option>
                {(mode === "regions" ? countriesQ.data?.data : mode === "cities" ? regionsQ.data?.data : zonesQ.data?.data || [])?.map((x) => (
                  <option key={x.id} value={x.id}>{x.name}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <Label className="text-[11px]">{mode === "rates" ? "Base Rate (¥)" : mode === "cities" ? "Postal Prefix" : "Code"}</Label>
            <Input required={mode !== "cities"} value={code} onChange={(e) => setCode(e.target.value)} className="h-8 text-xs w-32 mt-1" />
          </div>
          <div>
            <Label className="text-[11px]">Name</Label>
            <Input required value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-xs w-52 mt-1" />
          </div>
          <Button type="submit" size="sm" className="h-8 text-xs gap-1"><Plus size={13} /> Add</Button>
        </form>
      )}

      <div className="bg-card border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/50 border-b border-border text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-2">Name / Shipment #</th>
              <th className="text-left px-3 py-2">Details</th>
              <th className="text-left px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(q.data?.data || []).map((r) => (
              <tr key={String(r.id)}>
                <td className="px-3 py-2 font-medium">{String(r.name || r.shipment_number)}</td>
                <td className="px-3 py-2 text-muted-foreground">
                  {mode === "rates"
                    ? `${String(r.zone_name)} · ${formatMoney(r.base_rate as number)}`
                    : mode === "shipments"
                      ? `Order ${String(r.order_number)} · ${String(r.courier_name || "")} · ${String(r.tracking_number || "No tracking")}`
                      : String(r.code || r.country_name || r.region_name || "")}
                </td>
                <td className="px-3 py-2"><StatusBadge status={String(r.status || (r.is_active ? "active" : "inactive"))} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
