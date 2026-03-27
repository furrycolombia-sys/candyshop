"use client";

import { ExternalLink, FileText, Hash } from "lucide-react";
import { useTranslations } from "next-intl";
import { tid } from "shared";

interface ReceiptViewerProps {
  transferNumber: string | null;
  receiptUrl: string | null;
}

export function ReceiptViewer({
  transferNumber,
  receiptUrl,
}: ReceiptViewerProps) {
  const t = useTranslations("receivedOrders");

  return (
    <div
      className="flex flex-col gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 p-3"
      {...tid("receipt-viewer")}
    >
      <h4 className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {t("receipt")}
      </h4>

      {/* Transfer number */}
      <div className="flex items-center gap-2 text-sm">
        <Hash className="size-4 text-muted-foreground" />
        <span className="font-medium">{t("transferNumber")}:</span>
        <span {...tid("receipt-transfer-number")}>
          {transferNumber ?? t("noTransferNumber")}
        </span>
      </div>

      {/* Receipt image */}
      <div className="flex items-center gap-2 text-sm">
        <FileText className="size-4 text-muted-foreground" />
        {receiptUrl ? (
          <a
            href={receiptUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 font-medium text-info underline underline-offset-2"
            {...tid("receipt-view-link")}
          >
            {t("viewReceipt")}
            <ExternalLink className="size-3" />
          </a>
        ) : (
          <span className="text-muted-foreground" {...tid("receipt-none")}>
            {t("noReceipt")}
          </span>
        )}
      </div>
    </div>
  );
}
