import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Plus,
  Target,
  Star,
  Trash2,
  Calendar,
  DollarSign,
  Loader2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useGoals } from '@/hooks/useGoals';
import { useGoalMilestones } from '@/hooks/useGoalMilestones';
import { useToast } from '@/hooks/use-toast';
import { useSubscriptionGate } from '@/hooks/useSubscriptionGate';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { GoalsSkeleton, ErrorState } from '@/components/PageSkeletons';
import { PaywallDialog } from '@/components/PaywallDialog';
import { formatCurrency, calculateGoalProgress } from '@/lib/calculations';
import { cn } from '@/lib/utils';
import { Database } from '@/integrations/supabase/types';

type GoalPriority = Database['public']['Enums']['goal_priority'];

export default function Goals() {
  const navigate = useNavigate();
  const { goals, addGoal, updateGoal, deleteGoal, setPrimaryGoal, isAdding, isLoading, error } = useGoals();
  const { checkAndCelebrateMilestones } = useGoalMilestones();
  const { toast } = useToast();
  const { guardAction, showPaywall, dismissPaywall } = useSubscriptionGate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [priority, setPriority] = useState<GoalPriority>('medium');

  // Progress dialog state
  const [progressDialogOpen, setProgressDialogOpen] = useState(false);
  const [progressAmount, setProgressAmount] = useState('');
  const [progressGoal, setProgressGoal] = useState<{
    id: string;
    currentAmount: number;
    targetAmount: number;
    name: string;
  } | null>(null);

  const handleAddGoal = () => {
    if (!name || !amount) {
      toast({
        title: 'Missing information',
        description: 'Please enter a goal name and amount.',
        variant: 'destructive',
      });
      return;
    }

    addGoal({
      name,
      target_amount: parseFloat(amount),
      target_date: targetDate || null,
      priority,
      is_primary: goals.length === 0,
    }, {
      onSuccess: () => {
        toast({
          title: 'Goal created!',
          description: `"${name}" has been added to your goals.`,
        });
        setIsDialogOpen(false);
        resetForm();
      },
    });
  };

  const openProgressDialog = (goalId: string, currentAmount: number, targetAmount: number, goalName: string) => {
    setProgressGoal({ id: goalId, currentAmount, targetAmount, name: goalName });
    setProgressAmount('');
    setProgressDialogOpen(true);
  };

  const handleSubmitProgress = () => {
    if (!progressGoal) return;
    const addAmount = parseFloat(progressAmount) || 0;
    if (addAmount <= 0) {
      toast({
        title: 'Invalid amount',
        description: 'Please enter an amount greater than zero.',
        variant: 'destructive',
      });
      return;
    }

    const previousProgress = calculateGoalProgress(progressGoal.currentAmount, progressGoal.targetAmount);
    const newAmount = progressGoal.currentAmount + addAmount;
    const newProgress = calculateGoalProgress(newAmount, progressGoal.targetAmount);

    updateGoal({ id: progressGoal.id, current_amount: newAmount });
    setProgressDialogOpen(false);
    
    // Check if goal completed
    if (newAmount >= progressGoal.targetAmount) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      toast({
        title: '🎉 Goal completed!',
        description: 'Congratulations on reaching your goal!',
      });
    } else {
      // Check for milestone celebrations (25%, 50%, 75%)
      checkAndCelebrateMilestones(progressGoal.id, progressGoal.name, previousProgress, newProgress);
      toast({
        title: 'Progress updated',
        description: `Added ${formatCurrency(addAmount)} to "${progressGoal.name}"`,
      });
    }
  };

  const resetForm = () => {
    setName('');
    setAmount('');
    setTargetDate('');
    setPriority('medium');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-hero pb-6">
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg px-6 py-4 border-b border-border pt-[env(safe-area-inset-top)]">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/home')} className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Goals</h1>
          </div>
        </header>
        <GoalsSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-hero pb-6">
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg px-6 py-4 border-b border-border pt-[env(safe-area-inset-top)]">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/home')} className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Goals</h1>
          </div>
        </header>
        <ErrorState onRetry={() => window.location.reload()} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero pb-6">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg px-6 py-4 border-b border-border pt-[env(safe-area-inset-top)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/home')}
              className="rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Goals</h1>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <Button className="bg-gradient-primary" onClick={() => guardAction(() => setIsDialogOpen(true))}>
              <Plus className="h-4 w-4 mr-2" />
              Add Goal
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Goal</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="goalName">Goal Name</Label>
                  <Input
                    id="goalName"
                    placeholder="e.g., Vacation to Bali"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="goalAmount">Target Amount</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="goalAmount"
                      type="number"
                      placeholder="5,000"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="goalDate">Target Date (optional)</Label>
                  <Input
                    id="goalDate"
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={priority} onValueChange={(v) => setPriority(v as GoalPriority)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleAddGoal}
                  className="w-full bg-gradient-primary"
                  disabled={isAdding}
                >
                  {isAdding ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Create Goal'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="px-6 py-6 space-y-4">
        {goals.length === 0 ? (
          <div className="text-center py-12">
            <Target className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No goals yet</h2>
            <p className="text-muted-foreground mb-6">
              Set your first goal to start tracking your progress
            </p>
            <Button 
              onClick={() => setIsDialogOpen(true)}
              className="bg-gradient-primary"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Goal
            </Button>
          </div>
        ) : (
          goals.map((goal, index) => {
            const progress = calculateGoalProgress(
              Number(goal.current_amount),
              Number(goal.target_amount)
            );
            const remaining = Number(goal.target_amount) - Number(goal.current_amount);
            
            return (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={cn(
                  'p-6 glass-card',
                  goal.is_primary && 'ring-2 ring-primary'
                )}>
                  <div className="flex items-start gap-4">
                    <ProgressRing
                      progress={progress}
                      size={80}
                      strokeWidth={6}
                      status={goal.is_completed ? 'on-track' : 'on-track'}
                    >
                      <span className="text-lg font-bold">{progress}%</span>
                    </ProgressRing>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {goal.is_primary && (
                              <Star className="h-4 w-4 text-warning fill-warning" />
                            )}
                            <h3 className="font-semibold truncate">{goal.name}</h3>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {formatCurrency(Number(goal.current_amount), 0)} of{' '}
                            {formatCurrency(Number(goal.target_amount), 0)}
                          </p>
                          {remaining > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatCurrency(remaining, 0)} to go
                            </p>
                          )}
                          {goal.target_date && (
                            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              <span>
                                Target: {new Date(goal.target_date).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-col gap-1">
                          {!goal.is_primary && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-warning hover:text-warning"
                              onClick={() => setPrimaryGoal(goal.id)}
                              aria-label="Set as primary goal"
                            >
                              <Star className="h-4 w-4" />
                            </Button>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                aria-label="Delete goal"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete goal?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete "{goal.name}" and all its progress. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteGoal(goal.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                      
                      {!goal.is_completed && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3"
                          onClick={() => openProgressDialog(
                            goal.id,
                            Number(goal.current_amount),
                            Number(goal.target_amount),
                            goal.name
                          )}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Progress
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })
        )}
      </main>

      {/* Add Progress Dialog */}
      <Dialog open={progressDialogOpen} onOpenChange={setProgressDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Progress</DialogTitle>
          </DialogHeader>
          {progressGoal && (
            <div className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">
                How much did you save towards <span className="font-medium text-foreground">"{progressGoal.name}"</span>?
              </p>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder="0.00"
                  value={progressAmount}
                  onChange={(e) => setProgressAmount(e.target.value)}
                  className="pl-10 h-12 text-lg"
                  step="0.01"
                  min="0"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSubmitProgress();
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Current: {formatCurrency(progressGoal.currentAmount)}</span>
                <span>Goal: {formatCurrency(progressGoal.targetAmount)}</span>
              </div>
              <Button
                onClick={handleSubmitProgress}
                className="w-full bg-gradient-primary"
              >
                Save Progress
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <PaywallDialog open={showPaywall} onOpenChange={dismissPaywall} />
    </div>
  );
}
