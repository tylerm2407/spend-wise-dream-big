import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, 
  Flame, 
  Target, 
  Gift, 
  CheckCircle2,
  Sparkles,
  ChevronRight,
  Zap
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useWeeklyChallenge } from '@/hooks/useWeeklyChallenge';
import { formatCurrency } from '@/lib/calculations';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';
import { format, parseISO } from 'date-fns';

export function WeeklySpendingChallenge() {
  const { 
    currentChallenge, 
    challengeHistory,
    isLoading, 
    claimReward,
    progressPercent 
  } = useWeeklyChallenge();
  const [showHistory, setShowHistory] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  const handleClaimReward = async () => {
    if (!currentChallenge?.is_completed || currentChallenge?.reward_claimed) return;
    
    setIsClaiming(true);
    
    // Fire confetti!
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
    
    await claimReward();
    setIsClaiming(false);
  };

  if (isLoading || !currentChallenge) {
    return (
      <Card className="p-6 animate-pulse">
        <div className="h-32 bg-muted rounded-lg" />
      </Card>
    );
  }

  const streakCount = currentChallenge.streak_count || 0;
  const isCompleted = currentChallenge.is_completed;
  const rewardClaimed = currentChallenge.reward_claimed;
  const targetSavings = Number(currentChallenge.target_savings);
  const actualSavings = Number(currentChallenge.actual_savings);
  const alternativesChosen = currentChallenge.alternatives_chosen;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-full bg-warning/10">
          <Trophy className="h-5 w-5 text-warning" />
        </div>
        <div className="flex-1">
          <h2 className="font-semibold text-lg">Weekly Savings Challenge</h2>
          <p className="text-sm text-muted-foreground">
            {format(parseISO(currentChallenge.week_start), 'MMM d')} - {format(parseISO(currentChallenge.week_end), 'MMM d')}
          </p>
        </div>
        {streakCount > 0 && (
          <div className="flex items-center gap-1 px-3 py-1 bg-destructive/10 rounded-full">
            <Flame className="h-4 w-4 text-destructive" />
            <span className="text-sm font-bold text-destructive">{streakCount}</span>
          </div>
        )}
      </div>

      {/* Main Challenge Card */}
      <Card className={cn(
        "p-5 transition-all overflow-hidden relative",
        isCompleted && !rewardClaimed && "border-warning/50 bg-gradient-to-br from-warning/10 via-background to-background",
        isCompleted && rewardClaimed && "border-success/50 bg-gradient-to-br from-success/10 via-background to-background"
      )}>
        {isCompleted && !rewardClaimed && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="absolute top-2 right-2">
              <Sparkles className="h-6 w-6 text-warning animate-pulse" />
            </div>
          </motion.div>
        )}

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <span className="font-medium">Save {formatCurrency(targetSavings)}</span>
          </div>
          <span className={cn(
            "text-2xl font-bold",
            isCompleted ? "text-success" : "text-foreground"
          )}>
            {progressPercent}%
          </span>
        </div>

        <Progress 
          value={progressPercent} 
          className={cn(
            "h-3 mb-4",
            isCompleted && "[&>div]:bg-success"
          )}
        />

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className={cn(
              "text-xl font-bold",
              isCompleted ? "text-success" : "text-primary"
            )}>
              {formatCurrency(actualSavings)}
            </p>
            <p className="text-xs text-muted-foreground">saved this week</p>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-xl font-bold text-primary">{alternativesChosen}</p>
            <p className="text-xs text-muted-foreground">smarter choices</p>
          </div>
        </div>

        {/* Challenge Status */}
        {!isCompleted && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Zap className="h-4 w-4 text-warning" />
            <span>
              {formatCurrency(targetSavings - actualSavings)} more to complete the challenge!
            </span>
          </div>
        )}

        {isCompleted && !rewardClaimed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Button
              onClick={handleClaimReward}
              disabled={isClaiming}
              className="w-full bg-gradient-to-r from-warning to-warning/80 text-warning-foreground hover:from-warning/90 hover:to-warning/70"
            >
              <Gift className="h-4 w-4 mr-2" />
              {isClaiming ? 'Claiming...' : 'Claim Your Reward! 🎉'}
            </Button>
          </motion.div>
        )}

        {isCompleted && rewardClaimed && (
          <div className="flex items-center justify-center gap-2 py-2 text-success">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">Challenge Complete! 🏆</span>
          </div>
        )}
      </Card>

      {/* Streak Info */}
      {streakCount >= 2 && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Card className="p-4 bg-gradient-to-r from-destructive/10 to-transparent border-destructive/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
                <Flame className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="font-semibold">{streakCount} Week Streak! 🔥</p>
                <p className="text-sm text-muted-foreground">
                  You're on fire! Keep making smarter choices.
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* History Toggle */}
      {challengeHistory.length > 1 && (
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center justify-between w-full p-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <span>View past challenges</span>
          <ChevronRight className={cn(
            "h-4 w-4 transition-transform",
            showHistory && "rotate-90"
          )} />
        </button>
      )}

      {/* History */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2 overflow-hidden"
          >
            {challengeHistory.slice(1, 5).map((challenge) => (
              <Card key={challenge.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      {format(parseISO(challenge.week_start), 'MMM d')} - {format(parseISO(challenge.week_end), 'MMM d')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {challenge.alternatives_chosen} choices • {formatCurrency(Number(challenge.actual_savings))} saved
                    </p>
                  </div>
                  {challenge.is_completed ? (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      {Math.round((Number(challenge.actual_savings) / Number(challenge.target_savings)) * 100)}%
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
