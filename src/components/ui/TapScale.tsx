import { motion, type HTMLMotionProps } from 'framer-motion';
import { forwardRef, type ReactNode } from 'react';
import { triggerHaptic } from '@/hooks/useHaptics';
import { cn } from '@/lib/utils';

interface TapScaleProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: ReactNode;
  scale?: number;
  haptic?: 'light' | 'medium' | 'heavy' | 'success' | 'selection' | 'none';
  className?: string;
  disabled?: boolean;
}

/**
 * A wrapper component that adds tap/press scale animation with optional haptic feedback.
 * Use this to enhance buttons, cards, and other interactive elements.
 */
export const TapScale = forwardRef<HTMLDivElement, TapScaleProps>(
  ({ children, scale = 0.97, haptic = 'light', className, disabled, onClick, ...props }, ref) => {
    const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!disabled && haptic !== 'none') {
        triggerHaptic(haptic);
      }
      onClick?.(e);
    };

    return (
      <motion.div
        ref={ref}
        whileTap={disabled ? undefined : { scale }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        onClick={handleTap}
        className={cn('touch-manipulation', className)}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

TapScale.displayName = 'TapScale';
