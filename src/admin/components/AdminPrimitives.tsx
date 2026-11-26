import React from "react";
import { AlertCircle, Inbox, RefreshCw } from "lucide-react";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Button } from "@/app/components/ui/button";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-foreground">{title}</h1>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  subtext,
  deltaPct,
  icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  subtext?: string;
  deltaPct?: number | null;
  icon?: React.ReactNode;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const toneClass =
    tone === "danger"
      ? "border-red-200 dark:border-red-900/50"
      : tone === "warning"
        ? "border-amber-200 dark:border-amber-900/50"
        : tone === "success"
          ? "border-emerald-200 dark:border-emerald-900/50"
          : "border-border";

  return (
    <div className={`bg-card border ${toneClass} rounded-lg p-3.5 shadow-2xs`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium text-muted-foreground truncate">{label}</span>
        {icon && <span className="text-muted-foreground shrink-0">{icon}</span>}
      </div>
      <div className="mt-1.5 flex items-baseline justify-between gap-2">
        <span className="text-xl font-bold tracking-tight text-foreground tabular-nums">{value}</span>
        {deltaPct !== undefined && (
          <span
            className={`text-[11px] font-semibold tabular-nums ${
              deltaPct === null
                ? "text-muted-foreground"
                : deltaPct >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
            }`}
          >
            {deltaPct === null ? "N/A" : `${deltaPct >= 0 ? "+" : ""}${deltaPct}%`}
          </span>
        )}
      </div>
      {subtext && <p className="text-[11px] text-muted-foreground mt-1 truncate">{subtext}</p>}
    </div>
  );
}

const STATUS_STYLE: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  published: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  succeeded: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  delivered: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  approved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  verified: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  draft: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  processing: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300",
  packed: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300",
  shipped: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  out_for_delivery: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  failed: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  delivery_failed: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  refunded: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
  partially_refunded: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
  archived: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

export function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_STYLE[status] || "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium capitalize ${cls}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-full rounded" />
      ))}
    </div>
  );
}

export function EmptyState({
  title = "No records found",
  description = "Try adjusting your filters or create a new item.",
  action,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-3">
        <Inbox size={20} />
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-sm">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center border border-red-200 dark:border-red-900/50 rounded-lg bg-red-50/40 dark:bg-red-950/20">
      <AlertCircle size={22} className="text-red-600 mb-2" />
      <p className="text-sm font-medium text-foreground">Failed to load data</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-md">{message}</p>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry} className="mt-3 gap-1.5">
          <RefreshCw size={13} />
          Retry
        </Button>
      )}
    </div>
  );
}

export function formatMoney(amount: number | string | null | undefined, symbol = "¥"): string {
  const n = Number(amount ?? 0);
  return `${symbol}${Math.round(n).toLocaleString()}`;
}
