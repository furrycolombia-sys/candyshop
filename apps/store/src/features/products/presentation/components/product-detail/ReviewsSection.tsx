import { useTranslations } from "next-intl";
import { tid } from "shared";

import type { CategoryTheme } from "@/features/products/domain/constants";
import type { ProductReview } from "@/features/products/domain/types";
import { AuthorAvatar } from "@/features/products/presentation/components/product-detail/AuthorAvatar";
import { RatingStars } from "@/features/products/presentation/components/product-detail/RatingStars";

interface ReviewsSectionProps {
  reviews: ProductReview[];
  rating: number;
  reviewCount: number;
  theme: CategoryTheme;
}

export function ReviewsSection({
  reviews,
  rating,
  reviewCount,
  theme,
}: ReviewsSectionProps) {
  const t = useTranslations("products");

  if (reviews.length === 0) return null;

  return (
    <section
      className="w-full bg-background border-b-[3px] border-foreground"
      {...tid("reviews-section")}
    >
      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
          <h2
            className="font-display text-2xl font-extrabold uppercase tracking-widest"
            {...tid("reviews-title")}
          >
            {t("detail.reviews")}
          </h2>
          <div
            className="flex items-center gap-3 sm:ml-4"
            {...tid("reviews-summary")}
          >
            <span className="font-display text-3xl font-extrabold">
              {rating.toFixed(1)}
            </span>
            <div className="flex flex-col gap-1">
              <RatingStars rating={rating} />
              <span className="text-xs text-muted-foreground">
                {t("detail.reviewsCount", { count: reviewCount })}
              </span>
            </div>
          </div>
        </div>

        {/* Review cards */}
        <div
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
          {...tid("reviews-grid")}
        >
          {reviews.map((review, index) => (
            <div
              key={`${review.author}-${review.date}`}
              className={`flex flex-col gap-3 p-5 border-[3px] border-foreground nb-shadow-sm ${theme.bgLight}`}
              {...tid(`review-card-${index}`)}
            >
              <div className="flex items-center gap-3">
                <AuthorAvatar name={review.author} />
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="font-bold text-sm truncate">
                    {review.author}
                  </span>
                  <RatingStars rating={review.rating} />
                </div>
                <time
                  className="ml-auto text-xs text-muted-foreground shrink-0"
                  dateTime={review.date}
                >
                  {new Date(review.date).toLocaleDateString()}
                </time>
              </div>
              <p className="text-sm/relaxed">{review.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
