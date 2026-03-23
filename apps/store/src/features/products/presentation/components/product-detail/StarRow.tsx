import { Star } from "lucide-react";

interface StarRowProps {
  rating: number;
}

export function StarRow({ rating }: StarRowProps) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`size-3.5 ${i < Math.round(rating) ? "fill-foreground text-foreground" : "text-muted-foreground"}`}
        />
      ))}
    </div>
  );
}
