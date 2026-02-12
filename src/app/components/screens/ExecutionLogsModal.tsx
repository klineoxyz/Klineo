/**
 * Execution Logs — last 10 order attempts from order_execution_audit.
 * Used from DCA, Grid, Copy Trading, Terminal. Simple modal; no overdesign.
 */
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Badge } from "@/app/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";

export type ExecutionLogSource = "DCA" | "GRID" | "COPY" | "TERMINAL";

export interface ExecutionLogEntry {
  id: string;
  source: string;
  exchange: string;
  market_type: string;
  symbol: string;
  side: string;
  order_type: string;
  status: string;
  error_code: string | null;
  error_message: string | null;
  exchange_order_id: string | null;
  created_at: string;
}

interface ExecutionLogsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional filter: only show this source. */
  source?: ExecutionLogSource;
  title?: string;
}

export function ExecutionLogsModal({
  open,
  onOpenChange,
  source,
  title = "Execution Logs",
}: ExecutionLogsModalProps) {
  const [logs, setLogs] = useState<ExecutionLogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (source) params.set("source", source);
    api
      .get<{ logs: ExecutionLogEntry[] }>(
        `/api/trading/execution-logs?${params.toString()}`
      )
      .then((res) => setLogs((res.logs ?? []).slice(0, 10)))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [open, source]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Last 10 order attempts. If a trade didn’t execute, check status and message below.
        </p>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="overflow-auto flex-1 -mx-2 px-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Time</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Side</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="max-w-[200px]">Message</TableHead>
                  <TableHead className="text-xs">Order ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                      No execution logs yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {new Date(row.created_at).toLocaleString(undefined, {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{row.symbol}</TableCell>
                      <TableCell className="text-sm">{row.side}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            row.status === "PLACED"
                              ? "default"
                              : row.status === "SKIPPED"
                                ? "secondary"
                                : "destructive"
                          }
                          className={
                            row.status === "PLACED"
                              ? "bg-green-600 hover:bg-green-700"
                              : row.status === "SKIPPED"
                                ? "bg-amber-600 hover:bg-amber-700"
                                : ""
                          }
                        >
                          {row.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate" title={row.error_message ?? undefined}>
                        {row.error_message ?? "—"}
                      </TableCell>
                      <TableCell className="font-mono text-xs max-w-[100px] truncate" title={row.exchange_order_id ?? undefined}>
                        {row.exchange_order_id ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
