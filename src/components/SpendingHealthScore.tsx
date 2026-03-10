import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Shield, TrendingDown, TrendingUp, Minus, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { usePurchases } from '@/hooks/usePurchases';
import { useProfile } from '@/hooks/useProfile';
import { useBudget } from '@/hooks/useBudget';
import { useStreaks } from '@/hooks/useStreaks';
import { formatCurrency } from '@/lib/calculations';

interface ScoreFactor {
  label: string;
  points: number;
  maxPoints: number;
  description: string;
}

function getScoreGrade(score: number): { grade: string; color: string; label: string } {
  if (score >= 85) return { grade: 'A', color: 'text-success', label: 'Excellent' };
  if (score >= 70) return { grade: 'B', color: 'text-primary', label: 'Good' };
  if (score >= 55) return { grade: 'C', color: 'text-warning', label: 'Fair' };
  if (score >= 40) return { grade: 'D', color: 'text-orange-500', label: 'Needs Work' };
  return { grade: 'F', color: 'text-destructive', label: 'Poor' };
}

export function SpendingHealthScore() {
  const { monthlyTotal, monthlyChange, purchases } = usePurchases();
  const { profile } = useProfile();
  const { budgetStatuses, overBudgetCount } = useBudget();
  const { currentStreak } = useStreaks();

  const { score, factors } = useMemo(() => {
    const factors: ScoreFactor[] = [];
    let totalScore = 0;
    let totalMax = 0;

    // Factor 1: Savings rate (0-35 pts)
    const income = profile?.monthly_income ? Number(profile.monthly_income) : 0;
    if (income > 0) {
      const savingsRate = Math.max(0, (income - monthlyTotal) / income);
      const savingsPoints = Math.min(35, Math.round(savingsRate * 50)); // 70%+ savings = 35 pts
      factors.push({
        label: 'Savings Rate',
        points: savingsPoints,
        maxPoints: 35,
        description: income > 0
          ? `Saving ${Math.round(savingsRate * 100)}% of income this month`
          : 'Set your monthly income in Settings',
      });
      totalScore += savingsPoints;
      totalMax += 35;
    }

    // Factor 2: Spending trend (0-25 pts)
    const trendPoints = monthlyChange < -10
      ? 25
      : monthlyChange < 0
      ? 20
      : monthlyChange < 10
      ? 15
      : monthlyChange < 25
      ? 10
      : 5;
    factors.push({
      label: 'Spending Trend',
      points: trendPoints,
      maxPoints: 25,
      description: monthlyChange < 0
        ? `Spending down ${Math.abs(Math.round(monthlyChange))}% vs last month`
        : monthlyChange === 0
        ? 'Spending stable vs last month'
        : `Spending up ${Math.round(monthlyChange)}% vs last month`,
    });
    totalScore += trendPoints;
    totalMax += 25;

    // Factor 3: Budget adherence (0-25 pts)
    if (budgetStatuses.length > 0) {
      const onBudget = budgetStatuses.length - overBudgetCount;
      const budgetPoints = Math.round((onBudget / budgetStatuses.length) * 25);
      factors.push({
        label: 'Budget Adherence',
        points: budgetPoints,
        maxPoints: 25,
        description: overBudgetCount === 0
          ? 'All categories within budget'
          : `${overBudgetCount} of ${budgetStatuses.length} categories over budget`,
      });
      totalScore += budgetPoints;
      totalMax += 25;
    }

    // Factor 4: Consistency streak (0-15 pts)
    const streakPoints = Math.min(15, currentStreak * 3);
    factors.push({
      label: 'Tracking Streak',
      points: streakPoints,
      maxPoints: 15,
      description: currentStreak > 0
        ? `${currentStreak}-day tracking streak`
        : 'Log purchases daily to build your streak',
    });
    totalScore += streakPoints;
    totalMax += 15;

    const finalScore = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;
    return { score: finalScore, factors };
  }, [profile, monthlyTotal, monthlyChange, budgetStatuses, overBudgetCount, currentStreak]);

  const { grade, color, label } = getScoreGrade(score);

  return (
    <Card className="p-5 glass-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Spending Health Score</h3>
            <p className="text-xs text-muted-foreground">Based on this month's activity</p>
          </div>
        </div>
        <div className="text-right">
          <span className={`text-3xl font-bold ${color}`}>{score}</span>
          <span className="text-muted-foreground text-lg">/100</span>
        </div>
      </div>

      {/* Score bar */}
      <div className="mb-1">
        <Progress
          value={score}
          className={`h-3 ${
            score >= 85 ? '[&>div]:bg-success' :
            score >= 70 ? '[&>div]:bg-primary' :
            score >= 55 ? '[&>div]:bg-warning' :
            '[&>div]:bg-destructive'
          }`}
        />
      </div>
      <p className={`text-xs font-medium mb-4 ${color}`}>{label}</p>

      {/* Factors */}
      <div className="space-y-2">
        {factors.map(factor => (
          <div key={factor.label} className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-xs font-medium">{factor.label}</span>
                <span className="text-xs text-muted-foreground">{factor.points}/{factor.maxPoints}</span>
              </div>
              <p className="text-xs text-muted-foreground truncate">{factor.description}</p>
            </div>
          </div>
        ))}
      </div>

      <Link to="/budget" className="mt-4 flex items-center justify-between text-xs text-primary hover:opacity-80 transition-opacity pt-3 border-t border-border/50">
        <span>Set budget limits to improve your score</span>
        <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    </Card>
  );
}
