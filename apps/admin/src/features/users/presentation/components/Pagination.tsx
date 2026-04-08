"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { tid } from "shared";
import { Button } from "ui";

interface PaginationProps {
  page: number;
  totalPages: number;
  from: number;
  to: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  page,
  totalPages,
  from,
  to,
  total,
  onPageChange,
}: PaginationProps) {
  const t = useTranslations("users.pagination");

  return (
    <div
      className="flex items-center justify-between border-t-2 border-foreground/10 pt-4"
      {...tid("users-pagination")}
    >
      <span className="text-sm text-muted-foreground">
        {t("showing", { from, to })} {t("of", { total })}
      </span>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="rounded-none border-2 border-foreground"
          {...tid("pagination-prev")}
        >
          <ChevronLeft className="size-4" />
        </Button>

        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter(
            (p) =>
              p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1),
          )
          .reduce<{ type: "page" | "ellipsis"; value: number }[]>(
            (acc, p, idx, arr) => {
              if (idx > 0 && p - (arr[idx - 1] as number) > 1) {
                acc.push({ type: "ellipsis", value: arr[idx - 1] as number });
              }
              acc.push({ type: "page", value: p });
              return acc;
            },
            [],
          )
          .map((item) =>
            item.type === "ellipsis" ? (
              <span
                key={`ellipsis-after-${item.value}`}
                className="px-1 text-sm text-muted-foreground"
              >
                ...
              </span>
            ) : (
              <Button
                key={item.value}
                variant={item.value === page ? "default" : "outline"}
                size="sm"
                onClick={() => onPageChange(item.value)}
                className="rounded-none border-2 border-foreground font-display text-xs font-bold"
                {...tid(`pagination-page-${item.value}`)}
              >
                {item.value}
              </Button>
            ),
          )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="rounded-none border-2 border-foreground"
          {...tid("pagination-next")}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
