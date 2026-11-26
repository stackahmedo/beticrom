export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "packed"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "completed"
  | "cancelled"
  | "delivery_failed"
  | "returned";

export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["packed", "cancelled"],
  packed: ["shipped", "cancelled"],
  shipped: ["out_for_delivery", "delivered", "delivery_failed"],
  out_for_delivery: ["delivered", "delivery_failed"],
  delivered: ["completed", "returned"],
  delivery_failed: ["shipped", "out_for_delivery", "cancelled", "returned"],
  completed: ["returned"],
  cancelled: [],
  returned: [],
};

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  if (from === to) return false;
  return (ORDER_TRANSITIONS[from] || []).includes(to);
}

export type ReturnStatus =
  | "return_requested"
  | "under_review"
  | "approved"
  | "rejected"
  | "product_received"
  | "inspected"
  | "refund_or_replacement"
  | "completed";

export const RETURN_TRANSITIONS: Record<ReturnStatus, ReturnStatus[]> = {
  return_requested: ["under_review", "approved", "rejected"],
  under_review: ["approved", "rejected"],
  approved: ["product_received", "completed"],
  rejected: ["completed"],
  product_received: ["inspected"],
  inspected: ["refund_or_replacement", "completed"],
  refund_or_replacement: ["completed"],
  completed: [],
};

export function canTransitionReturn(from: ReturnStatus, to: ReturnStatus): boolean {
  if (from === to) return false;
  return (RETURN_TRANSITIONS[from] || []).includes(to);
}
