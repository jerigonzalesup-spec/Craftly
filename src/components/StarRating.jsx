
import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export function StarRating({
  rating,
  onRatingChange,
  readOnly = false,
  size = 'md',
}) {
  const [hoverRating, setHoverRating] = useState(0);

  const starSizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          onClick={() => onRatingChange?.(star)}
          onMouseEnter={() => !readOnly && setHoverRating(star)}
          onMouseLeave={() => !readOnly && setHoverRating(0)}
          className={cn(
            'transition-colors',
            readOnly ? 'cursor-default' : 'cursor-pointer'
          )}
          aria-label={`Rate ${star} stars`}
        >
          <Star
            className={cn(
              'text-muted-foreground transition-all',
              starSizeClasses[size],
              {
                'fill-yellow-400 text-yellow-400':
                  (hoverRating || rating) >= star,
                'hover:text-yellow-400/80': !readOnly,
              }
            )}
          />
        </button>
      ))}
    </div>
  );
}
