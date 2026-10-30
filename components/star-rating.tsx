"use client";

import { useState } from "react";
import { formatRating } from "@/lib/book-status";

const STAR_PATH =
  "M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z";

/**
 * Note sur 5 par demi-étoile : chaque étoile est coupée en deux zones cliquables, la moitié
 * gauche donne la demi-note (3,5), la droite l'étoile pleine (4). Le survol prévisualise la
 * note avant le clic.
 */
export function StarRating({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (rating: number) => void;
  disabled?: boolean;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const shown = hovered ?? value;

  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-1.5" onMouseLeave={() => setHovered(null)}>
        {[1, 2, 3, 4, 5].map((star) => {
          const fill = shown >= star ? 100 : shown >= star - 0.5 ? 50 : 0;
          return (
            <span key={star} className="relative block h-8 w-8">
              <svg
                className="absolute inset-0.5 h-7 w-7 text-stone-200"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path d={STAR_PATH} />
              </svg>
              <span
                className="absolute inset-y-0.5 left-0.5 overflow-hidden transition-[width] duration-150"
                style={{ width: `calc(${fill} * 1.75rem / 100)` }}
              >
                <svg
                  className="h-7 w-7 text-amber-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path d={STAR_PATH} />
                </svg>
              </span>
              {[star - 0.5, star].map((rating, half) => (
                <button
                  key={rating}
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange(rating)}
                  onMouseEnter={() => setHovered(rating)}
                  onFocus={() => setHovered(rating)}
                  onBlur={() => setHovered(null)}
                  aria-label={`Noter ${formatRating(rating)} sur 5`}
                  aria-pressed={rating === value}
                  className={`absolute inset-y-0 w-1/2 rounded-sm disabled:cursor-not-allowed disabled:opacity-50 ${
                    half === 0 ? "left-0" : "right-0"
                  }`}
                />
              ))}
            </span>
          );
        })}
      </div>
      {value > 0 && (
        <span className="text-sm font-medium text-stone-600 tabular-nums">
          {formatRating(shown)}/5
        </span>
      )}
    </div>
  );
}
