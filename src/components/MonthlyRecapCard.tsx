import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarRange,
  TrendingDown,
  TrendingUp,
  X,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Loader2,
  Target,
  DollarSign,
  ShoppingBag,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useMonthlyRecap } from '@/hooks/useMonthlyRecap';
import { formatCurrency } from '@/lib/calculations';
import { cn } from '@/lib/utils';

export function MonthlyRecapCard() {
  const { recap, shouldShow, dismiss, aiSummary, isLoadingAI, aiError, generateAISummary } = useMonthlyRecap();
  const [expanded, setExpanded] = useState(false);

  if (!shouldShow || !recap) return null;

  const spentMore = recap.comparedToLastMonth !== null && recap.comparedToLastMonth > 0;
  const spentLess = recap.comparedToLastMonth !== null && recap.comparedToLastMonth < 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.97 }}
    >
      <Card className="p-5 glass-card relative overflow-hidden border-primary/20">
        {/* Dismiss */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-7 w-7 text-muted-foreground z-10"
          onClick={dismiss}
          aria-label="Dismiss recap"
        >
          <X className="h-4 w-4" />
        </Button>

        {/* Header */}
        <div className="flex items-center gap-2 mb-4 pr-6">
          <div className="p-2 rounded-full bg-primary/10">
            <CalendarRange className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Monthly Recap</h3>
            <p className="text-xs text-muted-foreground">{recap.monthLabel}</p>
          </div>
        </div>

        {/* Total + Comparison */}
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <p className="text-2xl font-bold">{formatCurrency(recap.totalSpent, 0)}</p>
            <p className="text-xs text-muted-foreground">total spent</p>
          </div>
          {recap.comparedToLastMonth !== null && (
            <div className={cn(
              'flex items-center gap-1 text-sm font-medium',
              spentLess ? 'text-success' : spentMore ? 'text-destructive' : 'text-muted-foreground'
            )}>
              {spentLess ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
              <span>{spentMore ? '+' : ''}{recap.comparedToLastMonth}% vs last month</span>
            </div>
          )}
        </div>

        {/* Savings Rate */}
        {recap.savingsRate !== null && recap.monthlyIncome && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Savings Rate</span>
              <span className={cn(
                'font-medium',
                recap.savingsRate >= 20 ? 'text-success' : recap.savingsRate >= 0 ? 'text-warning' : 'text-destructive'
              )}>
                {recap.savingsRate}%
              </span>
            </div>
            <Progress
              value={Math.max(0, Math.min(100, recap.savingsRate))}
              className={cn(
                'h-2',
                recap.savingsRate >= 20 && '[&>div]:bg-success',
                recap.savingsRate >= 0 && recap.savingsRate < 20 && '[&>div]:bg-warning',
                recap.savingsRate < 0 && '[&>div]:bg-destructive'
              )}
            />
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-1">
              <ShoppingBag className="h-3 w-3 text-muted-foreground" />
              <p className="text-lg font-bold">{recap.purchaseCount}</p>
            </div>
            <p className="text-xs text-muted-foreground">purchases</p>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-1">
              <DollarSign className="h-3 w-3 text-muted-foreground" />
              <p className="text-sm font-bold">{formatCurrency(recap.dailyAverage, 0)}</p>
            </div>
            <p className="text-xs text-muted-foreground">daily avg</p>
          </div>
          <div className="text-center p-2 bg-success/5 rounded-lg">
            <div className="flex items-center justify-center gap-1">
              <Sparkles className="h-3 w-3 text-success" />
              <p className="text-lg font-bold text-success">{recap.daysWithNoPurchases}</p>
            </div>
            <p className="text-xs text-muted-foreground">no-spend</p>
          </div>
        </div>

        {/* Top Categories */}
        {recap.categoryBreakdown.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">Top categories</p>
            <div className="space-y-2">
              {recap.categoryBreakdown.slice(0, 3).map(cat => {
                const pct = Math.round((cat.amount / recap.totalSpent) * 100);
                return (
                  <div key={cat.name} className="flex items-center gap-2">
                    <span className="text-xs capitalize w-24 truncate">{cat.name}</span>
                    <div className="flex-1">
                      <Progress value={pct} className="h-1.5" />
                    </div>
                    <span className="text-xs font-medium w-16 text-right">{formatCurrency(cat.amount, 0)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Goal Progress */}
        {recap.goalProgress.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">Goal progress</p>
            <div className="space-y-2">
              {recap.goalProgress.slice(0, 2).map(goal => (
                <div key={goal.name} className="flex items-center gap-2">
                  <Target className="h-3 w-3 text-primary flex-shrink-0" />
                  <span className="text-xs truncate flex-1">{goal.name}</span>
                  <span className="text-xs font-medium text-primary">{goal.progress}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expand / AI Summary */}
        <div className="border-t border-border pt-3">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-primary hover:text-primary"
            onClick={() => {
              setExpanded(!expanded);
              if (!expanded && !aiSummary && !isLoadingAI) {
                generateAISummary();
              }
            }}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {expanded ? 'Hide AI Summary' : 'Get Personalized Tips'}
            {expanded ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
          </Button>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-3 space-y-2">
                  {isLoadingAI && (
                    <div className="flex items-center justify-center py-6 gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analyzing your spending...
                    </div>
                  )}
                  {aiError && (
                    <div className="text-center py-4">
                      <p className="text-sm text-destructive mb-2">{aiError}</p>
                      <Button variant="outline" size="sm" onClick={generateAISummary}>
                        Try Again
                      </Button>
                    </div>
                  )}
                  {aiSummary && !isLoadingAI && (
                    <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed">
                      {aiSummary.split('\n').map((line, i) => {
                        if (!line.trim()) return null;
                        if (line.startsWith('###')) {
                          return <h4 key={i} className="font-semibold text-sm mt-3 mb-1">{line.replace(/^#+\s*/, '')}</h4>;
                        }
                        if (line.startsWith('**') && line.endsWith('**')) {
                          return <p key={i} className="font-semibold text-sm mt-2">{line.replace(/\*\*/g, '')}</p>;
                        }
                        if (line.startsWith('- ') || line.startsWith('* ')) {
                          return <p key={i} className="text-sm pl-3 text-muted-foreground">• {line.slice(2)}</p>;
                        }
                        return <p key={i} className="text-sm text-muted-foreground">{line.replace(/\*\*/g, '')}</p>;
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>
    </motion.div>
  );
}
