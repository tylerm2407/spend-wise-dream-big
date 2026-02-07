import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FlaskConical, 
  TrendingDown, 
  DollarSign,
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { formatCurrency, calculateInvestmentGrowth } from '@/lib/calculations';
import { cn } from '@/lib/utils';
import { Database } from '@/integrations/supabase/types';

type PurchaseCategory = Database['public']['Enums']['purchase_category'];

const CATEGORY_ICONS: Record<PurchaseCategory, string> = {
  dining: '🍽️',
  shopping: '🛍️',
  transportation: '🚗',
  entertainment: '🎬',
  subscriptions: '📱',
  groceries: '🛒',
  health: '💊',
  utilities: '💡',
  travel: '✈️',
  other: '📦',
};

interface WhatIfSimulatorProps {
  categoryTotals: Record<string, number>;
  monthlyTotal: number;
}

export function WhatIfSimulator({ categoryTotals, monthlyTotal }: WhatIfSimulatorProps) {
  const [expanded, setExpanded] = useState(false);
  const [reductions, setReductions] = useState<Record<string, number>>({});

  const sortedCategories = useMemo(() => {
    return Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [categoryTotals]);

  const projections = useMemo(() => {
    let monthlySavings = 0;
    for (const [cat, amount] of Object.entries(categoryTotals)) {
      const pct = reductions[cat] || 0;
      monthlySavings += amount * (pct / 100);
    }
    const yearlySavings = monthlySavings * 12;
    return {
      monthly: monthlySavings,
      yearly: yearlySavings,
      fiveYear: calculateInvestmentGrowth(yearlySavings, 5),
      tenYear: calculateInvestmentGrowth(yearlySavings, 10),
    };
  }, [categoryTotals, reductions]);

  const hasReductions = Object.values(reductions).some(v => v > 0);

  if (sortedCategories.length === 0) return null;

  return (
    <Card className="p-6 glass-card overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full"
      >
        <div className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">What-If Simulator</h2>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {!expanded && (
        <p className="text-sm text-muted-foreground mt-2">
          Model "what if I cut dining by 30%?" scenarios
        </p>
      )}

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <p className="text-sm text-muted-foreground mt-3 mb-4">
              Adjust the sliders to see how cutting spending impacts your future.
            </p>

            <div className="space-y-4">
              {sortedCategories.map(([category, amount]) => {
                const pct = reductions[category] || 0;
                const saved = amount * (pct / 100);

                return (
                  <div key={category} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>{CATEGORY_ICONS[category as PurchaseCategory] || '📦'}</span>
                        <span className="text-sm font-medium capitalize">{category}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">
                          {formatCurrency(amount, 0)}/mo
                        </span>
                        {pct > 0 && (
                          <span className="text-success font-medium">
                            -{pct}%
                          </span>
                        )}
                      </div>
                    </div>
                    <Slider
                      value={[pct]}
                      onValueChange={([val]) =>
                        setReductions(prev => ({ ...prev, [category]: val }))
                      }
                      max={100}
                      step={5}
                      className="w-full"
                    />
                    {pct > 0 && (
                      <p className="text-xs text-success">
                        Save {formatCurrency(saved, 0)}/month
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Projections */}
            <AnimatePresence>
              {hasReductions && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="mt-6"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="h-4 w-4 text-success" />
                    <h3 className="font-semibold text-success text-sm">
                      Your projected savings
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Monthly', value: projections.monthly },
                      { label: 'Yearly', value: projections.yearly },
                      { label: '5 Years (invested)', value: projections.fiveYear },
                      { label: '10 Years (invested)', value: projections.tenYear },
                    ].map(({ label, value }) => (
                      <div
                        key={label}
                        className="p-3 rounded-lg bg-success/10 text-center"
                      >
                        <p className="text-lg font-bold text-success">
                          {formatCurrency(value, 0)}
                        </p>
                        <p className="text-xs text-muted-foreground">{label}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3 italic text-center">
                    Investment projections assume 7% annual returns
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
