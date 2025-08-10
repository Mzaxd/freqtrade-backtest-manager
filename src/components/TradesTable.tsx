"use client";

import { useTranslations } from "next-intl";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  SortingState,
  getSortedRowModel,
  ColumnFiltersState,
  getFilteredRowModel,
  getPaginationRowModel,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { useState, useRef, useCallback, useEffect } from "react";
import { ArrowUpDown } from "lucide-react";

interface Trade {
  pair: string;
  open_date: string;
  close_date: string;
  profit_abs: number;
  profit_pct: number;
  open_rate: number;
  close_rate: number;
  amount: number;
  stake_amount: number;
  trade_duration: number;
  exit_reason: string;
}

interface TradesTableProps {
  trades: Trade[];
  tradesCount: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onSortChange: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  onFilterChange: (filters: Record<string, any>) => void;
  exitReasons: string[];
}

export function TradesTable({
  trades,
  tradesCount,
  page,
  limit,
  onPageChange,
  onLimitChange,
  onSortChange,
  onFilterChange,
  exitReasons,
}: TradesTableProps) {
  const t = useTranslations("Backtest");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});

  const tableContainerRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef<string | null>(null);
  const startX = useRef(0);
  const startWidth = useRef(0);

  useEffect(() => {
    const savedWidths = localStorage.getItem('tradesTableColumnWidths');
    if (savedWidths) {
      setColumnWidths(JSON.parse(savedWidths));
    }
  }, []);

  useEffect(() => {
    if (Object.keys(columnWidths).length > 0) {
      localStorage.setItem('tradesTableColumnWidths', JSON.stringify(columnWidths));
    }
  }, [columnWidths]);

  const columns: ColumnDef<Trade>[] = [
    { accessorKey: "pair", header: t("pair"), size: 150 },
    {
      accessorKey: "open_date",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => {
            const isAsc = column.getIsSorted() === "asc";
            column.toggleSorting(isAsc);
            onSortChange("open_date", isAsc ? "desc" : "asc");
          }}
        >
          {t("openDate")}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => format(new Date(row.getValue("open_date")), "yyyy-MM-dd HH:mm:ss"),
      size: 200,
    },
    {
      accessorKey: "close_date",
      header: t("closeDate"),
      cell: ({ row }) => format(new Date(row.getValue("close_date")), "yyyy-MM-dd HH:mm:ss"),
      size: 200,
    },
    {
      accessorKey: "profit_abs",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => {
            const isAsc = column.getIsSorted() === "asc";
            column.toggleSorting(isAsc);
            onSortChange("profit_abs", isAsc ? "desc" : "asc");
          }}
        >
          {t("profit")}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => row.getValue<number>("profit_abs").toFixed(2),
      size: 120,
    },
    {
      accessorKey: "profit_pct",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => {
            const isAsc = column.getIsSorted() === "asc";
            column.toggleSorting(isAsc);
            onSortChange("profit_pct", isAsc ? "desc" : "asc");
          }}
        >
          {t("profitPct")}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => `${(row.getValue<number>("profit_pct") * 100).toFixed(2)}%`,
      size: 120,
    },
    { accessorKey: "open_rate", header: t("openRate"), cell: ({ row }) => row.getValue<number>("open_rate").toFixed(4), size: 120 },
    { accessorKey: "close_rate", header: t("closeRate"), cell: ({ row }) => row.getValue<number>("close_rate").toFixed(4), size: 120 },
    { accessorKey: "amount", header: t("amount"), cell: ({ row }) => row.getValue<number>("amount").toFixed(4), size: 120 },
    { accessorKey: "stake_amount", header: t("stakeAmount"), cell: ({ row }) => row.getValue<number>("stake_amount").toFixed(2), size: 150 },
    { accessorKey: "trade_duration", header: t("tradeDuration"), size: 120 },
    { accessorKey: "exit_reason", header: t("exitReason"), size: 150 },
  ];

  const table = useReactTable({
    data: trades,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: {
      sorting,
      columnFilters,
      pagination: {
        pageIndex: page - 1,
        pageSize: limit,
      },
    },
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    pageCount: Math.ceil(tradesCount / limit),
    columnResizeMode: 'onChange',
  });

  const handleMouseDown = (e: React.MouseEvent, columnId: string) => {
    isResizing.current = columnId;
    startX.current = e.clientX;
    startWidth.current = columnWidths[columnId] || table.getColumn(columnId)!.getSize();
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isResizing.current) {
      const newWidth = startWidth.current + (e.clientX - startX.current);
      setColumnWidths(prev => ({ ...prev, [isResizing.current!]: newWidth > 50 ? newWidth : 50 }));
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    isResizing.current = null;
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return (
    <div>
      <div className="flex items-center space-x-4 py-4">
        <Input
          placeholder={t("filterByPair")}
          value={(table.getColumn("pair")?.getFilterValue() as string) ?? ""}
          onChange={(event) => {
            table.getColumn("pair")?.setFilterValue(event.target.value);
            onFilterChange({ pair: event.target.value });
          }}
          className="max-w-sm"
        />
        <Select
          onValueChange={(value) => {
            table.getColumn("exit_reason")?.setFilterValue(value);
            onFilterChange({ exitReason: value === 'all' ? '' : value });
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t("filterByExitReason")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allExitReasons")}</SelectItem>
            {exitReasons.map(reason => (
              <SelectItem key={reason} value={reason}>{reason}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="rounded-md border" ref={tableContainerRef}>
        <Table style={{ tableLayout: 'fixed' }}>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} style={{ width: columnWidths[header.id] || header.getSize(), position: 'relative' }}>
                      <div className="flex items-center justify-between">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                        <div
                          onMouseDown={(e) => handleMouseDown(e, header.id)}
                          className="w-1 h-full cursor-col-resize bg-gray-300 hover:bg-gray-500 absolute right-0 top-0"
                          style={{ userSelect: 'none' }}
                        />
                      </div>
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  {t("noTrades")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between py-4">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">{t("rowsPerPage")}</p>
          <Select
            value={`${limit}`}
            onValueChange={(value) => {
              onLimitChange(Number(value));
            }}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={limit} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 50, 100].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          {t("previous")}
        </Button>
        <span className="text-sm">
          {t("page")} {page} / {Math.ceil(tradesCount / limit)}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page * limit >= tradesCount}
        >
          {t("next")}
        </Button>
        </div>
      </div>
    </div>
  );
}