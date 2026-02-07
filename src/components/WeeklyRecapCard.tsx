import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  CalendarDays,
  TrendingDown,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  X,
  Sparkles,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useWeeklyRecap } from '@/hooks/useWeeklyRecap';
import { useBudgetNotifications } from '@/hooks/useBudgetNotifications';
import { formatCurrency } from '@/lib/calculations';
import { cn } from '@/lib/utils';

const RECAP_NOTIFIED_KEY = 'weekly_recap_notified_week';

function getWeekId(date: Date): string {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  return start.toISOString().split('T')[0];
}

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function WeeklyRecapCard() {
  const { recap, shouldShow, dismiss } = useWeeklyRecap();
  const { enabled: alertsEnabled } = useBudgetNotifications();
  const notifiedRef = useRef(false);

  // Send browser notification once per week
  useEffect(() => {
    if (!recap || !alertsEnabled || notifiedRef.current) return;

    const currentWeekId = getWeekId(new Date());
    const lastNotified = localStorage.getItem(RECAP_NOTIFIED_KEY);
    if (lastNotified === currentWeekId) return;

    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      const status = recap.budgetPerformancePct !== null
        ? recap.budgetPerformancePct <= 100
          ? `✅ Under budget (${recap.budgetPerformancePct}% used)`
          : `⚠️ Over budget (${recap.budgetPerformancePct}% used)`
        : '';

      try {
        new Notification('📊 Your Weekly Spending Recap', {
          body: `You spent ${formatCurrency(recap.totalSpent, 0)} over the last 7 days. ${status}`,
          icon: '/favicon.ico',
          tag: 'weekly-recap',
        });
      } catch {
        // Notifications not supported
      }

      localStorage.setItem(RECAP_NOTIFIED_KEY, currentWeekId);
      notifiedRef.current = true;
    }
  }, [recap, alertsEnabled]);

  if (!shouldShow || !recap) return null;

  const isUnderBudget = recap.budgetPerformancePct !== null && recap.budgetPerformancePct <= 100;
  const hasBudget = recap.weeklyBudget !== null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.97 }}
    >
      <Card className={cn(
        "p-5 glass-card relative overflow-hidden",
        hasBudget && isUnderBudget && "border-success/30",
        hasBudget && !isUnderBudget && "border-warning/30"
      )}>
        {/* Dismiss */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-7 w-7 text-muted-foreground"
          onClick={dismiss}
          aria-label="Dismiss recap"
        >
          <X className="h-4 w-4" />
        </Button>

        {/* Header */}
        <div className="flex items-center gap-2 mb-4 pr-6">
          <div className="p-2 rounded-full bg-primary/10">
            <CalendarDays className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Weekly Recap</h3>
            <p className="text-xs text-muted-foreground">
              {formatShortDate(recap.weekStart)} – {formatShortDate(recap.weekEnd)}
            </p>
          </div>
        </div>

        {/* Total Spent */}
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <p className="text-2xl font-bold">{formatCurrency(recap.totalSpent, 0)}</p>
            <p className="text-xs text-muted-foreground">spent this week</p>
          </div>
          {hasBudget && (
            <div className={cn(
              "flex items-center gap-1 text-sm font-medium",
              isUnderBudget ? "text-success" : "text-warning"
            )}>
              {isUnderBudget ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Under budget</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4" />
                  <span>{recap.budgetPerformancePct}% of limit</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Budget Progress */}
        {hasBudget && recap.budgetPerformancePct !== null && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>{formatCurrency(recap.totalSpent, 0)}</span>
              <span>{formatCurrency(recap.weeklyBudget!, 0)} weekly budget</span>
            </div>
            <Progress
              value={Math.min(100, recap.budgetPerformancePct)}
              className={cn(
                "h-2",
                !isUnderBudget && "[&>div]:bg-warning",
                recap.budgetPerformancePct >= 100 && "[&>div]:bg-destructive"
              )}
            />
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {hasBudget && (
            <div className="text-center p-2 bg-success/5 rounded-lg">
              <p className="text-lg font-bold text-success">{recap.daysUnderBudget}</p>
              <p className="text-xs text-muted-foreground">days under</p>
            </div>
          )}
          {recap.bestDay && (
            <div className="text-center p-2 bg-primary/5 rounded-lg">
              <div className="flex items-center justify-center gap-1">
                <TrendingDown className="h-3 w-3 text-success" />
                <p className="text-sm font-bold">{formatCurrency(recap.bestDay.total, 0)}</p>
              </div>
              <p className="text-xs text-muted-foreground">best day</p>
            </div>
          )}
          {recap.worstDay && recap.worstDay.total > 0 && (
            <div className="text-center p-2 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center gap-1">
                <TrendingUp className="h-3 w-3 text-warning" />
                <p className="text-sm font-bold">{formatCurrency(recap.worstDay.total, 0)}</p>
              </div>
              <p className="text-xs text-muted-foreground">highest day</p>
            </div>
          )}
          {recap.daysWithNoPurchases > 0 && (
            <div className="text-center p-2 bg-success/5 rounded-lg">
              <div className="flex items-center justify-center gap-1">
                <Sparkles className="h-3 w-3 text-success" />
                <p className="text-sm font-bold">{recap.daysWithNoPurchases}</p>
              </div>
              <p className="text-xs text-muted-foreground">no-spend days</p>
            </div>
          )}
        </div>

        {/* Category Breakdown */}
        {recap.categoryBreakdown.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Top categories</p>
            <div className="flex flex-wrap gap-2">
              {recap.categoryBreakdown.map((cat) => (
                <span
                  key={cat.name}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-muted/50 rounded-full text-xs"
                >
                  <span className="capitalize">{cat.name}</span>
                  <span className="font-medium">{formatCurrency(cat.amount, 0)}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  );
}
