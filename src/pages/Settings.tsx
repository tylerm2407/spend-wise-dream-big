import { useState } from 'react';
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
  Link as LinkIcon
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
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useGoals } from '@/hooks/useGoals';
import { usePurchases } from '@/hooks/usePurchases';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/calculations';

export default function Settings() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { profile, updateProfile } = useProfile();
  const { primaryGoal } = useGoals();
  const { purchases } = usePurchases();
  const { toast } = useToast();

  const [isDarkMode, setIsDarkMode] = useState(
    document.documentElement.classList.contains('dark')
  );
  const [returnRate, setReturnRate] = useState(7);
  const [includeInflation, setIncludeInflation] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isPlaidConnecting, setIsPlaidConnecting] = useState(false);

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
              </div>
            </Card>
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

          {/* Notifications */}
          <motion.div variants={itemVariants}>
            <Card className="p-4 glass-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <Bell className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-medium">Daily Reminder</h3>
                    <p className="text-sm text-muted-foreground">
                      "Log today's purchases?"
                    </p>
                  </div>
                </div>
                <Switch
                  checked={notificationsEnabled}
                  onCheckedChange={setNotificationsEnabled}
                  aria-label="Toggle notifications"
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
