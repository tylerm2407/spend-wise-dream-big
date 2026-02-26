import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calculator, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { formatCurrency } from '@/lib/calculations';

type Frequency = 'daily' | 'weekly' | 'monthly' | 'annually';

const frequencyMultiplier: Record<Frequency, number> = {
  daily: 365,
  weekly: 52,
  monthly: 12,
  annually: 1,
};

export function CompoundInterestCalculator() {
  const [contribution, setContribution] = useState('100');
  const [frequency, setFrequency] = useState<Frequency>('monthly');
  const [annualReturn, setAnnualReturn] = useState([8]);
  const [years, setYears] = useState([10]);

  const result = useMemo(() => {
    const c = parseFloat(contribution) || 0;
    const r = annualReturn[0] / 100;
    const n = frequencyMultiplier[frequency];
    const t = years[0];
    const ratePerPeriod = r / n;
    const totalPeriods = n * t;
    const totalContributions = c * totalPeriods;

    // FV of annuity: c * (((1 + r/n)^(n*t) - 1) / (r/n))
    let futureValue = 0;
    if (ratePerPeriod > 0) {
      futureValue = c * ((Math.pow(1 + ratePerPeriod, totalPeriods) - 1) / ratePerPeriod);
    } else {
      futureValue = totalContributions;
    }

    return {
      futureValue,
      totalContributions,
      totalInterest: futureValue - totalContributions,
    };
  }, [contribution, frequency, annualReturn, years]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-full bg-primary/10">
            <Calculator className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Compound Interest Calculator</h2>
            <p className="text-muted-foreground text-sm">See how your savings grow over time</p>
          </div>
        </div>

        <div className="grid gap-5">
          {/* Contribution + Frequency */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Contribution ($)</Label>
              <Input
                type="number"
                min="0"
                value={contribution}
                onChange={(e) => setContribution(e.target.value)}
                placeholder="100"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Frequency</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as Frequency)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="annually">Annually</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Annual Return */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Annual Return</Label>
              <span className="text-sm font-medium text-primary">{annualReturn[0]}%</span>
            </div>
            <Slider value={annualReturn} onValueChange={setAnnualReturn} min={1} max={15} step={0.5} />
          </div>

          {/* Time Horizon */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Time Horizon</Label>
              <span className="text-sm font-medium text-primary">{years[0]} years</span>
            </div>
            <Slider value={years} onValueChange={setYears} min={1} max={40} step={1} />
          </div>

          {/* Results */}
          <div className="mt-2 rounded-xl bg-gradient-card border border-border p-5 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-success" />
              <span className="text-sm font-medium">Projected Growth</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-muted-foreground text-sm">Total Contributions</span>
              <span className="font-semibold">{formatCurrency(result.totalContributions)}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-muted-foreground text-sm">Interest Earned</span>
              <span className="font-semibold text-success">{formatCurrency(result.totalInterest)}</span>
            </div>
            <div className="border-t border-border pt-3 flex justify-between items-baseline">
              <span className="font-medium">Future Value</span>
              <span className="text-xl font-bold text-primary">{formatCurrency(result.futureValue)}</span>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
