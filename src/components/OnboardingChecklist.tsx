import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, ChevronRight, X, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface ChecklistProps {
  purchaseCount: number;
  hasGoal: boolean;
  hasDailyBudget: boolean;
  hasHourlyWage: boolean;
}

interface Step {
  id: string;
  label: string;
  done: boolean;
  route: string;
}

const DISMISSED_KEY = 'onboarding_checklist_dismissed';

export function OnboardingChecklist({ purchaseCount, hasGoal, hasDailyBudget, hasHourlyWage }: ChecklistProps) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISSED_KEY) === 'true');

  const steps: Step[] = useMemo(() => [
    { id: 'purchase', label: 'Log your first purchase', done: purchaseCount >= 1, route: '/add-purchase' },
    { id: 'budget', label: 'Set a daily budget', done: hasDailyBudget, route: '/settings' },
    { id: 'wage', label: 'Add your hourly wage', done: hasHourlyWage, route: '/settings' },
    { id: 'goal', label: 'Create a savings goal', done: hasGoal, route: '/goals' },
  ], [purchaseCount, hasGoal, hasDailyBudget, hasHourlyWage]);

  const completedCount = steps.filter(s => s.done).length;
  const allDone = completedCount === steps.length;
  const progressPct = Math.round((completedCount / steps.length) * 100);

  if (dismissed || allDone) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, 'true');
    setDismissed(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="p-5 glass-card border-primary/20 relative">
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dismiss checklist"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-sm">Get Started</h3>
          <span className="text-xs text-muted-foreground ml-auto mr-6">{completedCount}/{steps.length}</span>
        </div>

        <Progress value={progressPct} className="h-1.5 mb-4" />

        <div className="space-y-2">
          {steps.map((step) => (
            <button
              key={step.id}
              onClick={() => !step.done && navigate(step.route)}
              disabled={step.done}
              className={cn(
                'flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-lg transition-all text-sm',
                step.done
                  ? 'opacity-60'
                  : 'hover:bg-secondary/50 cursor-pointer'
              )}
            >
              {step.done ? (
                <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              )}
              <span className={cn(step.done && 'line-through text-muted-foreground')}>
                {step.label}
              </span>
              {!step.done && <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />}
            </button>
          ))}
        </div>
      </Card>
    </motion.div>
  );
}
