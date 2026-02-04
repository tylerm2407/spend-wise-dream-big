import { motion } from 'framer-motion';
import { forwardRef } from 'react';
import { Button, type ButtonProps } from './button';
import { triggerHaptic } from '@/hooks/useHaptics';
import { cn } from '@/lib/utils';

interface AnimatedButtonProps extends ButtonProps {
  haptic?: 'light' | 'medium' | 'heavy' | 'success' | 'selection' | 'none';
}

/**
 * An enhanced Button component with built-in tap animations and haptic feedback.
 * Drop-in replacement for the standard Button component with micro-interactions.
 */
export const AnimatedButton = forwardRef<HTMLButtonElement, AnimatedButtonProps>(
  ({ className, haptic = 'light', onClick, disabled, children, ...props }, ref) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!disabled && haptic !== 'none') {
        triggerHaptic(haptic);
      }
      onClick?.(e);
    };

    return (
      <motion.div
        whileTap={disabled ? undefined : { scale: 0.97 }}
        whileHover={disabled ? undefined : { scale: 1.02 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        className="inline-flex"
      >
        <Button
          ref={ref}
          className={cn('touch-manipulation transition-all', className)}
          onClick={handleClick}
          disabled={disabled}
          {...props}
        >
          {children}
        </Button>
      </motion.div>
    );
  }
);

AnimatedButton.displayName = 'AnimatedButton';
