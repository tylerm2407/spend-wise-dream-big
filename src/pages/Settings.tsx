import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  User,
  Target,
  Sliders,
  Download,
  Shield,
  Moon,
  Sun,
  CreditCard,
  Bell,
  ChevronRight,
  LogOut,
  Link as LinkIcon,
  Clock,
  DollarSign,
  Zap,
  Trash2,
  Plus,
  Crown,
  Calendar,
  ExternalLink,
  MapPin,
  FileText,
  UserX
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useGoals } from '@/hooks/useGoals';
import { usePurchases } from '@/hooks/usePurchases';
import { useQuickAdds } from '@/hooks/useQuickAdds';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/calculations';
import { ReferralProgram } from '@/components/ReferralProgram';
import { useBudgetNotifications } from '@/hooks/useBudgetNotifications';
import { supabase } from '@/integrations/supabase/client';

export default function Settings() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { profile, updateProfile } = useProfile();
  const { primaryGoal } = useGoals();
  const { purchases } = usePurchases();
  const { quickAdds, addQuickAdd, deleteQuickAdd, isAdding } = useQuickAdds();
  const { 
    subscribed, 
    isInTrial, 
    trialDaysRemaining, 
    trialEndDate,
    subscriptionEnd,
    openCheckout, 
    openCustomerPortal,
    loading: subscriptionLoading 
  } = useSubscription();
  const { toast } = useToast();
  const { enabled: budgetAlertsEnabled, toggleAlerts, permission, isSupported } = useBudgetNotifications();
  const [isDarkMode, setIsDarkMode] = useState(
    document.documentElement.classList.contains('dark')
  );
  const [returnRate, setReturnRate] = useState(7);
  const [includeInflation, setIncludeInflation] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isPlaidConnecting, setIsPlaidConnecting] = useState(false);
  const [isQuickAddsOpen, setIsQuickAddsOpen] = useState(false);
  const [newQuickAdd, setNewQuickAdd] = useState({ item_name: '', amount: '' });
  const [wageInputMode, setWageInputMode] = useState<'hourly' | 'yearly'>('hourly');

  // Calculate hourly wage from yearly salary or vice versa
  const hourlyWage = useMemo(() => {
    if (profile?.hourly_wage) return Number(profile.hourly_wage);
    if (profile?.monthly_income) return Number(profile.monthly_income) / 173;
    return 0;
  }, [profile]);

  const yearlySalary = useMemo(() => {
    return hourlyWage * 2080; // 40 hours/week * 52 weeks
  }, [hourlyWage]);

  const handleHourlyWageChange = (value: string) => {
    const wage = parseFloat(value) || null;
    updateProfile({ hourly_wage: wage });
  };

  const handleYearlySalaryChange = (value: string) => {
    const salary = parseFloat(value) || 0;
    const calculatedHourly = salary / 2080;
    updateProfile({ hourly_wage: calculatedHourly > 0 ? calculatedHourly : null });
  };

  const handleAddQuickAdd = () => {
    if (!newQuickAdd.item_name || !newQuickAdd.amount) {
      toast({ title: 'Please fill in both fields', variant: 'destructive' });
      return;
    }
    addQuickAdd({
      item_name: newQuickAdd.item_name,
      amount: parseFloat(newQuickAdd.amount),
      category: 'other',
      frequency: 'one-time',
    });
    setNewQuickAdd({ item_name: '', amount: '' });
    toast({ title: 'Quick Add created!' });
  };

  const handleToggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleExportData = () => {
    const data = {
      profile,
      purchases,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `true-cost-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: 'Data exported',
      description: 'Your data has been downloaded as a JSON file.',
    });
  };

  const handleExportCSV = () => {
    if (purchases.length === 0) {
      toast({
        title: 'No data to export',
        description: 'Add some purchases first.',
        variant: 'destructive',
      });
      return;
    }
    const headers = ['Date', 'Item', 'Category', 'Amount', 'Frequency'];
    const rows = purchases.map(p => [
      p.purchase_date,
      p.item_name,
      p.category,
      p.amount,
      p.frequency,
    ]);
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `true-cost-purchases-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: 'CSV exported',
      description: 'Your purchases have been downloaded as a CSV file.',
    });
  };

  const handleConnectPlaid = async () => {
    setIsPlaidConnecting(true);
    // Placeholder for Plaid integration
    toast({
      title: 'Connect Card',
      description: 'Card linking feature is being set up. Please configure your Plaid API key.',
    });
    setIsPlaidConnecting(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      // Delete user data from all tables
      const userId = user?.id;
      if (!userId) throw new Error('No user found');

      // Delete in order to respect foreign keys
      await supabase.from('price_notifications').delete().eq('user_id', userId);
      await supabase.from('price_alerts').delete().eq('user_id', userId);
      await supabase.from('purchase_patterns').delete().eq('user_id', userId);
      await supabase.from('price_history').delete().eq('user_id', userId);
      await supabase.from('saved_alternatives').delete().eq('user_id', userId);
      await supabase.from('weekly_challenges').delete().eq('user_id', userId);
      await supabase.from('achievements').delete().eq('user_id', userId);
      await supabase.from('favorites').delete().eq('user_id', userId);
      await supabase.from('quick_adds').delete().eq('user_id', userId);
      await supabase.from('purchases').delete().eq('user_id', userId);
      await supabase.from('goals').delete().eq('user_id', userId);
      await supabase.from('referrals').delete().eq('referrer_id', userId);
      await supabase.from('profiles').delete().eq('user_id', userId);

      // Sign out (account deletion from auth handled server-side)
      await signOut();
      toast({
        title: 'Account deleted',
        description: 'Your account and all data have been permanently removed.',
      });
      navigate('/');
    } catch (error) {
      toast({
        title: 'Failed to delete account',
        description: 'Please try again or contact support.',
        variant: 'destructive',
      });
    } finally {
      setIsDeletingAccount(false);
    }
  };

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
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Customize your experience
          </p>
        </header>

        <motion.main
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="px-6 space-y-6 pb-6"
        >
          {/* Profile Section */}
          <motion.div variants={itemVariants}>
            <Card className="p-6 glass-card">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-full bg-gradient-primary flex items-center justify-center">
                  <User className="h-7 w-7 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="font-semibold text-lg">{profile?.name || 'User'}</h2>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Display Name</Label>
                  <Input
                    id="name"
                    value={profile?.name || ''}
                    onChange={(e) => updateProfile({ name: e.target.value })}
                    placeholder="Your name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="income">Monthly Income</Label>
                  <Input
                    id="income"
                    type="number"
                    value={profile?.monthly_income || ''}
                    onChange={(e) => updateProfile({ monthly_income: parseFloat(e.target.value) || null })}
                    placeholder="5000"
                  />
                  <p className="text-xs text-muted-foreground">
                    Used to calculate goal impact and savings rate
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zipCode" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Zip Code
                  </Label>
                  <Input
                    id="zipCode"
                    value={profile?.zip_code || ''}
                    onChange={(e) => updateProfile({ zip_code: e.target.value.replace(/\D/g, '').slice(0, 5) })}
                    placeholder="10001"
                    maxLength={5}
                  />
                  <p className="text-xs text-muted-foreground">
                    Used to find nearby stores with real prices
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Subscription Status */}
          <motion.div variants={itemVariants}>
            <Card className="p-6 glass-card border-primary/20">
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  subscribed ? 'bg-success/10' : isInTrial ? 'bg-primary/10' : 'bg-warning/10'
                }`}>
                  <Crown className={`h-5 w-5 ${
                    subscribed ? 'text-success' : isInTrial ? 'text-primary' : 'text-warning'
                  }`} />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">
                    {subscribed ? 'Premium Subscriber' : isInTrial ? 'Free Trial' : 'Trial Expired'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {subscribed && subscriptionEnd 
                      ? `Renews ${new Date(subscriptionEnd).toLocaleDateString()}`
                      : isInTrial 
                        ? `${trialDaysRemaining} days remaining`
                        : 'Subscribe to continue using SpendWise'
                    }
                  </p>
                </div>
              </div>
              
              {subscribed ? (
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={openCustomerPortal}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Manage Subscription
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">SpendWise Premium</span>
                    <span className="font-semibold">$5/month</span>
                  </div>
                  <Button 
                    className="w-full bg-gradient-primary glow"
                    onClick={openCheckout}
                    disabled={subscriptionLoading}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    {isInTrial ? 'Subscribe Now' : 'Start Subscription'}
                  </Button>
                  {isInTrial && (
                    <p className="text-xs text-center text-muted-foreground">
                      Your trial ends on {trialEndDate ? new Date(trialEndDate).toLocaleDateString() : 'soon'}
                    </p>
                  )}
                </div>
              )}
            </Card>
          </motion.div>
 
          {/* Income & Work Hours */}
          <motion.div variants={itemVariants}>
            <Card className="p-6 glass-card">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Income & Work Hours</h3>
                  <p className="text-sm text-muted-foreground">
                    See how long purchases take to earn
                  </p>
                </div>
              </div>
              
              {/* Toggle between hourly and yearly */}
              <div className="flex gap-2 mb-4">
                <Button
                  variant={wageInputMode === 'hourly' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setWageInputMode('hourly')}
                  className="flex-1"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Hourly Wage
                </Button>
                <Button
                  variant={wageInputMode === 'yearly' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setWageInputMode('yearly')}
                  className="flex-1"
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Yearly Salary
                </Button>
              </div>

              {wageInputMode === 'hourly' ? (
                <div className="space-y-2">
                  <Label htmlFor="hourlyWage">Hourly Wage ($)</Label>
                  <Input
                    id="hourlyWage"
                    type="number"
                    value={profile?.hourly_wage || ''}
                    onChange={(e) => handleHourlyWageChange(e.target.value)}
                    placeholder="25.00"
                    step="0.01"
                  />
                  {profile?.hourly_wage && (
                    <p className="text-xs text-muted-foreground">
                      ≈ {formatCurrency(yearlySalary, 0)}/year (based on 40hr weeks)
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="yearlySalary">Yearly Salary ($)</Label>
                  <Input
                    id="yearlySalary"
                    type="number"
                    value={yearlySalary > 0 ? Math.round(yearlySalary) : ''}
                    onChange={(e) => handleYearlySalaryChange(e.target.value)}
                    placeholder="52000"
                  />
                  {hourlyWage > 0 && (
                    <p className="text-xs text-muted-foreground">
                      ≈ {formatCurrency(hourlyWage, 2)}/hour
                    </p>
                  )}
                </div>
              )}

              {hourlyWage > 0 && (
                <div className="mt-4 p-3 bg-primary/5 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    A $50 purchase = <span className="font-semibold text-foreground">{(50 / hourlyWage).toFixed(1)} hours</span> of work
                  </p>
                </div>
              )}
            </Card>
          </motion.div>

          {/* Quick Adds Management */}
          <motion.div variants={itemVariants}>
            <Collapsible open={isQuickAddsOpen} onOpenChange={setIsQuickAddsOpen}>
              <CollapsibleTrigger asChild>
                <Card className="p-4 glass-card cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                        <Zap className="h-5 w-5 text-warning" />
                      </div>
                      <div>
                        <h3 className="font-medium">Quick Adds</h3>
                        <p className="text-sm text-muted-foreground">
                          {quickAdds.length} saved • Tap to manage
                        </p>
                      </div>
                    </div>
                    <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform ${isQuickAddsOpen ? 'rotate-90' : ''}`} />
                  </div>
                </Card>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Card className="p-4 glass-card mt-2 space-y-4">
                  {/* Add new Quick Add */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Item name"
                      value={newQuickAdd.item_name}
                      onChange={(e) => setNewQuickAdd(prev => ({ ...prev, item_name: e.target.value }))}
                      className="flex-1"
                    />
                    <Input
                      placeholder="$"
                      type="number"
                      value={newQuickAdd.amount}
                      onChange={(e) => setNewQuickAdd(prev => ({ ...prev, amount: e.target.value }))}
                      className="w-20"
                    />
                    <Button
                      size="icon"
                      onClick={handleAddQuickAdd}
                      disabled={isAdding}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* List existing Quick Adds */}
                  {quickAdds.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No quick adds yet. Add your frequent purchases above.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {quickAdds.map((qa) => (
                        <div
                          key={qa.id}
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                        >
                          <div>
                            <p className="font-medium">{qa.item_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatCurrency(Number(qa.amount))} • {qa.category}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              deleteQuickAdd(qa.id);
                              toast({ title: 'Quick Add removed' });
                            }}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </CollapsibleContent>
            </Collapsible>
          </motion.div>

          {/* Referral Program */}
          <motion.div variants={itemVariants}>
            <ReferralProgram />
          </motion.div>

          {/* Goals Quick Access */}
          <motion.div variants={itemVariants}>
            <Card 
              className="p-4 glass-card cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => navigate('/goals')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Target className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">Goals</h3>
                    {primaryGoal ? (
                      <p className="text-sm text-muted-foreground">
                        Primary: {primaryGoal.name}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">No goals set</p>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </Card>
          </motion.div>

          {/* Connect Card (Plaid) */}
          <motion.div variants={itemVariants}>
            <Card className="p-4 glass-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-cta/10 flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-cta" />
                  </div>
                  <div>
                    <h3 className="font-medium">Link Credit Card</h3>
                    <p className="text-sm text-muted-foreground">
                      Auto-import purchases
                    </p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleConnectPlaid}
                  disabled={isPlaidConnecting}
                >
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Connect
                </Button>
              </div>
            </Card>
          </motion.div>

          {/* Appearance */}
          <motion.div variants={itemVariants}>
            <Card className="p-4 glass-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    {isDarkMode ? (
                      <Moon className="h-5 w-5 text-primary" />
                    ) : (
                      <Sun className="h-5 w-5 text-warning" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium">Dark Mode</h3>
                    <p className="text-sm text-muted-foreground">
                      {isDarkMode ? 'Currently on' : 'Currently off'}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={isDarkMode}
                  onCheckedChange={handleToggleDarkMode}
                  aria-label="Toggle dark mode"
                />
              </div>
            </Card>
          </motion.div>

          {/* Budget Alerts */}
          <motion.div variants={itemVariants}>
            <Card className="p-4 glass-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <Bell className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-medium">Budget Alerts</h3>
                    <p className="text-sm text-muted-foreground">
                      {!isSupported
                        ? 'Not supported in this browser'
                        : permission === 'denied'
                          ? 'Blocked — enable in browser settings'
                          : budgetAlertsEnabled
                            ? 'Alerts at 80% and 100% of daily budget'
                            : 'Get notified when approaching your limit'}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={budgetAlertsEnabled}
                  disabled={!isSupported || permission === 'denied'}
                  onCheckedChange={async (val) => {
                    const success = await toggleAlerts(val);
                    if (!success) {
                      toast({
                        title: 'Permission denied',
                        description: 'Please allow notifications in your browser settings.',
                        variant: 'destructive',
                      });
                    } else if (val) {
                      toast({ title: 'Budget alerts enabled', description: 'You\'ll be notified at 80% and 100% of your daily budget.' });
                    }
                  }}
                  aria-label="Toggle budget alerts"
                />
              </div>
            </Card>
          </motion.div>

          {/* Advanced Assumptions */}
          <motion.div variants={itemVariants}>
            <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
              <CollapsibleTrigger asChild>
                <Card className="p-4 glass-card cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <Sliders className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="font-medium">Advanced Assumptions</h3>
                        <p className="text-sm text-muted-foreground">
                          Return rate, inflation
                        </p>
                      </div>
                    </div>
                    <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform ${isAdvancedOpen ? 'rotate-90' : ''}`} />
                  </div>
                </Card>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Card className="p-6 glass-card mt-2">
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Annual Return Rate</Label>
                        <span className="text-sm font-medium">{returnRate}%</span>
                      </div>
                      <Slider
                        value={[returnRate]}
                        onValueChange={(v) => setReturnRate(v[0])}
                        min={3}
                        max={12}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Conservative (3%)</span>
                        <span>Aggressive (12%)</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Adjust for Inflation</Label>
                        <p className="text-xs text-muted-foreground">
                          Show real value (after ~3% inflation)
                        </p>
                      </div>
                      <Switch
                        checked={includeInflation}
                        onCheckedChange={setIncludeInflation}
                        aria-label="Toggle inflation adjustment"
                      />
                    </div>
                  </div>
                </Card>
              </CollapsibleContent>
            </Collapsible>
          </motion.div>

          {/* Data Export */}
          <motion.div variants={itemVariants}>
            <Card className="p-4 glass-card">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <Download className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-medium">Export Data</h3>
                  <p className="text-sm text-muted-foreground">
                    Download your data
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleExportCSV}>
                  Export CSV
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportData}>
                  Export JSON
                </Button>
              </div>
            </Card>
          </motion.div>

          {/* Privacy */}
          <motion.div variants={itemVariants}>
            <Card className="p-4 glass-card">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-success" />
                </div>
                <div>
                  <h3 className="font-medium">Your Data is Secure</h3>
                  <p className="text-sm text-muted-foreground">
                    End-to-end encrypted • You own your data
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Legal Links */}
          <motion.div variants={itemVariants}>
            <Card className="p-4 glass-card">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-medium">Legal</h3>
                  <p className="text-sm text-muted-foreground">Privacy & terms</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => navigate('/privacy-policy')}>
                  Privacy Policy
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate('/terms-of-service')}>
                  Terms of Service
                </Button>
              </div>
            </Card>
          </motion.div>

          {/* Delete Account */}
          <motion.div variants={itemVariants}>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Card className="p-4 glass-card cursor-pointer hover:bg-destructive/5 transition-colors border-destructive/10">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                      <UserX className="h-5 w-5 text-destructive" />
                    </div>
                    <div>
                      <h3 className="font-medium text-destructive">Delete Account</h3>
                      <p className="text-sm text-muted-foreground">
                        Permanently remove your account and data
                      </p>
                    </div>
                  </div>
                </Card>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your account and
                    remove all your data including purchases, goals, favorites, and settings.
                    Any active subscription will be cancelled.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    disabled={isDeletingAccount}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeletingAccount ? 'Deleting...' : 'Delete my account'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </motion.div>

          {/* Sign Out */}
          <motion.div variants={itemVariants}>
            <Button
              variant="outline"
              className="w-full h-12 text-destructive border-destructive/20 hover:bg-destructive/10"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </motion.div>
        </motion.main>
      </div>
    </AppLayout>
  );
}
