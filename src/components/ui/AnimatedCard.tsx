import { motion } from 'framer-motion';
import { forwardRef, type ReactNode } from 'react';
import { Card } from './card';
import { triggerHaptic } from '@/hooks/useHaptics';
import { cn } from '@/lib/utils';

interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  haptic?: 'light' | 'selection' | 'none';
  interactive?: boolean;
}

/**
 * An enhanced Card component with built-in tap animations and haptic feedback.
 * Perfect for tappable cards that need subtle micro-interactions.
 */
export const AnimatedCard = forwardRef<HTMLDivElement, AnimatedCardProps>(
  ({ children, className, onClick, haptic = 'selection', interactive = true }, ref) => {
    const handleClick = () => {
      if (onClick && haptic !== 'none') {
        triggerHaptic(haptic);
      }
      onClick?.();
    };

    if (!interactive) {
      return (
        <Card ref={ref} className={className}>
          {children}
        </Card>
      );
    }

    return (
      <motion.div
        ref={ref}
        whileTap={onClick ? { scale: 0.98 } : undefined}
        whileHover={onClick ? { scale: 1.01 } : undefined}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className="touch-manipulation"
      >
        <Card
          className={cn(
            onClick && 'cursor-pointer active:bg-muted/50 transition-colors',
            className
          )}
          onClick={handleClick}
        >
          {children}
        </Card>
      </motion.div>
    );
  }
);

AnimatedCard.displayName = 'AnimatedCard';
