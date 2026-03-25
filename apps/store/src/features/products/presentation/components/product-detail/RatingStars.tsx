import { Star } from "lucide-react";

import type { CategoryTheme } from "@/features/products/domain/constants";

interface RatingStarsProps {
  rating: number;
  theme?: CategoryTheme;
}

export function RatingStars({ rating, theme }: RatingStarsProps) {
  const rounded = Math.round(rating);
  const filledClass = theme
    ? `size-4 fill-current ${theme.text}`
    : "size-4 fill-foreground text-foreground";

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={i < rounded ? filledClass : "size-4 text-muted-foreground"}
        />
      ))}
    </div>
  );
}
