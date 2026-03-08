import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, TrendingUp, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { calculateInvestmentGrowth, formatCurrency, formatCompactCurrency } from '@/lib/calculations';

const PRESETS = [
  { label: '☕ Coffee', amount: 5, frequency: 'daily' as const },
  { label: '🍔 Lunch', amount: 15, frequency: 'daily' as const },
  { label: '🎬 Streaming', amount: 15, frequency: 'monthly' as const },
  { label: '🚗 Rideshare', amount: 25, frequency: 'weekly' as const },
];

type Freq = 'daily' | 'weekly' | 'monthly';

function yearlyFromFreq(amount: number, freq: Freq): number {
  if (freq === 'daily') return amount * 365;
  if (freq === 'weekly') return amount * 52;
  return amount * 12;
}

export function LandingCalculator() {
  const [amount, setAmount] = useState(5);
  const [frequency, setFrequency] = useState<Freq>('daily');
  const [years, setYears] = useState(10);

  const yearly = useMemo(() => yearlyFromFreq(amount, frequency), [amount, frequency]);
  const invested = useMemo(() => calculateInvestmentGrowth(yearly, years, 0.07), [yearly, years]);
  const totalSpent = yearly * years;

  return (
    <Card className="p-6 border-primary/20 bg-card/80 backdrop-blur">
      <h2 className="text-lg font-bold text-center mb-1">
        What's your daily habit <span className="text-primary">really</span> costing you?
      </h2>
      <p className="text-xs text-muted-foreground text-center mb-5">
        See the opportunity cost of everyday spending
      </p>

      {/* Preset chips */}
      <div className="flex flex-wrap gap-2 justify-center mb-5">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => { setAmount(p.amount); setFrequency(p.frequency); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              amount === p.amount && frequency === p.frequency
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            {p.label} · ${p.amount}
          </button>
        ))}
      </div>

      {/* Amount slider */}
      <div className="space-y-3 mb-5">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-muted-foreground">Amount</label>
          <span className="text-sm font-bold">${amount}/{frequency === 'daily' ? 'day' : frequency === 'weekly' ? 'week' : 'mo'}</span>
        </div>
        <Slider
          value={[amount]}
          onValueChange={([v]) => setAmount(v)}
          min={1}
          max={100}
          step={1}
        />
        <div className="flex gap-2 justify-center">
          {(['daily', 'weekly', 'monthly'] as Freq[]).map((f) => (
            <button
              key={f}
              onClick={() => setFrequency(f)}
              className={`px-3 py-1 rounded-full text-xs capitalize transition-all ${
                frequency === f
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Time horizon */}
      <div className="space-y-2 mb-6">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-muted-foreground">Time Horizon</label>
          <span className="text-sm font-bold">{years} years</span>
        </div>
        <Slider
          value={[years]}
          onValueChange={([v]) => setYears(v)}
          min={1}
          max={30}
          step={1}
        />
      </div>

      {/* Result */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${amount}-${frequency}-${years}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="rounded-xl bg-gradient-to-br from-primary/10 via-background to-accent/10 border border-primary/20 p-5"
        >
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground mb-1">You'd spend</p>
              <p className="text-xl font-bold text-destructive">{formatCompactCurrency(totalSpent)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">If invested instead</p>
              <p className="text-xl font-bold text-success">{formatCompactCurrency(invested)}</p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 mt-3">
            <TrendingUp className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-primary">
              {formatCompactCurrency(invested - totalSpent)} in potential growth
            </p>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-1">
            Based on 7% average annual return (S&P 500 historical average)
          </p>
        </motion.div>
      </AnimatePresence>
    </Card>
  );
}
