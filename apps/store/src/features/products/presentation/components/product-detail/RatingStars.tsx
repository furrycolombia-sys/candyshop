import { Star } from "lucide-react";

import type { CategoryTheme } from "@/shared/domain/categoryConstants";

interface RatingStarsProps {
  rating: number;
  theme?: CategoryTheme;
}

export function RatingStars({ rating, theme }: RatingStarsProps) {
  const rounded = Math.round(rating);
  const filledClass = "size-4 fill-current";
  const filledStyle = theme
    ? { color: theme.text }
    : { color: "var(--foreground)" };

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={i < rounded ? filledClass : "size-4 text-muted-foreground"}
          style={i < rounded ? filledStyle : undefined}
        />
      ))}
    </div>
  );
}
