import { useEffect, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { formatCurrency } from '@/lib/calculations';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

export function AnimatedCounter({
  value,
  duration = 1,
  className = '',
  prefix = '$',
  suffix = '',
  decimals = 2,
}: AnimatedCounterProps) {
  const spring = useSpring(0, {
    stiffness: 50,
    damping: 20,
    duration: duration * 1000,
  });

  const display = useTransform(spring, (current) => {
    if (prefix === '$') {
      return formatCurrency(current, decimals);
    }
    return `${prefix}${current.toFixed(decimals)}${suffix}`;
  });

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  return (
    <motion.span className={className}>
      {display}
    </motion.span>
  );
}

// Simple non-animated version for SSR or when animation is not needed
export function Counter({
  value,
  className = '',
  prefix = '$',
  suffix = '',
  decimals = 2,
}: Omit<AnimatedCounterProps, 'duration'>) {
  const formatted = prefix === '$' 
    ? formatCurrency(value, decimals) 
    : `${prefix}${value.toFixed(decimals)}${suffix}`;
  
  return <span className={className}>{formatted}</span>;
}