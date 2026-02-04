import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Plus, 
  TrendingUp, 
  TrendingDown,
  Target,
  DollarSign,
  LogOut,
  History,
  Settings
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { usePurchases } from '@/hooks/usePurchases';
import { useGoals } from '@/hooks/useGoals';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { SpendingCharts } from '@/components/SpendingCharts';
import { SmarterSpendingSuggestions } from '@/components/SmarterSpendingSuggestions';
import { WeeklySpendingChallenge } from '@/components/WeeklySpendingChallenge';
import { formatCurrency, calculateGoalProgress, getGoalStatus } from '@/lib/calculations';
import { cn } from '@/lib/utils';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { profile, isLoading: profileLoading } = useProfile();
  const { purchases, monthlyTotal, lastMonthTotal, monthlyChange, topCategory, recentPurchases } = usePurchases();
  const { primaryGoal, activeGoals } = useGoals();

  useEffect(() => {
    if (!profileLoading && profile && !profile.onboarding_completed) {
      navigate('/onboarding');
    }
  }, [profile, profileLoading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

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
    <div className="min-h-screen bg-gradient-hero pb-24">
      {/* Header */}
      <header className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm">Welcome back,</p>
            <h1 className="text-xl font-bold">
              {profile?.name || 'Friend'}
            </h1>
          </div>
          <div className="flex gap-2">
            <Link to="/history">
              <Button variant="ghost" size="icon" className="rounded-full">
                <History className="h-5 w-5" />
              </Button>
            </Link>
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full"
              onClick={handleSignOut}
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <motion.main
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="px-6 space-y-6"
      >
        {/* Primary Goal Card */}
        {primaryGoal && (
          <motion.div variants={itemVariants}>
            <Card className="p-6 glass-card">
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
          </motion.div>
        )}

        {/* Stats Grid */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4">
          {/* Monthly Spending */}
          <Card className="p-4 glass-card">
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

          {/* Top Category */}
          <Card className="p-4 glass-card">
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
        </motion.div>

        {/* Recent Purchases */}
        <motion.div variants={itemVariants}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">Recent Purchases</h2>
            <Link to="/history" className="text-sm text-primary hover:underline">
              See all
            </Link>
          </div>
          
          {recentPurchases.length === 0 ? (
            <Card className="p-8 glass-card text-center">
              <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No purchases yet</p>
              <Link to="/add-purchase">
                <Button className="bg-gradient-primary">
                  <Plus className="h-4 w-4 mr-2" />
                  Add your first purchase
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="space-y-3">
              {recentPurchases.map((purchase, index) => (
                <motion.div
                  key={purchase.id}
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
                        <p className="text-xs text-muted-foreground">
                          {new Date(purchase.purchase_date!).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Weekly Spending Challenge */}
        <motion.div variants={itemVariants}>
          <WeeklySpendingChallenge />
        </motion.div>

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

        {/* Spending Charts */}
        {purchases.length > 0 && (
          <motion.div variants={itemVariants}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">Spending Insights</h2>
            </div>
            <SpendingCharts purchases={purchases} />
          </motion.div>
        )}

        {/* Goals Section */}
        {activeGoals.length > 1 && (
          <motion.div variants={itemVariants}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">Other Goals</h2>
              <Link to="/goals" className="text-sm text-primary hover:underline">
                Manage
              </Link>
            </div>
            <div className="space-y-3">
              {activeGoals.filter(g => !g.is_primary).slice(0, 2).map((goal) => {
                const progress = calculateGoalProgress(
                  Number(goal.current_amount),
                  Number(goal.target_amount)
                );
                return (
                  <Card key={goal.id} className="p-4 glass-card">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium">{goal.name}</p>
                      <span className="text-sm text-muted-foreground">{progress}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                      />
                    </div>
                  </Card>
                );
              })}
            </div>
          </motion.div>
        )}
      </motion.main>

      {/* FAB */}
      <Link to="/add-purchase">
        <motion.button
          className="fab flex items-center justify-center text-primary-foreground"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Add purchase"
        >
          <Plus className="h-7 w-7" />
        </motion.button>
      </Link>
    </div>
  );
}