import { useTranslations } from "next-intl";
import { tid } from "shared";

import type { CategoryTheme } from "@/features/products/domain/constants";
import type { ProductSeller } from "@/features/products/domain/types";
import { StarRow } from "@/features/products/presentation/components/product-detail/StarRow";

interface SellerSectionProps {
  seller: ProductSeller;
  theme: CategoryTheme;
}

export function SellerSection({ seller, theme }: SellerSectionProps) {
  const t = useTranslations("products");
  const comingSoonLabel = t("detail.comingSoon");

  return (
    <section
      className={`w-full ${theme.bgLight} border-b-[3px] border-foreground`}
      {...tid("seller-section")}
    >
      <div className="max-w-5xl mx-auto px-4 py-12">
        <h2
          className="font-display text-2xl font-extrabold uppercase tracking-widest mb-8"
          {...tid("seller-title")}
        >
          {t("detail.seller")}
        </h2>

        <div
          className="border-[3px] border-foreground nb-shadow-md bg-background p-6 flex flex-col sm:flex-row gap-6"
          {...tid("seller-card")}
        >
          {/* Avatar — always a colored initial circle (no external img) */}
          <div
            className={`size-20 border-[3px] border-foreground ${theme.bg} flex items-center justify-center nb-shadow-sm shrink-0`}
          >
            <span className="font-display text-3xl font-extrabold uppercase">
              {seller.name[0] ?? "?"}
            </span>
          </div>

          <div className="flex flex-col gap-4 flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="flex flex-col gap-1">
                <h3
                  className="font-display text-xl font-extrabold uppercase tracking-wide"
                  {...tid("seller-name")}
                >
                  {seller.name}
                </h3>
                {seller.rating !== undefined && (
                  <div className="flex items-center gap-2">
                    <StarRow rating={seller.rating} />
                    <span className="text-sm font-bold">
                      {t("detail.stars", {
                        rating: seller.rating.toFixed(1),
                      })}
                    </span>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="flex gap-4 flex-wrap">
                {seller.totalSales !== undefined && (
                  <div
                    className="border-[3px] border-foreground px-3 py-2 nb-shadow-sm flex flex-col items-center min-w-[80px]"
                    {...tid("seller-sales")}
                  >
                    <span className="font-display text-xl font-extrabold">
                      {seller.totalSales.toLocaleString()}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      {t("detail.sales")}
                    </span>
                  </div>
                )}
                {seller.responseTime && (
                  <div
                    className="border-[3px] border-foreground px-3 py-2 nb-shadow-sm flex flex-col items-center min-w-[80px]"
                    {...tid("seller-response")}
                  >
                    <span className="font-display text-sm/tight font-extrabold text-center">
                      {seller.responseTime}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      {t("detail.response")}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {seller.bio && (
              <p
                className="text-sm/relaxed text-muted-foreground"
                {...tid("seller-bio")}
              >
                {seller.bio}
              </p>
            )}

            <div className="mt-auto pt-2">
              <button
                className="border-[3px] border-foreground px-5 py-2.5 font-display text-sm font-extrabold uppercase tracking-widest opacity-50 cursor-not-allowed"
                disabled
                title={comingSoonLabel}
                {...tid("seller-contact-btn")}
              >
                {t("detail.contactSeller")} — {comingSoonLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
