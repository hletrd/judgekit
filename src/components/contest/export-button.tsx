"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";

interface ExportButtonProps {
  assignmentId: string;
}

export function ExportButton({ assignmentId }: ExportButtonProps) {
  const t = useTranslations("contests.analytics");
  const [exporting, setExporting] = useState<"csv" | "json" | null>(null);

  async function handleExport(format: "csv" | "json") {
    setExporting(format);
    try {
      const res = await apiFetch(`/api/v1/contests/${assignmentId}/export?format=${format}`);
      if (!res.ok) {
        throw new Error("export failed");
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition");
      const filenameMatch = disposition?.match(/filename="?([^"]+)"?/);
      const filename = filenameMatch?.[1] ?? `export.${format}`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t("exportFailed"));
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={() => handleExport("csv")} disabled={exporting !== null}>
        {exporting === "csv" ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
        {t("exportCsv")}
      </Button>
      <Button variant="outline" size="sm" onClick={() => handleExport("json")} disabled={exporting !== null}>
        {exporting === "json" ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
        {t("exportJson")}
      </Button>
    </div>
  );
}
