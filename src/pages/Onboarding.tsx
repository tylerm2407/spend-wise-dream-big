import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, 
  ArrowLeft,
  Target, 
  TrendingUp,
  Sparkles,
  DollarSign,
  User,
   Loader2,
   Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useProfile } from '@/hooks/useProfile';
import { useGoals } from '@/hooks/useGoals';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [hourlyWage, setHourlyWage] = useState('');
  const [showWorkHours, setShowWorkHours] = useState(false);
  const [goalName, setGoalName] = useState('');
  const [goalAmount, setGoalAmount] = useState('');
  const navigate = useNavigate();
  const { updateProfileAsync } = useProfile();
  const { addGoal } = useGoals();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      // Calculate hourly wage if not provided but income is
      let calculatedHourlyWage = hourlyWage ? parseFloat(hourlyWage) : null;
      if (!calculatedHourlyWage && monthlyIncome && showWorkHours) {
        // Assume 40 hours/week, 4.33 weeks/month
        calculatedHourlyWage = parseFloat(monthlyIncome) / (40 * 4.33);
      }

      // Add goal first if provided (so it's ready when home loads)
      if (goalName && goalAmount) {
        await new Promise<void>((resolve, reject) => {
          addGoal({
            name: goalName,
            target_amount: parseFloat(goalAmount),
            is_primary: true,
          }, {
            onSuccess: () => resolve(),
            onError: (error) => reject(error),
          });
        });
      }
      
      // Update profile and mark onboarding complete
      await updateProfileAsync({
        name: name || null,
        monthly_income: monthlyIncome ? parseFloat(monthlyIncome) : null,
        hourly_wage: calculatedHourlyWage,
        onboarding_completed: true,
      });

      navigate('/home');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save your information. Please try again.',
        variant: 'destructive',
      });
      setIsSubmitting(false);
    }
  };

  const stepVariants = {
    enter: { opacity: 0, x: 50 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -50 },
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex flex-col">
      {/* Progress bar */}
      <div className="px-6 pt-6">
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-primary"
            initial={{ width: '0%' }}
            animate={{ width: `${(step / 3) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <p className="text-sm text-muted-foreground mt-2 text-center">
          Step {step} of 3
        </p>
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 py-8">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="mx-auto w-full max-w-sm text-center"
            >
              <div className="mb-8">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-primary flex items-center justify-center">
                  <Sparkles className="h-10 w-10 text-primary-foreground" />
                </div>
                <h1 className="text-2xl font-bold mb-3">
                  See the True Cost of Your Purchases
                </h1>
                <p className="text-muted-foreground">
                  Understand how daily spending affects your long-term goals through emotional, relatable visualizations.
                </p>
              </div>

              <div className="space-y-4 text-left bg-card rounded-2xl p-6 shadow-lg">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                    <DollarSign className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">Track Purchases</h3>
                    <p className="text-sm text-muted-foreground">
                      Log your spending quickly and easily
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">See the Impact</h3>
                    <p className="text-sm text-muted-foreground">
                      "$5 coffee = $1,825/year = vacation delayed"
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                    <Target className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">Achieve Goals</h3>
                    <p className="text-sm text-muted-foreground">
                      Stay motivated with visual progress tracking
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => setStep(2)}
                className="w-full h-12 mt-8 bg-gradient-primary hover:opacity-90"
              >
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="mx-auto w-full max-w-sm"
            >
              <div className="text-center mb-8">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-primary flex items-center justify-center">
                  <User className="h-10 w-10 text-primary-foreground" />
                </div>
                <h1 className="text-2xl font-bold mb-3">Let's personalize your experience</h1>
                <p className="text-muted-foreground">
                  This helps us give you more accurate insights
                </p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">What should we call you?</Label>
                  <Input
                    id="name"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="income">Monthly income (optional)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="income"
                      type="number"
                      placeholder="5,000"
                      value={monthlyIncome}
                      onChange={(e) => setMonthlyIncome(e.target.value)}
                      className="pl-10 h-12"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This helps calculate how purchases affect your goals
                  </p>
                </div>

                {/* Work Hours Toggle */}
                <div className="p-4 rounded-xl bg-secondary/50 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium text-sm">Show "Work Hours" cost</p>
                        <p className="text-xs text-muted-foreground">
                          See purchases as hours you worked
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={showWorkHours}
                      onCheckedChange={setShowWorkHours}
                    />
                  </div>
                  
                  <AnimatePresence>
                    {showWorkHours && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-2"
                      >
                        <Label htmlFor="hourlyWage">Your hourly rate</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                          <Input
                            id="hourlyWage"
                            type="number"
                            placeholder={monthlyIncome ? `~${(parseFloat(monthlyIncome) / 173).toFixed(0)} (calculated)` : "25"}
                            value={hourlyWage}
                            onChange={(e) => setHourlyWage(e.target.value)}
                            className="pl-10 h-12"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {!hourlyWage && monthlyIncome 
                            ? "We'll calculate from your monthly income"
                            : "Enter your hourly wage or salary/173"}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="h-12"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  className="flex-1 h-12 bg-gradient-primary hover:opacity-90"
                >
                  Continue
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="mx-auto w-full max-w-sm"
            >
              <div className="text-center mb-8">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-primary flex items-center justify-center">
                  <Target className="h-10 w-10 text-primary-foreground" />
                </div>
                <h1 className="text-2xl font-bold mb-3">What's your biggest goal?</h1>
                <p className="text-muted-foreground">
                  We'll show how purchases affect your progress
                </p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="goalName">Goal name</Label>
                  <Input
                    id="goalName"
                    placeholder="e.g., Vacation to Bali"
                    value={goalName}
                    onChange={(e) => setGoalName(e.target.value)}
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="goalAmount">Target amount</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="goalAmount"
                      type="number"
                      placeholder="3,000"
                      value={goalAmount}
                      onChange={(e) => setGoalAmount(e.target.value)}
                      className="pl-10 h-12"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <Button
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="h-12"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <Button
                  onClick={handleComplete}
                  className="flex-1 h-12 bg-gradient-primary hover:opacity-90"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      Start Using True Cost
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
              </div>

              <button
                onClick={handleComplete}
                disabled={isSubmitting}
                className="w-full mt-4 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                Skip for now
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}