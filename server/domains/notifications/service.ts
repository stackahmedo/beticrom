import { getDb } from "../../db/client.js";

export type NotificationEventType =
  | "new_order"
  | "new_registration"
  | "low_stock"
  | "out_of_stock"
  | "payment_failed"
  | "return_requested"
  | "vendor_application"
  | "delivery_failed"
  | "support_ticket"
  | "contact_message"
  | "system";

export async function createAdminNotification(params: {
  eventType: NotificationEventType;
  severity?: "info" | "warning" | "error" | "success";
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  requiredPermission?: string;
  recipientUserId?: string | null;
}): Promise<void> {
  const db = await getDb();
  await db.query(
    `INSERT INTO notifications (
      recipient_user_id, required_permission, event_type, severity,
      title, message, entity_type, entity_id, action_url
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      params.recipientUserId ?? null,
      params.requiredPermission ?? null,
      params.eventType,
      params.severity ?? "info",
      params.title,
      params.message,
      params.entityType ?? null,
      params.entityId ?? null,
      params.actionUrl ?? null,
    ]
  );
}
