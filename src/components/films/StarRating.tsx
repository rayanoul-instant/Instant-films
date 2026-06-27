import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  rating: number; // 0 to 5 (supports 0.5 steps)
  maxRating?: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
}

export function StarRating({ 
  rating, 
  size = 'md',
  interactive = false,
  onRatingChange 
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);

  const sizeClasses = {
    sm: 'w-3.5 h-3.5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  const displayRating = hoverRating || rating;

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>, starIndex: number) => {
    if (!interactive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const half = rect.width / 2;
    const value = x < half ? starIndex + 0.5 : starIndex + 1;
    setHoverRating(value);
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>, starIndex: number) => {
    if (!interactive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const half = rect.width / 2;
    const value = x < half ? starIndex + 0.5 : starIndex + 1;
    onRatingChange?.(value);
  };

  return (
    <div className="flex items-center gap-0.5">
      {[0, 1, 2, 3, 4].map((starIndex) => {
        const starValue = starIndex + 1;
        const filled = displayRating >= starValue;
        const halfFilled = !filled && displayRating >= starValue - 0.5;

        return (
          <button
            key={starIndex}
            type="button"
            disabled={!interactive}
            className={cn(
              "relative transition-transform",
              interactive && "cursor-pointer hover:scale-110"
            )}
            onMouseMove={(e) => handleMouseMove(e, starIndex)}
            onMouseLeave={() => interactive && setHoverRating(0)}
            onClick={(e) => handleClick(e, starIndex)}
          >
            {/* Background (empty) star */}
            <Star
              className={cn(
                sizeClasses[size],
                "text-muted-foreground/40"
              )}
            />
            {/* Filled overlay */}
            {(filled || halfFilled) && (
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ width: filled ? '100%' : '50%' }}
              >
                <Star
                  className={cn(
                    sizeClasses[size],
                    "text-primary fill-primary"
                  )}
                />
              </div>
            )}
          </button>
        );
      })}
      <span className={cn(
        "ml-2 font-semibold text-foreground",
        size === 'sm' && 'text-xs',
        size === 'md' && 'text-sm',
        size === 'lg' && 'text-lg'
      )}>
        {displayRating > 0 ? (displayRating % 1 === 0 ? String(displayRating) : displayRating.toFixed(1)) : 'N/A'}
        <span className="text-muted-foreground font-normal">/5</span>
      </span>
    </div>
  );
}
