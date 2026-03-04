"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onChange?: (rating: number) => void;
  count?: number;
  showValue?: boolean;
  className?: string;
}

const sizes = {
  sm: "h-3.5 w-3.5",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

export function StarRating({
  rating,
  size = "md",
  interactive = false,
  onChange,
  count,
  showValue = false,
  className,
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);

  const displayRating = interactive && hoverRating > 0 ? hoverRating : rating;

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = displayRating >= star;
          const halfFilled =
            !filled && displayRating >= star - 0.5 && !interactive;

          return (
            <button
              key={star}
              type="button"
              disabled={!interactive}
              onClick={() => interactive && onChange?.(star)}
              onMouseEnter={() => interactive && setHoverRating(star)}
              onMouseLeave={() => interactive && setHoverRating(0)}
              className={cn(
                "relative",
                interactive
                  ? "cursor-pointer transition-transform hover:scale-110"
                  : "cursor-default"
              )}
            >
              {/* Boş yıldız (arka plan) */}
              <Star
                className={cn(
                  sizes[size],
                  "text-gray-300",
                  interactive && "text-gray-200"
                )}
                fill="currentColor"
              />
              {/* Dolu yıldız (üst katman) */}
              {(filled || halfFilled) && (
                <Star
                  className={cn(
                    sizes[size],
                    "absolute inset-0 text-amber-400"
                  )}
                  fill="currentColor"
                  style={
                    halfFilled
                      ? { clipPath: "inset(0 50% 0 0)" }
                      : undefined
                  }
                />
              )}
            </button>
          );
        })}
      </div>
      {showValue && rating > 0 && (
        <span className="text-sm font-medium text-gray-700">
          {rating.toFixed(1)}
        </span>
      )}
      {typeof count === "number" && (
        <span className="text-sm text-gray-500">({count})</span>
      )}
    </div>
  );
}
