import { motion } from 'framer-motion';
import { 
  Lightbulb, 
  Plus,
  Check,
  Clock
} from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TapScale } from '@/components/ui/TapScale';
import { useSavedAlternatives } from '@/hooks/useSavedAlternatives';
import { useProfile } from '@/hooks/useProfile';
import { useGoals } from '@/hooks/useGoals';
import { useHaptics } from '@/hooks/useHaptics';
import { AIAlternativeSearch } from '@/components/AIAlternativeSearch';
import { formatCurrency, calculateInvestmentGrowth } from '@/lib/calculations';
import { cn } from '@/lib/utils';

// Pre-defined alternatives library
const ALTERNATIVES_LIBRARY = [
  // Dining
  { category: 'dining', original: 'Restaurant lunch', alternative: 'Meal prep at home', originalPrice: 15, alternativePrice: 5 },
  { category: 'dining', original: 'Coffee shop coffee', alternative: 'Brew at home', originalPrice: 5, alternativePrice: 0.50 },
  { category: 'dining', original: 'Food delivery', alternative: 'Cook & pickup', originalPrice: 30, alternativePrice: 15 },
  { category: 'dining', original: 'Fancy dinner out', alternative: 'Home date night', originalPrice: 80, alternativePrice: 25 },
  // Shopping
  { category: 'shopping', original: 'Brand name clothes', alternative: 'Thrift or outlet', originalPrice: 60, alternativePrice: 15 },
  { category: 'shopping', original: 'New electronics', alternative: 'Refurbished/used', originalPrice: 500, alternativePrice: 300 },
  { category: 'shopping', original: 'Impulse Amazon buy', alternative: '30-day wait rule', originalPrice: 40, alternativePrice: 0 },
  // Transportation
  { category: 'transportation', original: 'Uber/Lyft rides', alternative: 'Public transit', originalPrice: 20, alternativePrice: 3 },
  { category: 'transportation', original: 'Premium gas', alternative: 'Regular gas', originalPrice: 60, alternativePrice: 48 },
  { category: 'transportation', original: 'Car wash service', alternative: 'DIY wash', originalPrice: 25, alternativePrice: 5 },
  // Entertainment
  { category: 'entertainment', original: 'Movie theater', alternative: 'Streaming at home', originalPrice: 30, alternativePrice: 5 },
  { category: 'entertainment', original: 'Concert tickets', alternative: 'Local free events', originalPrice: 100, alternativePrice: 0 },
  { category: 'entertainment', original: 'Paid mobile games', alternative: 'Free alternatives', originalPrice: 10, alternativePrice: 0 },
  // Subscriptions
  { category: 'subscriptions', original: 'Multiple streaming', alternative: 'Rotate services', originalPrice: 50, alternativePrice: 15 },
  { category: 'subscriptions', original: 'Premium Spotify', alternative: 'Free tier + ads', originalPrice: 11, alternativePrice: 0 },
  { category: 'subscriptions', original: 'Gym membership', alternative: 'Home workouts', originalPrice: 40, alternativePrice: 0 },
  // Groceries
  { category: 'groceries', original: 'Organic everything', alternative: 'Dirty dozen only', originalPrice: 200, alternativePrice: 150 },
  { category: 'groceries', original: 'Pre-cut produce', alternative: 'Whole produce', originalPrice: 15, alternativePrice: 8 },
  { category: 'groceries', original: 'Name brand items', alternative: 'Store brand', originalPrice: 100, alternativePrice: 70 },
];

export default function Alternatives() {
  const { savedAlternatives, saveAlternative, unsaveAlternative, isAlternativeSavedByName } = useSavedAlternatives();
  const { profile } = useProfile();
  const { primaryGoal } = useGoals();
  const { haptic } = useHaptics();

  const dailySavingsRate = profile?.monthly_income 
    ? (Number(profile.monthly_income) * 0.2) / 30 
    : 0;

  // Get saved alternatives with status 'saved'
  const activeSavedAlternatives = savedAlternatives.filter(sa => sa.status === 'saved');

  // Calculate total potential monthly savings
  const totalMonthlySavings = activeSavedAlternatives.reduce(
    (sum, alt) => sum + Number(alt.savings),
    0
  );

  const handleToggleAlternative = (alt: typeof ALTERNATIVES_LIBRARY[0]) => {
    const isSaved = isAlternativeSavedByName(alt.alternative, alt.category);
    
    if (isSaved) {
      haptic('light');
      unsaveAlternative({ alternativeName: alt.alternative, category: alt.category });
    } else {
      haptic('success');
      const savings = alt.originalPrice - alt.alternativePrice;
      saveAlternative({
        category: alt.category,
        original_amount: alt.originalPrice,
        alternative_name: alt.alternative,
        alternative_price: alt.alternativePrice,
        savings,
        status: 'saved',
      });
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
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
          <h1 className="text-2xl font-bold">Alternatives</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Discover ways to save and accelerate your goals
          </p>
        </header>

        <motion.main
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="px-6 space-y-6 pb-6"
        >
          {/* AI Alternative Search */}
          <motion.div variants={itemVariants}>
            <AIAlternativeSearch />
          </motion.div>
          {/* My Saved Alternatives Summary */}
          {activeSavedAlternatives.length > 0 && (
            <motion.div variants={itemVariants}>
              <Card className="p-6 bg-gradient-to-br from-success/10 to-success/5 border-success/20">
                <div className="flex items-center gap-2 mb-3">
                  <Check className="h-5 w-5 text-success" />
                  <h2 className="font-semibold text-success">Your Saved Alternatives</h2>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Monthly Savings</p>
                    <p className="text-2xl font-bold text-success">
                      {formatCurrency(totalMonthlySavings, 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">10 Year Value</p>
                    <p className="text-2xl font-bold text-success">
                      {formatCurrency(calculateInvestmentGrowth(totalMonthlySavings * 12, 10), 0)}
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-success/20">
                  <p className="text-xs text-muted-foreground">
                    {activeSavedAlternatives.length} alternative{activeSavedAlternatives.length > 1 ? 's' : ''} saved
                  </p>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Alternatives Library */}
          <motion.div variants={itemVariants}>
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-cta" />
              Alternatives Library
            </h2>
            <div className="space-y-3">
              {ALTERNATIVES_LIBRARY.map((alt, index) => {
                const savings = alt.originalPrice - alt.alternativePrice;
                const yearlySavings = savings * 12;
                const daysCloserToGoal = dailySavingsRate > 0 
                  ? Math.round(savings / dailySavingsRate) 
                  : 0;
                const isSaved = activeSavedAlternatives.some(
                  sa => sa.alternative_name === alt.alternative && sa.category === alt.category
                );

                return (
                  <motion.div
                    key={`${alt.category}-${alt.original}-${index}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                  >
                    <Card className={cn(
                      'p-4 glass-card transition-all',
                      isSaved && 'ring-2 ring-success bg-success/5'
                    )}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs px-2 py-0.5 bg-secondary rounded-full capitalize">
                              {alt.category}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-muted-foreground line-through text-sm">
                              {alt.original}
                            </span>
                            <span className="text-muted-foreground">→</span>
                            <span className="font-medium text-success">{alt.alternative}</span>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-muted-foreground line-through">
                              {formatCurrency(alt.originalPrice)}
                            </span>
                            <span className="font-semibold text-success">
                              {formatCurrency(alt.alternativePrice)}
                            </span>
                            <span className="text-success font-medium">
                              Save {formatCurrency(savings)}
                            </span>
                          </div>
                          {daysCloserToGoal > 0 && primaryGoal && (
                            <div className="flex items-center gap-1 mt-2 text-xs text-primary">
                              <Clock className="h-3 w-3" />
                              <span>
                                {daysCloserToGoal} day{daysCloserToGoal > 1 ? 's' : ''} closer to "{primaryGoal.name}"
                              </span>
                            </div>
                          )}
                        </div>
                        <TapScale haptic="light" scale={0.9}>
                          <Button
                            size="icon"
                            variant={isSaved ? 'default' : 'outline'}
                            className={cn(
                              'h-10 w-10 rounded-full flex-shrink-0 transition-all',
                              isSaved && 'bg-success hover:bg-success/80'
                            )}
                            onClick={() => handleToggleAlternative(alt)}
                            aria-label={isSaved ? 'Unsave alternative' : 'Save alternative'}
                          >
                            {isSaved ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Plus className="h-4 w-4" />
                            )}
                          </Button>
                        </TapScale>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Motivational Note */}
          <motion.div variants={itemVariants}>
            <Card className="p-4 bg-muted/50 border-0">
              <p className="text-sm text-muted-foreground text-center italic">
                "This isn't about guilt—it's about clarity."
              </p>
            </Card>
          </motion.div>
        </motion.main>
      </div>
    </AppLayout>
  );
}
