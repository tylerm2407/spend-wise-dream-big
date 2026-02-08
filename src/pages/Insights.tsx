import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  PieChart, 
  Calendar,
  Target,
  Lightbulb,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePurchases } from '@/hooks/usePurchases';
import { useGoals } from '@/hooks/useGoals';
import { useProfile } from '@/hooks/useProfile';
import { SpendingCharts } from '@/components/SpendingCharts';
import { OpportunityCostCalculator } from '@/components/OpportunityCostCalculator';
import { WhatIfSimulator } from '@/components/WhatIfSimulator';
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

export default function Insights() {
  const { purchases, monthlyTotal, lastMonthTotal, monthlyChange, categoryTotals, topCategory } = usePurchases();
  const { primaryGoal } = useGoals();
  const { profile } = useProfile();
  const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'year'>('month');

  // Calculate top categories draining future value
  const categoryOpportunityCost = useMemo(() => {
    return Object.entries(categoryTotals)
      .map(([category, amount]) => ({
        category: category as PurchaseCategory,
        amount,
        icon: CATEGORY_ICONS[category as PurchaseCategory],
        tenYearCost: calculateInvestmentGrowth(amount * 12, 10),
      }))
      .sort((a, b) => b.tenYearCost - a.tenYearCost)
      .slice(0, 5);
  }, [categoryTotals]);

  // Small wins suggestion
  const smallWin = useMemo(() => {
    if (!topCategory) return null;
    const reduction = Math.round(topCategory.amount * 0.1);
    const yearlySavings = reduction * 12;
    const tenYearValue = calculateInvestmentGrowth(yearlySavings, 10);
    return {
      category: topCategory.name,
      reduction,
      yearlySavings,
      tenYearValue,
    };
  }, [topCategory]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-hero">
        {/* Header */}
        <header className="px-6 pt-6 pb-4">
          <h1 className="text-2xl font-bold">Insights</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Understand your spending patterns
          </p>
        </header>

        {purchases.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
              <PieChart className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No spending data yet</h2>
            <p className="text-muted-foreground mb-6 max-w-xs mx-auto">
              Start logging purchases to unlock insights about your spending patterns.
            </p>
            <Link to="/add-purchase">
              <Button className="bg-gradient-primary">
                <ArrowRight className="h-4 w-4 mr-2" />
                Log Your First Purchase
              </Button>
            </Link>
          </div>
        ) : (
        <motion.main
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="px-6 space-y-6 pb-6"
        >
          {/* Monthly Summary */}
          <motion.div variants={itemVariants}>
            <Card className="p-6 glass-card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">This Month</h2>
                <div className={cn(
                  'flex items-center gap-1 text-sm px-2 py-1 rounded-full',
                  monthlyChange > 0 
                    ? 'bg-destructive/10 text-destructive' 
                    : 'bg-success/10 text-success'
                )}>
                  {monthlyChange > 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span>{monthlyChange > 0 ? '+' : ''}{monthlyChange.toFixed(0)}%</span>
                </div>
              </div>
              <p className="text-3xl font-bold mb-1">{formatCurrency(monthlyTotal, 0)}</p>
              <p className="text-sm text-muted-foreground">
                vs {formatCurrency(lastMonthTotal, 0)} last month
              </p>
            </Card>
          </motion.div>

          {/* Opportunity Cost Calculator */}
          <motion.div variants={itemVariants}>
            <OpportunityCostCalculator
              totalSpent={monthlyTotal}
              monthlyIncome={profile?.monthly_income}
              primaryGoal={primaryGoal}
            />
          </motion.div>

          {/* Top Categories Draining Future Value */}
          <motion.div variants={itemVariants}>
            <Card className="p-6 glass-card">
              <div className="flex items-center gap-2 mb-4">
                <PieChart className="h-5 w-5 text-primary" />
                <h2 className="font-semibold">Top Categories (Future Value Impact)</h2>
              </div>
              <div className="space-y-3">
                {categoryOpportunityCost.map((item, index) => (
                  <div 
                    key={item.category}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{item.icon}</span>
                      <div>
                        <p className="font-medium capitalize">{item.category}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(item.amount, 0)}/mo
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-destructive">
                        -{formatCurrency(item.tenYearCost, 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">10yr cost</p>
                    </div>
                  </div>
                ))}
                {categoryOpportunityCost.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    Add purchases to see category insights
                  </p>
                )}
              </div>
            </Card>
          </motion.div>

          {/* Small Wins */}
          {smallWin && (
            <motion.div variants={itemVariants}>
              <Card className="p-6 bg-gradient-to-br from-success/10 to-success/5 border-success/20">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="h-5 w-5 text-success" />
                  <h2 className="font-semibold text-success">Small Win Opportunity</h2>
                </div>
                <p className="text-sm text-foreground mb-3">
                  Cut your <span className="font-medium capitalize">{smallWin.category}</span> spending by just 10% (
                  {formatCurrency(smallWin.reduction, 0)}/month) and gain{' '}
                  <span className="font-bold text-success">
                    {formatCurrency(smallWin.tenYearValue, 0)}
                  </span>{' '}
                  over 10 years.
                </p>
                <p className="text-xs text-muted-foreground italic">
                  "Small changes compound."
                </p>
              </Card>
            </motion.div>
          )}

          {/* What-If Simulator */}
          {Object.keys(categoryTotals).length > 0 && (
            <motion.div variants={itemVariants}>
              <WhatIfSimulator
                categoryTotals={categoryTotals}
                monthlyTotal={monthlyTotal}
              />
            </motion.div>
          )}

          {/* Spending Charts */}
          {purchases.length > 0 && (
            <motion.div variants={itemVariants}>
              <SpendingCharts purchases={purchases} />
            </motion.div>
          )}

          {/* CTA to Alternatives */}
          <motion.div variants={itemVariants}>
            <Link to="/alternatives">
              <Card className="p-6 bg-gradient-cta text-cta-foreground hover:opacity-90 transition-opacity cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold mb-1">Find Cheaper Alternatives</h3>
                    <p className="text-sm opacity-90">
                      Discover ways to save on your top categories
                    </p>
                  </div>
                  <ArrowRight className="h-6 w-6" />
                </div>
              </Card>
            </Link>
          </motion.div>
        </motion.main>
        )}
      </div>
    </AppLayout>
  );
}
