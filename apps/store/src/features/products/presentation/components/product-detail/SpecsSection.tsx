import { useTranslations } from "next-intl";
import { tid } from "shared";

import {
  buildCommissionRows,
  buildDigitalRows,
  buildPhysicalRows,
  buildTicketRows,
} from "@/features/products/domain/buildSpecRows";
import type { CategoryTheme } from "@/features/products/domain/constants";
import type { Product, ProductSpec } from "@/features/products/domain/types";

const MODULO_ZEBRA = 2;

interface SpecsSectionProps {
  specs: ProductSpec[];
  product: Product;
  theme: CategoryTheme;
}

function getTypeRows(
  product: Product,
  t: ReturnType<typeof useTranslations<"products">>,
): ProductSpec[] {
  if (product.type === "commission" && product.commission) {
    return buildCommissionRows(
      (key, values) => t(key as Parameters<typeof t>[0], values),
      product.commission,
    );
  }
  if (product.type === "ticket" && product.ticket) {
    return buildTicketRows(
      (key, values) => t(key as Parameters<typeof t>[0], values),
      product.ticket,
    );
  }
  if (product.type === "digital" && product.digital) {
    return buildDigitalRows(
      (key, values) => t(key as Parameters<typeof t>[0], values),
      product.digital,
    );
  }
  if (product.type === "physical" && product.physical) {
    return buildPhysicalRows(
      (key, values) => t(key as Parameters<typeof t>[0], values),
      product.physical,
    );
  }
  return [];
}

export function SpecsSection({ specs, product, theme }: SpecsSectionProps) {
  const t = useTranslations("products");
  const typeRows = getTypeRows(product, t);
  const allRows = [...specs, ...typeRows];

  if (allRows.length === 0) return null;

  return (
    <section
      className="w-full bg-background border-b-[3px] border-foreground"
      {...tid("specs-section")}
    >
      <div className="max-w-5xl mx-auto px-4 py-12">
        <h2
          className="font-display text-2xl font-extrabold uppercase tracking-widest mb-8"
          {...tid("specs-title")}
        >
          {t("detail.specifications")}
        </h2>
        <div
          className={`border-[3px] ${theme.border} nb-shadow-sm overflow-hidden`}
          {...tid("specs-table")}
        >
          {allRows.map((row, index) => (
            <div
              key={row.label}
              className={`flex items-stretch border-b-[3px] border-foreground last:border-b-0 ${index % MODULO_ZEBRA === 0 ? theme.rowEven : theme.rowOdd}`}
              {...tid(`spec-row-${index}`)}
            >
              <div className="w-1/3 shrink-0 px-5 py-3 border-r-[3px] border-foreground">
                <span className="text-sm font-bold uppercase tracking-wide">
                  {row.label}
                </span>
              </div>
              <div className="flex-1 px-5 py-3">
                <span className="text-sm">{row.value}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
