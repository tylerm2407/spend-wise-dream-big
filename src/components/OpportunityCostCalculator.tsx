import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Clock,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Target
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { formatCurrency, calculateInvestmentGrowth } from '@/lib/calculations';
import { cn } from '@/lib/utils';

interface OpportunityCostCalculatorProps {
  totalSpent: number;
  monthlyIncome?: number | null;
  primaryGoal?: {
    name: string;
    target_amount: number;
    current_amount?: number | null;
  } | null;
  amount?: number;
  showTimeHorizons?: boolean;
}

const TIME_HORIZONS = [
  { years: 1, label: '1 Year' },
  { years: 5, label: '5 Years' },
  { years: 10, label: '10 Years' },
  { years: 30, label: '30 Years' },
];

export function OpportunityCostCalculator({
  totalSpent,
  monthlyIncome,
  primaryGoal,
  amount,
  showTimeHorizons = true,
}: OpportunityCostCalculatorProps) {
  const [selectedHorizon, setSelectedHorizon] = useState(10);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [returnRate, setReturnRate] = useState(7);

  const calculationAmount = amount ?? totalSpent;
  const yearlyAmount = calculationAmount * 12;

  // Calculate opportunity cost for each time horizon
  const opportunityCosts = useMemo(() => {
    return TIME_HORIZONS.map((horizon) => ({
      ...horizon,
      value: calculateInvestmentGrowth(yearlyAmount, horizon.years, returnRate / 100),
    }));
  }, [yearlyAmount, returnRate]);

  // Calculate goal delay impact
  const goalDelay = useMemo(() => {
    if (!monthlyIncome || !primaryGoal) return null;
    const dailySavings = (Number(monthlyIncome) * 0.2) / 30;
    if (dailySavings <= 0) return null;
    const days = Math.ceil(calculationAmount / dailySavings);
    return { days, goalName: primaryGoal.name };
  }, [calculationAmount, monthlyIncome, primaryGoal]);

  const selectedCost = opportunityCosts.find((oc) => oc.years === selectedHorizon)?.value ?? 0;

  return (
    <Card className="p-6 glass-card">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h2 className="font-semibold">Opportunity Cost</h2>
      </div>

      {/* Main Result Card */}
      <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl mb-4">
        <p className="text-sm text-muted-foreground mb-1">
          If you invested {formatCurrency(calculationAmount, 0)}/month instead...
        </p>
        <div className="flex items-baseline gap-2">
          <motion.p
            key={selectedCost}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-3xl font-bold text-primary"
          >
            {formatCurrency(selectedCost, 0)}
          </motion.p>
          <span className="text-muted-foreground">
            in {selectedHorizon} years
          </span>
        </div>
      </div>

      {/* Time Horizon Toggles */}
      {showTimeHorizons && (
        <div className="grid grid-cols-4 gap-2 mb-4">
          {TIME_HORIZONS.map((horizon) => (
            <Button
              key={horizon.years}
              variant={selectedHorizon === horizon.years ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedHorizon(horizon.years)}
              className={cn(
                'text-xs',
                selectedHorizon === horizon.years && 'bg-cta hover:bg-cta/90'
              )}
            >
              {horizon.label}
            </Button>
          ))}
        </div>
      )}

      {/* Goal Impact */}
      {goalDelay && goalDelay.days > 0 && (
        <div className="flex items-center gap-3 p-3 bg-warning/10 rounded-lg mb-4">
          <Clock className="h-5 w-5 text-warning flex-shrink-0" />
          <p className="text-sm">
            This spending pattern delays{' '}
            <span className="font-medium">"{goalDelay.goalName}"</span> by{' '}
            <span className="font-bold text-warning">{goalDelay.days} days</span>
          </p>
        </div>
      )}

      {/* Advanced Settings */}
      <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground">
            <span>Advanced assumptions</span>
            {isAdvancedOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="pt-4 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Annual Return Rate</span>
                <span className="font-medium">{returnRate}%</span>
              </div>
              <Slider
                value={[returnRate]}
                onValueChange={(v) => setReturnRate(v[0])}
                min={3}
                max={12}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Conservative</span>
                <span>Moderate</span>
                <span>Aggressive</span>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
