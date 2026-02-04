import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Lightbulb, 
  Rocket, 
  Sparkles,
  ChevronRight,
  Zap,
  Bookmark,
  X,
  Check
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/calculations';
import { cn } from '@/lib/utils';
import { Database } from '@/integrations/supabase/types';
import { useSavedAlternatives } from '@/hooks/useSavedAlternatives';
import { useWeeklyChallenge } from '@/hooks/useWeeklyChallenge';
import { toast } from 'sonner';

type Purchase = Database['public']['Tables']['purchases']['Row'];
type Goal = Database['public']['Tables']['goals']['Row'];

interface Alternative {
  name: string;
  price: number;
  savings: number;
  savingsPercent: number;
  emoji: string;
  tip?: string;
}

interface SuggestionData {
  purchase: Purchase;
  alternatives: Alternative[];
  daysCloserToGoal: number;
  weeklySavings: number;
  monthlySavings: number;
}

// Smart alternatives database based on category and price ranges
const ALTERNATIVES_DB: Record<string, (price: number, itemName: string) => Alternative[]> = {
  dining: (price, itemName) => {
    const alternatives: Alternative[] = [];
    const lowerName = itemName.toLowerCase();
    
    if (price >= 12 && price <= 20) {
      // Fast casual range (Chipotle, Panera, etc.)
      alternatives.push({
        name: 'Meal prep at home',
        price: price * 0.25,
        savings: price * 0.75,
        savingsPercent: 75,
        emoji: '🏠',
        tip: 'Batch cook on Sundays for easy weekday meals'
      });
      alternatives.push({
        name: 'Grocery store deli',
        price: price * 0.5,
        savings: price * 0.5,
        savingsPercent: 50,
        emoji: '🛒',
        tip: 'Pre-made rotisserie chicken + sides'
      });
      alternatives.push({
        name: 'Budget-friendly alternative',
        price: price * 0.6,
        savings: price * 0.4,
        savingsPercent: 40,
        emoji: '🌯',
        tip: 'Try a local food truck or smaller portion'
      });
    } else if (price >= 5 && price < 12) {
      // Coffee/breakfast range
      alternatives.push({
        name: 'Make it at home',
        price: price * 0.15,
        savings: price * 0.85,
        savingsPercent: 85,
        emoji: '☕',
        tip: 'Invest in a good coffee maker or French press'
      });
      alternatives.push({
        name: 'Office coffee + snack',
        price: price * 0.3,
        savings: price * 0.7,
        savingsPercent: 70,
        emoji: '🏢',
        tip: 'Keep snacks at your desk'
      });
    } else if (price > 20) {
      // Restaurant dining
      alternatives.push({
        name: 'Cook a fancy meal',
        price: price * 0.35,
        savings: price * 0.65,
        savingsPercent: 65,
        emoji: '👨‍🍳',
        tip: 'Restaurant-quality recipes on YouTube'
      });
      alternatives.push({
        name: 'Happy hour specials',
        price: price * 0.6,
        savings: price * 0.4,
        savingsPercent: 40,
        emoji: '🍻',
        tip: 'Same restaurants, better prices 4-6pm'
      });
      alternatives.push({
        name: 'Takeout instead',
        price: price * 0.75,
        savings: price * 0.25,
        savingsPercent: 25,
        emoji: '📦',
        tip: 'Skip the tip and service fees'
      });
    }
    
    return alternatives;
  },
  
  transportation: (price) => {
    const alternatives: Alternative[] = [];
    
    if (price >= 5 && price <= 30) {
      alternatives.push({
        name: 'Public transit',
        price: price * 0.3,
        savings: price * 0.7,
        savingsPercent: 70,
        emoji: '🚌',
        tip: 'Get a monthly pass for even more savings'
      });
      alternatives.push({
        name: 'Bike or walk',
        price: 0,
        savings: price,
        savingsPercent: 100,
        emoji: '🚴',
        tip: 'Free + good for your health!'
      });
      alternatives.push({
        name: 'Carpool with colleagues',
        price: price * 0.4,
        savings: price * 0.6,
        savingsPercent: 60,
        emoji: '🚗',
        tip: 'Split costs and reduce emissions'
      });
    } else if (price > 30) {
      alternatives.push({
        name: 'Book in advance',
        price: price * 0.6,
        savings: price * 0.4,
        savingsPercent: 40,
        emoji: '📅',
        tip: 'Plan ahead for cheaper fares'
      });
      alternatives.push({
        name: 'Use rewards points',
        price: price * 0.2,
        savings: price * 0.8,
        savingsPercent: 80,
        emoji: '🎁',
        tip: 'Credit card travel rewards add up fast'
      });
    }
    
    return alternatives;
  },
  
  entertainment: (price) => {
    const alternatives: Alternative[] = [];
    
    alternatives.push({
      name: 'Free community events',
      price: 0,
      savings: price,
      savingsPercent: 100,
      emoji: '🎪',
      tip: 'Check local event calendars'
    });
    alternatives.push({
      name: 'Matinee or off-peak',
      price: price * 0.5,
      savings: price * 0.5,
      savingsPercent: 50,
      emoji: '🌅',
      tip: 'Weekday afternoons are usually cheaper'
    });
    alternatives.push({
      name: 'Library resources',
      price: 0,
      savings: price,
      savingsPercent: 100,
      emoji: '📚',
      tip: 'Free movies, books, museum passes!'
    });
    
    return alternatives;
  },
  
  subscriptions: (price) => {
    const alternatives: Alternative[] = [];
    
    alternatives.push({
      name: 'Annual plan',
      price: price * 0.8,
      savings: price * 0.2,
      savingsPercent: 20,
      emoji: '📆',
      tip: 'Most services offer ~20% off annually'
    });
    alternatives.push({
      name: 'Family/group plan',
      price: price * 0.4,
      savings: price * 0.6,
      savingsPercent: 60,
      emoji: '👨‍👩‍👧',
      tip: 'Split with friends or family'
    });
    alternatives.push({
      name: 'Free alternative',
      price: 0,
      savings: price,
      savingsPercent: 100,
      emoji: '🆓',
      tip: 'There\'s usually a free version or open source option'
    });
    
    return alternatives;
  },
  
  shopping: (price) => {
    const alternatives: Alternative[] = [];
    
    alternatives.push({
      name: 'Wait for a sale',
      price: price * 0.6,
      savings: price * 0.4,
      savingsPercent: 40,
      emoji: '🏷️',
      tip: 'Most items go on sale within 3 months'
    });
    alternatives.push({
      name: 'Buy secondhand',
      price: price * 0.4,
      savings: price * 0.6,
      savingsPercent: 60,
      emoji: '♻️',
      tip: 'Check eBay, Facebook Marketplace, Poshmark'
    });
    alternatives.push({
      name: 'Use a coupon app',
      price: price * 0.85,
      savings: price * 0.15,
      savingsPercent: 15,
      emoji: '📱',
      tip: 'Honey, RetailMeNot, or Rakuten'
    });
    
    return alternatives;
  },
  
  groceries: (price) => {
    const alternatives: Alternative[] = [];
    
    alternatives.push({
      name: 'Store brand items',
      price: price * 0.7,
      savings: price * 0.3,
      savingsPercent: 30,
      emoji: '🏪',
      tip: 'Same quality, different label'
    });
    alternatives.push({
      name: 'Discount grocery store',
      price: price * 0.6,
      savings: price * 0.4,
      savingsPercent: 40,
      emoji: '💰',
      tip: 'Aldi, Lidl, or Grocery Outlet'
    });
    alternatives.push({
      name: 'Meal plan first',
      price: price * 0.75,
      savings: price * 0.25,
      savingsPercent: 25,
      emoji: '📝',
      tip: 'Avoid impulse buys with a list'
    });
    
    return alternatives;
  },
  
  health: (price) => {
    const alternatives: Alternative[] = [];
    
    alternatives.push({
      name: 'Generic medication',
      price: price * 0.3,
      savings: price * 0.7,
      savingsPercent: 70,
      emoji: '💊',
      tip: 'Ask your pharmacist about generics'
    });
    alternatives.push({
      name: 'GoodRx or discount card',
      price: price * 0.5,
      savings: price * 0.5,
      savingsPercent: 50,
      emoji: '💳',
      tip: 'Free prescription discount programs'
    });
    
    return alternatives;
  },
  
  other: (price) => {
    const alternatives: Alternative[] = [];
    
    alternatives.push({
      name: 'DIY version',
      price: price * 0.4,
      savings: price * 0.6,
      savingsPercent: 60,
      emoji: '🔧',
      tip: 'YouTube tutorials for almost everything'
    });
    alternatives.push({
      name: 'Borrow or rent',
      price: price * 0.15,
      savings: price * 0.85,
      savingsPercent: 85,
      emoji: '🤝',
      tip: 'Great for one-time use items'
    });
    
    return alternatives;
  },
};

function getAlternativesForPurchase(purchase: Purchase): Alternative[] {
  const category = purchase.category;
  const price = Number(purchase.amount);
  const itemName = purchase.item_name;
  
  const getAlternatives = ALTERNATIVES_DB[category] || ALTERNATIVES_DB.other;
  const alternatives = getAlternatives(price, itemName);
  
  // Ensure we have at least 2 alternatives
  if (alternatives.length < 2) {
    return ALTERNATIVES_DB.other(price, itemName);
  }
  
  return alternatives.slice(0, 3);
}

interface SmarterSpendingSuggestionsProps {
  purchases: Purchase[];
  primaryGoal: Goal | null;
  monthlyIncome?: number | null;
}

export function SmarterSpendingSuggestions({ 
  purchases, 
  primaryGoal,
  monthlyIncome 
}: SmarterSpendingSuggestionsProps) {
  const { 
    saveAlternative, 
    isSaving, 
    isAlternativeDismissed, 
    isAlternativeSaved 
  } = useSavedAlternatives();
  const { recordSavings } = useWeeklyChallenge();
  const [dismissedLocally, setDismissedLocally] = useState<Set<string>>(new Set());
  const [savedLocally, setSavedLocally] = useState<Set<string>>(new Set());

  const suggestionData = useMemo(() => {
    if (purchases.length === 0) return null;
    
    // Get the most recent purchase
    const recentPurchase = purchases[0];
    const alternatives = getAlternativesForPurchase(recentPurchase);
    
    if (alternatives.length === 0) return null;
    
    // Calculate potential savings impact on goal
    const bestAlternative = alternatives[0];
    const savingsAmount = bestAlternative.savings;
    
    // Calculate days closer to goal based on savings
    const dailySavingsRate = monthlyIncome ? (Number(monthlyIncome) * 0.2) / 30 : 0;
    const daysCloserToGoal = dailySavingsRate > 0 
      ? Math.round(savingsAmount / dailySavingsRate) 
      : 0;
    
    // Estimate weekly/monthly impact if they make this switch regularly
    const frequency = recentPurchase.frequency || 'one-time';
    let weeklySavings = 0;
    let monthlySavings = 0;
    
    if (frequency === 'daily') {
      weeklySavings = savingsAmount * 7;
      monthlySavings = savingsAmount * 30;
    } else if (frequency === 'weekly') {
      weeklySavings = savingsAmount;
      monthlySavings = savingsAmount * 4;
    } else if (frequency === 'monthly') {
      weeklySavings = savingsAmount / 4;
      monthlySavings = savingsAmount;
    } else {
      // One-time, show as if they could save this much
      weeklySavings = savingsAmount / 4;
      monthlySavings = savingsAmount;
    }
    
    return {
      purchase: recentPurchase,
      alternatives,
      daysCloserToGoal,
      weeklySavings,
      monthlySavings,
    } as SuggestionData;
  }, [purchases, monthlyIncome]);

  const handleSaveAlternative = async (purchase: Purchase, alt: Alternative) => {
    const key = `${purchase.id}-${alt.name}`;
    if (savedLocally.has(key)) return;
    
    setSavedLocally(prev => new Set(prev).add(key));
    
    saveAlternative({
      purchase_id: purchase.id,
      alternative_name: alt.name,
      original_amount: Number(purchase.amount),
      alternative_price: alt.price,
      savings: alt.savings,
      category: purchase.category,
      status: 'saved',
    });
    
    // Record savings for weekly challenge
    await recordSavings(alt.savings);
    
    toast.success(`Saved "${alt.name}" as a smarter choice! +${formatCurrency(alt.savings)} to your challenge!`, {
      icon: '🎯',
    });
  };

  const handleDismissAlternative = (purchase: Purchase, alt: Alternative) => {
    const key = `${purchase.id}-${alt.name}`;
    if (dismissedLocally.has(key)) return;
    
    setDismissedLocally(prev => new Set(prev).add(key));
    
    saveAlternative({
      purchase_id: purchase.id,
      alternative_name: alt.name,
      original_amount: Number(purchase.amount),
      alternative_price: alt.price,
      savings: alt.savings,
      category: purchase.category,
      status: 'dismissed',
    });
    
    toast.info(`Dismissed "${alt.name}"`, {
      icon: '👋',
    });
  };

  const isAltDismissed = (purchaseId: string, altName: string) => {
    const key = `${purchaseId}-${altName}`;
    return dismissedLocally.has(key) || isAlternativeDismissed(purchaseId, altName);
  };

  const isAltSaved = (purchaseId: string, altName: string) => {
    const key = `${purchaseId}-${altName}`;
    return savedLocally.has(key) || isAlternativeSaved(purchaseId, altName);
  };
  
  if (!suggestionData) return null;
  
  const { purchase, alternatives, daysCloserToGoal, monthlySavings } = suggestionData;
  const bestSavings = alternatives[0]?.savings || 0;
  
  // Filter out dismissed alternatives
  const visibleAlternatives = alternatives.filter(
    alt => !isAltDismissed(purchase.id, alt.name)
  );
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-full bg-primary/10">
          <Lightbulb className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="font-semibold text-lg">Smarter Spending</h2>
          <p className="text-sm text-muted-foreground">Ways to save on your recent purchase</p>
        </div>
      </div>
      
      {/* Current Purchase Highlight */}
      <Card className="p-4 border-2 border-dashed border-muted-foreground/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">You spent</p>
            <p className="font-bold text-xl">{formatCurrency(Number(purchase.amount))}</p>
            <p className="text-sm capitalize text-muted-foreground">{purchase.item_name}</p>
          </div>
          <div className="text-4xl">
            {purchase.category === 'dining' && '🍽️'}
            {purchase.category === 'transportation' && '🚗'}
            {purchase.category === 'entertainment' && '🎬'}
            {purchase.category === 'subscriptions' && '📱'}
            {purchase.category === 'shopping' && '🛍️'}
            {purchase.category === 'groceries' && '🛒'}
            {purchase.category === 'health' && '💊'}
            {purchase.category === 'utilities' && '💡'}
            {purchase.category === 'travel' && '✈️'}
            {purchase.category === 'other' && '📦'}
          </div>
        </div>
      </Card>
      
      {/* Alternatives */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-warning" />
          <span className="text-sm font-medium">Cheaper alternatives</span>
        </div>
        
        <AnimatePresence mode="popLayout">
          {visibleAlternatives.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-4 text-muted-foreground text-sm"
            >
              All alternatives dismissed. Add a new purchase to see more suggestions!
            </motion.div>
          ) : (
            visibleAlternatives.map((alt, index) => {
              const isSaved = isAltSaved(purchase.id, alt.name);
              
              return (
                <motion.div
                  key={alt.name}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20, height: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className={cn(
                    "p-4 transition-all",
                    index === 0 && !isSaved && "bg-success/5 border-success/20",
                    isSaved && "bg-primary/5 border-primary/30"
                  )}>
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">{alt.emoji}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium">{alt.name}</p>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="font-bold text-success">
                              Save {formatCurrency(alt.savings)}
                            </span>
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-xs font-bold",
                              alt.savingsPercent >= 50 
                                ? "bg-success/20 text-success" 
                                : "bg-warning/20 text-warning"
                            )}>
                              -{alt.savingsPercent}%
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Only {formatCurrency(alt.price)}
                        </p>
                        {alt.tip && (
                          <p className="text-xs text-primary mt-2 flex items-center gap-1">
                            <Zap className="h-3 w-3" />
                            {alt.tip}
                          </p>
                        )}
                        
                        {/* Save/Dismiss Buttons */}
                        <div className="flex items-center gap-2 mt-3">
                          {isSaved ? (
                            <div className="flex items-center gap-1 text-sm text-primary font-medium">
                              <Check className="h-4 w-4" />
                              Saved to challenge!
                            </div>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSaveAlternative(purchase, alt)}
                                disabled={isSaving}
                                className="text-xs h-8 gap-1 hover:bg-primary/10 hover:text-primary hover:border-primary"
                              >
                                <Bookmark className="h-3 w-3" />
                                I'll try this!
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDismissAlternative(purchase, alt)}
                                disabled={isSaving}
                                className="text-xs h-8 gap-1 text-muted-foreground hover:text-destructive"
                              >
                                <X className="h-3 w-3" />
                                Not for me
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
      
      {/* Goal Acceleration */}
      {primaryGoal && daysCloserToGoal > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-5 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Rocket className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  Reach your goal faster!
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  By choosing the cheaper option, you'd be{' '}
                  <span className="font-bold text-primary">
                    {daysCloserToGoal} day{daysCloserToGoal > 1 ? 's' : ''} closer
                  </span>{' '}
                  to your goal:
                </p>
                <div className="mt-3 p-3 bg-background/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{primaryGoal.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(Number(primaryGoal.current_amount), 0)} / {formatCurrency(Number(primaryGoal.target_amount), 0)}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
                
                {monthlySavings > 0 && (
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="text-center p-2 bg-background/50 rounded-lg">
                      <p className="text-lg font-bold text-success">
                        {formatCurrency(monthlySavings, 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">saved/month</p>
                    </div>
                    <div className="text-center p-2 bg-background/50 rounded-lg">
                      <p className="text-lg font-bold text-success">
                        {formatCurrency(monthlySavings * 12, 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">saved/year</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </motion.div>
      )}
      
      {/* Motivational CTA */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center pt-2"
      >
        <p className="text-sm text-muted-foreground">
          Small changes add up! Save{' '}
          <span className="font-bold text-primary">
            {formatCurrency(bestSavings * 52, 0)}
          </span>{' '}
          per year with smarter choices. 🚀
        </p>
      </motion.div>
    </motion.div>
  );
}
