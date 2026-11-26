import React, { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
} from "@tanstack/react-table";
import { ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { EmptyState, ErrorState, TableSkeleton } from "./AdminPrimitives";

interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  page?: number;
  totalPages?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  enableRowSelection?: boolean;
  onSelectionChange?: (selectedRows: TData[]) => void;
  emptyTitle?: string;
  renderMobileCard?: (row: TData) => React.ReactNode;
}

export function DataTable<TData>({
  columns,
  data,
  loading,
  error,
  onRetry,
  page = 1,
  totalPages = 1,
  total,
  onPageChange,
  enableRowSelection,
  onSelectionChange,
  emptyTitle,
  renderMobileCard,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const table = useReactTable({
    data,
    columns,
    state: { sorting, rowSelection },
    enableRowSelection: Boolean(enableRowSelection),
    onSortingChange: setSorting,
    onRowSelectionChange: (updater) => {
      const next = typeof updater === "function" ? updater(rowSelection) : updater;
      setRowSelection(next);
      if (onSelectionChange) {
        const selected = Object.keys(next)
          .filter((k) => next[k])
          .map((idx) => data[Number(idx)])
          .filter(Boolean);
        onSelectionChange(selected);
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <TableSkeleton />
      </div>
    );
  }
  if (!data || data.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <EmptyState title={emptyTitle} />
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Mobile Card View (< 768px) */}
      {renderMobileCard && (
        <div className="md:hidden divide-y divide-border">
          {data.map((item, idx) => (
            <div key={idx} className="p-3">
              {renderMobileCard(item)}
            </div>
          ))}
        </div>
      )}

      {/* Desktop Compact Table (44-48px row height) */}
      <div className={`${renderMobileCard ? "hidden md:block" : "block"} w-full overflow-x-auto`}>
        <table className="w-full text-[13px] border-collapse">
          <thead className="bg-muted/60 border-b border-border text-muted-foreground text-xs">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th key={header.id} className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className="inline-flex items-center gap-1 hover:text-foreground cursor-pointer"
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <ArrowUpDown size={11} className="opacity-60" />
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-border">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="h-11 hover:bg-muted/35 transition-colors">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-2 align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {onPageChange && (
        <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-muted/20 text-xs text-muted-foreground">
          <span>
            Page {page} / {totalPages}
            {total !== undefined ? ` (${total.toLocaleString()})` : ""}
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="h-9 min-w-[44px] md:h-7 md:min-w-0 px-2"
              aria-label="Previous page"
            >
              <ChevronLeft size={14} />
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="h-9 min-w-[44px] md:h-7 md:min-w-0 px-2"
              aria-label="Next page"
            >
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
