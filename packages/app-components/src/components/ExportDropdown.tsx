"use client";

import { Download, FileCode, FileSpreadsheet, FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "ui";

import { tid } from "../utils/tid";

type ExportFormat = "csv" | "excel" | "pdf";

export interface ExportDropdownProps {
  onExport: (format: ExportFormat) => void;
  label?: string;
  disabled?: boolean;
  testId?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  showIcon?: boolean;
  className?: string;
}

export function ExportDropdown({
  onExport,
  label,
  disabled = false,
  testId,
  variant = "default",
  size = "sm",
  showIcon = true,
  className,
}: ExportDropdownProps) {
  const tCommon = useTranslations("common");
  const resolvedLabel = label ?? tCommon("exportData");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={disabled}
          className={className}
          {...(testId ? tid(testId) : {})}
        >
          {showIcon && (
            <Download className="size-4 mr-2" {...tid("export-icon")} />
          )}
          {resolvedLabel}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onExport("pdf")}>
          <FileText className="size-4 mr-2 text-destructive" />
          {tCommon("exportFormats.pdf")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onExport("excel")}>
          <FileSpreadsheet className="size-4 mr-2 text-success" />
          {tCommon("exportFormats.excel")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onExport("csv")}>
          <FileCode className="size-4 mr-2 text-info" />
          {tCommon("exportFormats.csv")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
