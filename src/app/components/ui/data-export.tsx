/**
 * KLINEO Data Export System
 * 
 * CSV/JSON export functionality with date range selection and progress feedback.
 */

import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import { Label } from "@/app/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Checkbox } from "@/app/components/ui/checkbox";
import { Download, FileText, FileSpreadsheet, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "@/app/lib/toast";

export type ExportFormat = "csv" | "json";
export type ExportType = "trade-history" | "positions" | "fees" | "referrals";

interface DataExportDialogProps {
  exportType: ExportType;
  onExport: (format: ExportFormat, dateRange: string, selectedColumns?: string[]) => Promise<void>;
  availableColumns?: string[];
  children?: React.ReactNode;
}

const exportTypeLabels = {
  "trade-history": "Trade History",
  positions: "Positions",
  fees: "Fee Statement",
  referrals: "Referral Earnings",
};

const dateRangeOptions = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "ytd", label: "Year to date" },
  { value: "all", label: "All time" },
];

export function DataExportDialog({
  exportType,
  onExport,
  availableColumns,
  children,
}: DataExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [dateRange, setDateRange] = useState("30d");
  const [selectedColumns, setSelectedColumns] = useState<string[]>(availableColumns || []);
  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);

  const handleColumnToggle = (column: string) => {
    setSelectedColumns((prev) =>
      prev.includes(column)
        ? prev.filter((c) => c !== column)
        : [...prev, column]
    );
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportComplete(false);

    try {
      await onExport(format, dateRange, availableColumns ? selectedColumns : undefined);
      
      setExportComplete(true);
      toast.success("Export completed", {
        description: `Your ${exportTypeLabels[exportType].toLowerCase()} has been downloaded`,
      });

      // Close dialog after 1.5 seconds
      setTimeout(() => {
        setOpen(false);
        setExportComplete(false);
      }, 1500);
    } catch (error) {
      toast.error("Export failed", {
        description: "Unable to generate export file. Please try again.",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isExporting) {
      setOpen(newOpen);
      if (!newOpen) {
        setExportComplete(false);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <Download className="size-4 mr-2" />
            Export
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Export {exportTypeLabels[exportType]}</DialogTitle>
          <DialogDescription>
            Download your {exportTypeLabels[exportType].toLowerCase()} data for record-keeping or analysis.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Format Selection */}
          <div className="space-y-2">
            <Label>Export Format</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setFormat("csv")}
                disabled={isExporting || exportComplete}
                className={`p-4 rounded-lg border-2 transition-all ${
                  format === "csv"
                    ? "border-accent bg-accent/10"
                    : "border-border hover:border-accent/50"
                } ${isExporting || exportComplete ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <FileSpreadsheet className="size-6 mx-auto mb-2 text-accent" />
                <div className="text-sm font-medium">CSV</div>
                <div className="text-xs text-muted-foreground">Excel compatible</div>
              </button>
              <button
                onClick={() => setFormat("json")}
                disabled={isExporting || exportComplete}
                className={`p-4 rounded-lg border-2 transition-all ${
                  format === "json"
                    ? "border-accent bg-accent/10"
                    : "border-border hover:border-accent/50"
                } ${isExporting || exportComplete ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <FileText className="size-6 mx-auto mb-2 text-accent" />
                <div className="text-sm font-medium">JSON</div>
                <div className="text-xs text-muted-foreground">Developer friendly</div>
              </button>
            </div>
          </div>

          {/* Date Range Selection */}
          <div className="space-y-2">
            <Label>Date Range</Label>
            <Select
              value={dateRange}
              onValueChange={setDateRange}
              disabled={isExporting || exportComplete}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {dateRangeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Column Selection (if available) */}
          {availableColumns && availableColumns.length > 0 && (
            <div className="space-y-2">
              <Label>Columns to Export</Label>
              <Card className="p-3 max-h-40 overflow-y-auto">
                <div className="space-y-2">
                  {availableColumns.map((column) => (
                    <div key={column} className="flex items-center gap-2">
                      <Checkbox
                        id={`col-${column}`}
                        checked={selectedColumns.includes(column)}
                        onCheckedChange={() => handleColumnToggle(column)}
                        disabled={isExporting || exportComplete}
                      />
                      <Label
                        htmlFor={`col-${column}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {column}
                      </Label>
                    </div>
                  ))}
                </div>
              </Card>
              <p className="text-xs text-muted-foreground">
                {selectedColumns.length} of {availableColumns.length} columns selected
              </p>
            </div>
          )}

          {/* Export Progress */}
          {exportComplete && (
            <div className="flex items-center justify-center gap-2 p-4 bg-[#10B981]/10 rounded-lg border border-[#10B981]/20">
              <CheckCircle2 className="size-5 text-[#10B981]" />
              <span className="text-sm font-medium text-[#10B981]">Export Complete</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isExporting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || exportComplete || (availableColumns && selectedColumns.length === 0)}
            className="bg-accent text-background hover:bg-accent/90"
          >
            {isExporting && <Loader2 className="size-4 mr-2 animate-spin" />}
            {exportComplete && <CheckCircle2 className="size-4 mr-2" />}
            {isExporting ? "Exporting..." : exportComplete ? "Downloaded" : "Export"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Utility functions for generating export files
 */

export const generateCSV = (data: any[], columns: string[]): string => {
  if (data.length === 0) return "";

  // Header row
  const header = columns.join(",");

  // Data rows
  const rows = data.map((row) => {
    return columns
      .map((col) => {
        const value = row[col];
        // Escape commas and quotes
        if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      })
      .join(",");
  });

  return [header, ...rows].join("\n");
};

export const generateJSON = (data: any[]): string => {
  return JSON.stringify(data, null, 2);
};

export const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Quick export button component (no dialog)
 */
interface QuickExportButtonProps {
  data: any[];
  filename: string;
  format?: ExportFormat;
  columns?: string[];
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
}

export function QuickExportButton({
  data,
  filename,
  format = "csv",
  columns,
  variant = "outline",
  size = "sm",
}: QuickExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = () => {
    setIsExporting(true);

    try {
      const cols = columns || (data.length > 0 ? Object.keys(data[0]) : []);
      
      let content: string;
      let mimeType: string;
      let ext: string;

      if (format === "csv") {
        content = generateCSV(data, cols);
        mimeType = "text/csv";
        ext = "csv";
      } else {
        content = generateJSON(data);
        mimeType = "application/json";
        ext = "json";
      }

      const timestamp = new Date().toISOString().split("T")[0];
      const fullFilename = `${filename}_${timestamp}.${ext}`;

      downloadFile(content, fullFilename, mimeType);

      toast.success("Export completed", {
        description: `Downloaded ${fullFilename}`,
      });
    } catch (error) {
      toast.error("Export failed", {
        description: "Unable to generate export file",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleExport}
      disabled={isExporting || data.length === 0}
    >
      {isExporting ? (
        <Loader2 className="size-4 mr-2 animate-spin" />
      ) : (
        <Download className="size-4 mr-2" />
      )}
      Export {format.toUpperCase()}
    </Button>
  );
}
