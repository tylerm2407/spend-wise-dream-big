import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Wallet, 
  Pencil,
  DollarSign,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/calculations';
import { cn } from '@/lib/utils';

interface DailyBudgetTrackerProps {
  todayTotal: number;
}

export function DailyBudgetTracker({ todayTotal }: DailyBudgetTrackerProps) {
  const { profile, updateProfile } = useProfile();
  const { toast } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [newBudget, setNewBudget] = useState('');

  const dailyBudget = profile?.daily_budget ? Number(profile.daily_budget) : null;

  const handleSetBudget = () => {
    if (dailyBudget) {
      setNewBudget(String(dailyBudget));
    }
    setEditOpen(true);
  };

  const handleSaveBudget = () => {
    const parsed = parseFloat(newBudget);
    if (!parsed || parsed <= 0) {
      toast({
        title: 'Invalid amount',
        description: 'Please enter a positive budget amount.',
        variant: 'destructive',
      });
      return;
    }
    updateProfile({ daily_budget: parsed });
    setEditOpen(false);
    toast({ title: 'Budget set', description: `Daily budget set to ${formatCurrency(parsed)}` });
  };

  // No budget set — show setup prompt
  if (!dailyBudget) {
    return (
      <>
        <Card
          className="p-4 glass-card cursor-pointer hover:border-primary/30 transition-colors"
          onClick={handleSetBudget}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Wallet className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">Set a Daily Budget</p>
              <p className="text-xs text-muted-foreground">
                Track daily spending against a limit you choose
              </p>
            </div>
            <Pencil className="h-4 w-4 text-muted-foreground" />
          </div>
        </Card>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Set Daily Budget</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">
                How much do you want to spend per day maximum?
              </p>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder="50"
                  value={newBudget}
                  onChange={(e) => setNewBudget(e.target.value)}
                  className="pl-10 h-12 text-lg"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveBudget();
                  }}
                />
              </div>
              <div className="flex gap-2">
                {[30, 50, 75, 100].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setNewBudget(String(preset))}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-sm font-medium transition-all border",
                      newBudget === String(preset)
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-muted/50 border-border hover:border-primary/50"
                    )}
                  >
                    ${preset}
                  </button>
                ))}
              </div>
              <Button onClick={handleSaveBudget} className="w-full bg-gradient-primary">
                Set Budget
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Budget set — show progress
  const pct = Math.min(100, Math.round((todayTotal / dailyBudget) * 100));
  const remaining = Math.max(0, dailyBudget - todayTotal);
  const isOver = todayTotal > dailyBudget;
  const isWarning = pct >= 80 && !isOver;

  return (
    <>
      <Card className={cn(
        "p-4 glass-card",
        isOver && "border-destructive/30",
        isWarning && "border-warning/30"
      )}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Daily Budget</span>
          </div>
          <button
            onClick={handleSetBudget}
            className="text-xs text-primary hover:underline"
          >
            Edit
          </button>
        </div>

        <div className="flex items-baseline justify-between mb-2">
          <p className="text-lg font-bold">
            {formatCurrency(todayTotal, 0)}
            <span className="text-sm font-normal text-muted-foreground">
              {' '}of {formatCurrency(dailyBudget, 0)}
            </span>
          </p>
          <div className={cn(
            "flex items-center gap-1 text-xs font-medium",
            isOver ? "text-destructive" : isWarning ? "text-warning" : "text-success"
          )}>
            {isOver ? (
              <>
                <AlertTriangle className="h-3 w-3" />
                <span>Over by {formatCurrency(todayTotal - dailyBudget, 0)}</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3 w-3" />
                <span>{formatCurrency(remaining, 0)} left</span>
              </>
            )}
          </div>
        </div>

        <Progress
          value={pct}
          className={cn(
            "h-2",
            isOver && "[&>div]:bg-destructive",
            isWarning && "[&>div]:bg-warning"
          )}
        />
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Daily Budget</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              Adjust your daily spending limit.
            </p>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="number"
                placeholder="50"
                value={newBudget}
                onChange={(e) => setNewBudget(e.target.value)}
                className="pl-10 h-12 text-lg"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveBudget();
                }}
              />
            </div>
            <div className="flex gap-2">
              {[30, 50, 75, 100].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setNewBudget(String(preset))}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-sm font-medium transition-all border",
                    newBudget === String(preset)
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-muted/50 border-border hover:border-primary/50"
                  )}
                >
                  ${preset}
                </button>
              ))}
            </div>
            <Button onClick={handleSaveBudget} className="w-full bg-gradient-primary">
              Save Budget
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
