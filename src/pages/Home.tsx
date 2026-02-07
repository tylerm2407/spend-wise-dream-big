import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  TrendingUp, 
  TrendingDown,
  Target,
  DollarSign,
  ChevronRight,
  Trophy,
  Heart,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { usePurchases } from '@/hooks/usePurchases';
import { useGoals } from '@/hooks/useGoals';
import { useHaptics } from '@/hooks/useHaptics';
import { useWeeklyChallenge } from '@/hooks/useWeeklyChallenge';
import { useStreaks } from '@/hooks/useStreaks';
import { AppLayout } from '@/components/AppLayout';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import { TapScale } from '@/components/ui/TapScale';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { SmarterSpendingSuggestions } from '@/components/SmarterSpendingSuggestions';
import { StreakDisplay } from '@/components/StreakDisplay';
import { DailyBudgetTracker } from '@/components/DailyBudgetTracker';
import { WeeklyRecapCard } from '@/components/WeeklyRecapCard';
import { formatCurrency, calculateGoalProgress, getGoalStatus } from '@/lib/calculations';
import { cn } from '@/lib/utils';

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, isLoading: profileLoading } = useProfile();
  const { purchases, monthlyTotal, monthlyChange, topCategory, recentPurchases } = usePurchases();
  const { primaryGoal, activeGoals } = useGoals();
  const { haptic } = useHaptics();
  const { currentChallenge, progressPercent } = useWeeklyChallenge();
  const { currentStreak, longestStreak, streakFreezesRemaining, streakEvent, welcomeMessage, encouragementMessage, dismissStreakEvent } = useStreaks();

  useEffect(() => {
    if (!profileLoading && profile && !profile.onboarding_completed) {
      navigate('/onboarding');
    }
  }, [profile, profileLoading, navigate]);

  const goalProgress = primaryGoal 
    ? calculateGoalProgress(Number(primaryGoal.current_amount), Number(primaryGoal.target_amount))
    : 0;
  
  const goalStatus = primaryGoal && profile?.monthly_income
    ? getGoalStatus(
        Number(primaryGoal.current_amount),
        Number(primaryGoal.target_amount),
        primaryGoal.target_date ? new Date(primaryGoal.target_date) : null,
        Number(profile.monthly_income) * 0.2
      )
    : 'on-track';

  // Calculate today's total
  const today = new Date().toISOString().split('T')[0];
  const todayTotal = purchases
    .filter(p => p.purchase_date === today)
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
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
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Welcome back,</p>
              <h1 className="text-xl font-bold">
                {profile?.name || 'Friend'}
              </h1>
            </div>
            {currentStreak > 0 && (
              <StreakDisplay
                currentStreak={currentStreak}
                longestStreak={longestStreak}
                freezesRemaining={streakFreezesRemaining}
                onClick={() => navigate('/challenges')}
                compact
              />
            )}
          </div>
        </header>

        <motion.main
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="px-6 space-y-6 pb-6"
        >
          {/* Streak Lost — Welcome Back Banner */}
          <AnimatePresence>
            {streakEvent?.type === 'streak_lost' && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
              >
                <Card className="p-5 bg-gradient-to-br from-primary/10 via-background to-accent/10 border-primary/30 relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7 text-muted-foreground"
                    onClick={dismissStreakEvent}
                    aria-label="Dismiss"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <div className="flex items-start gap-3 pr-6">
                    <div className="p-2 rounded-full bg-primary/10 flex-shrink-0">
                      <Heart className="h-5 w-5 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-semibold text-foreground">
                        {welcomeMessage}
                      </p>
                      <p className="text-sm text-muted-foreground italic">
                        {encouragementMessage}
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
          {/* Weekly Recap */}
          <WeeklyRecapCard />

          {/* Today's Summary */}
          <motion.div variants={itemVariants}>
            <AnimatedCard className="p-6 glass-card" interactive={false}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Today's Spending</h2>
                <span className="text-xs text-muted-foreground">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <AnimatedCounter
                    value={todayTotal}
                    className="text-3xl font-bold"
                    decimals={0}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    spent today
                  </p>
                </div>
                <Link to="/add-purchase">
                 <AnimatedButton className="bg-gradient-primary hover:opacity-90 glow h-12 px-6" haptic="medium">
                    <Plus className="h-5 w-5 mr-2" />
                    Add Purchase
                  </AnimatedButton>
                </Link>
              </div>
            </AnimatedCard>
          </motion.div>

          {/* Daily Budget Tracker */}
          <motion.div variants={itemVariants}>
            <DailyBudgetTracker todayTotal={todayTotal} />
          </motion.div>

          {/* Primary Goal Card */}
          {primaryGoal && (
            <motion.div variants={itemVariants}>
              <TapScale haptic="selection" onClick={() => navigate('/goals')}>
                <Card className="p-6 glass-card cursor-pointer">
                  <div className="flex items-center gap-6">
                    <ProgressRing
                      progress={goalProgress}
                      size={100}
                      strokeWidth={8}
                      status={goalStatus}
                    >
                      <div className="text-center">
                        <span className="text-2xl font-bold">{goalProgress}%</span>
                      </div>
                    </ProgressRing>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Target className="h-4 w-4 text-primary" />
                        <span className="text-sm text-muted-foreground">Primary Goal</span>
                      </div>
                      <h3 className="font-semibold text-lg mb-1">{primaryGoal.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(Number(primaryGoal.current_amount), 0)} of{' '}
                        {formatCurrency(Number(primaryGoal.target_amount), 0)}
                      </p>
                      <div className={cn(
                        'inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium',
                        goalStatus === 'on-track' && 'bg-success/10 text-success',
                        goalStatus === 'at-risk' && 'bg-warning/10 text-warning',
                        goalStatus === 'off-track' && 'bg-destructive/10 text-destructive',
                      )}>
                        {goalStatus === 'on-track' && 'On Track'}
                        {goalStatus === 'at-risk' && 'At Risk'}
                        {goalStatus === 'off-track' && 'Behind'}
                      </div>
                    </div>
                  </div>
                </Card>
              </TapScale>
            </motion.div>
          )}

          {/* Stats Grid */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4">
            {/* Monthly Spending */}
            <TapScale haptic="light" onClick={() => navigate('/insights')}>
              <Card className="p-4 glass-card cursor-pointer">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">This Month</span>
                </div>
                <AnimatedCounter
                  value={monthlyTotal}
                  className="currency-medium text-foreground"
                  decimals={0}
                />
                <div className={cn(
                  'flex items-center gap-1 mt-1 text-xs',
                  monthlyChange > 0 ? 'text-destructive' : 'text-success'
                )}>
                  {monthlyChange > 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span>
                    {monthlyChange > 0 ? '+' : ''}{monthlyChange.toFixed(0)}% vs last month
                  </span>
                </div>
              </Card>
            </TapScale>

            {/* Top Category */}
            <TapScale haptic="light" onClick={() => navigate('/insights')}>
              <Card className="p-4 glass-card cursor-pointer">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Top Category</span>
                </div>
                {topCategory ? (
                  <>
                    <p className="font-semibold text-lg capitalize">{topCategory.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(topCategory.amount, 0)}
                    </p>
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm">No purchases yet</p>
                )}
              </Card>
            </TapScale>
          </motion.div>

          {/* Recent Purchases */}
          <motion.div variants={itemVariants}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">Recent Purchases</h2>
              <Link to="/history" className="text-sm text-primary hover:underline flex items-center gap-1">
                See all
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            
            {recentPurchases.length === 0 ? (
              <Card className="p-8 glass-card text-center">
                <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-2">No purchases yet</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Log your first purchase in under 30 seconds
                </p>
                <Link to="/add-purchase">
                 <AnimatedButton className="bg-gradient-primary" haptic="medium">
                    <Plus className="h-4 w-4 mr-2" />
                    Add your first purchase
                  </AnimatedButton>
                </Link>
              </Card>
            ) : (
              <div className="space-y-3">
                {recentPurchases.slice(0, 3).map((purchase, index) => (
                  <TapScale
                    key={purchase.id}
                    haptic="selection"
                  >
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="p-4 glass-card">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{purchase.item_name}</p>
                            <p className="text-sm text-muted-foreground capitalize">
                              {purchase.category}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{formatCurrency(Number(purchase.amount))}</p>
                            <Link 
                              to="/insights" 
                              className="text-xs text-primary hover:underline"
                            >
                              See true cost →
                            </Link>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  </TapScale>
                ))}
              </div>
            )}
          </motion.div>

          {/* Weekly Challenge Preview */}
          {currentChallenge && (
            <motion.div variants={itemVariants}>
              <TapScale haptic="selection" onClick={() => navigate('/challenges')}>
                <Card className="p-4 glass-card cursor-pointer">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-full bg-warning/10">
                        <Trophy className="h-4 w-4 text-warning" />
                      </div>
                      <div>
                        <h3 className="font-medium text-sm">Weekly Challenge</h3>
                        <p className="text-xs text-muted-foreground">
                          {currentChallenge.is_completed ? 'Completed!' : `${progressPercent}% progress`}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <Progress 
                    value={progressPercent} 
                    className={cn(
                      "h-2",
                      currentChallenge.is_completed && "[&>div]:bg-success"
                    )}
                  />
                </Card>
              </TapScale>
            </motion.div>
          )}

          {/* Smarter Spending Suggestions */}
          {purchases.length > 0 && (
            <motion.div variants={itemVariants}>
              <SmarterSpendingSuggestions 
                purchases={purchases}
                primaryGoal={primaryGoal ?? null}
                monthlyIncome={profile?.monthly_income}
              />
            </motion.div>
          )}
        </motion.main>
      </div>
    </AppLayout>
  );
}
