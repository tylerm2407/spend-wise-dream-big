import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  DollarSign,
  Calendar,
  Tag,
  Loader2,
  Zap,
  TrendingUp,
  Target,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePurchases } from '@/hooks/usePurchases';
import { useQuickAdds } from '@/hooks/useQuickAdds';
import { useGoals } from '@/hooks/useGoals';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { 
  calculateCostBreakdown, 
  calculateGoalDelay,
  formatCurrency,
  type Frequency 
} from '@/lib/calculations';
import { cn } from '@/lib/utils';
import { Database } from '@/integrations/supabase/types';

type PurchaseCategory = Database['public']['Enums']['purchase_category'];

const CATEGORIES: { value: PurchaseCategory; label: string; icon: string }[] = [
  { value: 'dining', label: 'Dining', icon: '🍽️' },
  { value: 'shopping', label: 'Shopping', icon: '🛍️' },
  { value: 'transportation', label: 'Transportation', icon: '🚗' },
  { value: 'entertainment', label: 'Entertainment', icon: '🎬' },
  { value: 'subscriptions', label: 'Subscriptions', icon: '📱' },
  { value: 'groceries', label: 'Groceries', icon: '🛒' },
  { value: 'health', label: 'Health', icon: '💊' },
  { value: 'utilities', label: 'Utilities', icon: '💡' },
  { value: 'travel', label: 'Travel', icon: '✈️' },
  { value: 'other', label: 'Other', icon: '📦' },
];

const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: 'one-time', label: 'One-time' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

export default function AddPurchase() {
  const navigate = useNavigate();
  const { addPurchase, isAdding } = usePurchases();
  const { quickAdds } = useQuickAdds();
  const { primaryGoal } = useGoals();
  const { profile } = useProfile();
  const { toast } = useToast();

  const [amount, setAmount] = useState('');
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState<PurchaseCategory>('other');
  const [frequency, setFrequency] = useState<Frequency>('one-time');
  const [showImpact, setShowImpact] = useState(false);

  const numericAmount = parseFloat(amount) || 0;
  
  const breakdown = useMemo(() => 
    calculateCostBreakdown(numericAmount, frequency),
    [numericAmount, frequency]
  );

  const goalDelay = useMemo(() => {
    if (!primaryGoal || !profile?.monthly_income) return 0;
    return calculateGoalDelay(numericAmount, Number(profile.monthly_income));
  }, [numericAmount, primaryGoal, profile?.monthly_income]);

  const handleQuickAdd = (quickAdd: typeof quickAdds[0]) => {
    setAmount(String(quickAdd.amount));
    setItemName(quickAdd.item_name);
    setCategory(quickAdd.category);
    setFrequency(quickAdd.frequency as Frequency);
    setShowImpact(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!numericAmount || !itemName || !category) {
      toast({
        title: 'Missing information',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    addPurchase({
      amount: numericAmount,
      item_name: itemName,
      category,
      frequency,
    }, {
      onSuccess: () => {
        toast({
          title: 'Purchase added',
          description: `${itemName} - ${formatCurrency(numericAmount)}`,
        });
        navigate('/dashboard');
      },
      onError: (error) => {
        toast({
          title: 'Error',
          description: 'Failed to add purchase. Please try again.',
          variant: 'destructive',
        });
      },
    });
  };

  const handleAmountChange = (value: string) => {
    setAmount(value);
    if (parseFloat(value) > 0) {
      setShowImpact(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg px-6 py-4 border-b border-border">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Add Purchase</h1>
        </div>
      </header>

      <main className="px-6 py-6 space-y-6 pb-32">
        {/* Quick Add Buttons */}
        {quickAdds.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-4 w-4 text-warning" />
              <span className="text-sm font-medium">Quick Add</span>
            </div>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
              {quickAdds.map((qa) => (
                <Button
                  key={qa.id}
                  variant="outline"
                  onClick={() => handleQuickAdd(qa)}
                  className="flex-shrink-0 h-10 px-4"
                >
                  {qa.item_name} · {formatCurrency(Number(qa.amount), 0)}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground" />
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                className="pl-12 h-14 text-2xl font-bold"
                step="0.01"
                min="0"
                required
                aria-label="Purchase amount"
              />
            </div>
          </div>

          {/* Item Name */}
          <div className="space-y-2">
            <Label htmlFor="itemName">What did you buy?</Label>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="itemName"
                placeholder="e.g., Coffee at Starbucks"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                className="pl-10 h-12"
                required
                aria-label="Item name"
              />
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Category</Label>
            <div className="grid grid-cols-5 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={cn(
                    'flex flex-col items-center gap-1 p-3 rounded-xl border transition-all',
                    category === cat.value
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <span className="text-xl">{cat.icon}</span>
                  <span className="text-xs">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Frequency */}
          <div className="space-y-2">
            <Label htmlFor="frequency">Frequency</Label>
            <Select value={frequency} onValueChange={(v) => setFrequency(v as Frequency)}>
              <SelectTrigger className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCIES.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Impact Preview */}
          <AnimatePresence>
            {showImpact && numericAmount > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4"
              >
                {/* Cost Breakdown */}
                {frequency !== 'one-time' && (
                  <Card className="p-4 bg-gradient-card">
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">The True Cost</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Monthly</p>
                        <AnimatedCounter
                          value={breakdown.monthly}
                          className="text-xl font-bold"
                          decimals={0}
                        />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Yearly</p>
                        <AnimatedCounter
                          value={breakdown.yearly}
                          className="text-xl font-bold text-primary"
                          decimals={0}
                        />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">5 Years (invested)</p>
                        <AnimatedCounter
                          value={breakdown.fiveYear}
                          className="text-lg font-semibold text-success"
                          decimals={0}
                        />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">10 Years (invested)</p>
                        <AnimatedCounter
                          value={breakdown.tenYear}
                          className="text-lg font-semibold text-success"
                          decimals={0}
                        />
                      </div>
                    </div>

                    {/* Comparisons */}
                    {breakdown.comparisons.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <p className="text-sm text-muted-foreground mb-2">
                          That's equivalent to:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {breakdown.comparisons.map((comp, i) => (
                            <span
                              key={i}
                              className="px-3 py-1 bg-secondary rounded-full text-sm"
                            >
                              {comp}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>
                )}

                {/* Goal Impact */}
                {primaryGoal && goalDelay > 0 && (
                  <Card className="p-4 bg-warning/5 border-warning/20">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="h-5 w-5 text-warning" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-warning">Goal Impact</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          This purchase delays your goal{' '}
                          <strong>"{primaryGoal.name}"</strong> by{' '}
                          <span className="font-bold text-warning">
                            {goalDelay} day{goalDelay > 1 ? 's' : ''}
                          </span>
                        </p>
                      </div>
                    </div>
                  </Card>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </main>

      {/* Submit Button */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-background/80 backdrop-blur-lg border-t border-border safe-area-inset-bottom">
        <Button
          onClick={handleSubmit}
          className="w-full h-14 text-lg bg-gradient-primary hover:opacity-90"
          disabled={isAdding || !numericAmount || !itemName}
        >
          {isAdding ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              Add Purchase · {formatCurrency(numericAmount)}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}