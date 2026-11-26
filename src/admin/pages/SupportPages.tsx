import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { apiRequest } from "../api/client";
import { PageHeader, StatusBadge } from "../components/AdminPrimitives";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";

export function SupportPage({ mode }: { mode: "messages" | "tickets" | "notifications" }) {
  const qc = useQueryClient();
  const [reply, setReply] = useState("");
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);

  const endpoint =
    mode === "messages"
      ? "/api/v1/admin/support/contact-messages"
      : mode === "tickets"
        ? "/api/v1/admin/support/tickets"
        : "/api/v1/admin/support/notifications?limit=50";

  const q = useQuery({
    queryKey: ["admin-support", mode],
    queryFn: () => apiRequest<{ data: Array<Record<string, unknown>> }>(endpoint),
  });

  const ticketDetailQ = useQuery({
    queryKey: ["admin-ticket-detail", activeTicketId],
    queryFn: () => apiRequest<{ data: Record<string, unknown> }>(`/api/v1/admin/support/tickets/${activeTicketId}`),
    enabled: Boolean(activeTicketId),
  });

  const markAllRead = useMutation({
    mutationFn: () => apiRequest("/api/v1/admin/support/notifications/read-all", { method: "POST" }),
    onSuccess: () => {
      toast.success("All marked as read");
      void qc.invalidateQueries({ queryKey: ["admin-support"] });
      void qc.invalidateQueries({ queryKey: ["admin-notifications-bell"] });
    },
  });

  const sendTicketMsg = useMutation({
    mutationFn: () =>
      apiRequest(`/api/v1/admin/support/tickets/${activeTicketId}/messages`, {
        method: "POST",
        body: JSON.stringify({ body: reply }),
      }),
    onSuccess: () => {
      setReply("");
      toast.success("Reply sent");
      void qc.invalidateQueries({ queryKey: ["admin-ticket-detail", activeTicketId] });
    },
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title={mode === "messages" ? "Contact Messages" : mode === "tickets" ? "Support Tickets" : "Notifications"}
        actions={
          mode === "notifications" ? (
            <Button size="sm" variant="outline" onClick={() => markAllRead.mutate()} className="h-8 text-xs gap-1">
              <CheckCheck size={13} /> Mark All Read
            </Button>
          ) : null
        }
      />

      <div className="bg-card border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/50 border-b border-border text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-2">{mode === "notifications" ? "Event" : "Subject"}</th>
              <th className="text-left px-3 py-2">{mode === "notifications" ? "Message" : "Sender"}</th>
              <th className="text-left px-3 py-2">Status</th>
              <th className="text-right px-3 py-2">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(q.data?.data || []).length === 0 ? (
              <tr><td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">No records found.</td></tr>
            ) : (
              (q.data?.data || []).map((r) => (
                <tr
                  key={String(r.id)}
                  onClick={() => mode === "tickets" && setActiveTicketId(String(r.id))}
                  className={mode === "tickets" ? "cursor-pointer hover:bg-muted/40" : ""}
                >
                  <td className="px-3 py-2 font-medium">{String(r.subject || r.title)}</td>
                  <td className="px-3 py-2 text-muted-foreground">{String(r.sender_name || r.requester_name || r.message)}</td>
                  <td className="px-3 py-2">
                    <StatusBadge status={String(r.status || (r.is_read ? "read" : "unread"))} />
                  </td>
                  <td className="px-3 py-2 text-right text-muted-foreground">
                    {new Date(String(r.created_at)).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {activeTicketId && ticketDetailQ.data?.data && (
        <div className="bg-card border border-border rounded-lg p-4 space-y-3 text-xs">
          <p className="font-semibold">Ticket Thread: {String(ticketDetailQ.data.data.ticket_number)}</p>
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {((ticketDetailQ.data.data.messages || []) as Array<Record<string, unknown>>).map((m) => (
              <div key={String(m.id)} className="p-2.5 rounded bg-muted/50">
                <p className="font-semibold">{String(m.sender_name)} ({String(m.sender_type)})</p>
                <p className="mt-0.5">{String(m.body)}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Type reply..." className="h-8 text-xs" />
            <Button size="sm" className="h-8 text-xs" onClick={() => sendTicketMsg.mutate()}>Send</Button>
          </div>
        </div>
      )}
    </div>
  );
}
