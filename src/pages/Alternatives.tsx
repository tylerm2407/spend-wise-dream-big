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
  { category: 'dining', original: 'Chipotle Burrito Bowl', alternative: 'Trader Joe\'s Burrito Bowl (frozen)', originalPrice: 12.50, alternativePrice: 3.99, store: 'Trader Joe\'s', nutrition: { originalCal: 665, altCal: 380, benefit: '43% fewer calories, less sodium' } },
  { category: 'dining', original: 'Starbucks Iced Latte', alternative: 'Dunkin\' Original Blend Ground Coffee (bag)', originalPrice: 6.45, alternativePrice: 0.35, store: 'Target, Walmart', nutrition: { originalCal: 190, altCal: 5, benefit: 'No added sugar, control your cream' } },
  { category: 'dining', original: 'DoorDash Delivery Order', alternative: 'Costco Rotisserie Chicken + sides', originalPrice: 35, alternativePrice: 12, store: 'Costco', nutrition: { originalCal: 1200, altCal: 450, benefit: 'Fresh protein, no preservatives' } },
  { category: 'dining', original: 'Panera Mac & Cheese Bowl', alternative: 'Stouffer\'s Family Size Mac & Cheese', originalPrice: 10.99, alternativePrice: 4.29, store: 'Kroger, Walmart', nutrition: { originalCal: 980, altCal: 350, benefit: 'Smaller portions, 4 servings total' } },
  // Fast Food Alternatives
  { category: 'dining', original: 'McDonald\'s Big Mac Meal', alternative: 'Homemade smash burgers (4 servings)', originalPrice: 11.99, alternativePrice: 3.50, store: 'Aldi, Walmart', nutrition: { originalCal: 1080, altCal: 450, benefit: '58% less fat, fresh ingredients' } },
  { category: 'dining', original: 'Chick-fil-A Sandwich Meal', alternative: 'Tyson Crispy Chicken Patties + brioche buns', originalPrice: 12.49, alternativePrice: 2.75, store: 'Costco, Target', nutrition: { originalCal: 1140, altCal: 380, benefit: 'Control oil & sodium, 67% less cal' } },
  { category: 'dining', original: 'Taco Bell Crunchwrap Supreme', alternative: 'DIY Crunchwrap (Old El Paso kit)', originalPrice: 6.49, alternativePrice: 1.80, store: 'Kroger, Walmart', nutrition: { originalCal: 540, altCal: 320, benefit: 'Less sodium, add fresh veggies' } },
  { category: 'dining', original: 'Wendy\'s Baconator Combo', alternative: 'Wright Brand Bacon + ground beef patties', originalPrice: 14.29, alternativePrice: 4.25, store: 'Sam\'s Club, Costco', nutrition: { originalCal: 1630, altCal: 650, benefit: '60% fewer calories, lean beef option' } },
  { category: 'dining', original: 'Panda Express Orange Chicken', alternative: 'Trader Joe\'s Mandarin Orange Chicken', originalPrice: 11.50, alternativePrice: 4.99, store: 'Trader Joe\'s', nutrition: { originalCal: 490, altCal: 320, benefit: 'Less sugar, no MSG added' } },
  { category: 'dining', original: 'Subway Footlong Sub', alternative: 'Boar\'s Head deli meat + French bread', originalPrice: 12.99, alternativePrice: 4.50, store: 'Publix, Kroger', nutrition: { originalCal: 680, altCal: 420, benefit: 'No nitrates, fresher ingredients' } },
  { category: 'dining', original: 'Five Guys Burger & Fries', alternative: 'Bubba Burgers + Ore-Ida fries', originalPrice: 18.99, alternativePrice: 5.50, store: 'Costco, Walmart', nutrition: { originalCal: 1700, altCal: 580, benefit: '66% less fat, bake instead of fry' } },
  { category: 'dining', original: 'Popeyes Chicken Sandwich', alternative: 'Popeyes frozen chicken (grocery) + pickles', originalPrice: 8.99, alternativePrice: 3.25, store: 'Walmart, Target', nutrition: { originalCal: 700, altCal: 380, benefit: 'Air fry option, less grease' } },
  // Shopping
  { category: 'shopping', original: 'Nike Air Force 1 Sneakers', alternative: 'Puma Carina Sneakers (similar style)', originalPrice: 115, alternativePrice: 45, store: 'Amazon, DSW', nutrition: null },
  { category: 'shopping', original: 'Apple AirPods Pro (2nd Gen)', alternative: 'Anker Soundcore Liberty 4 NC', originalPrice: 249, alternativePrice: 79, store: 'Amazon', nutrition: null },
  { category: 'shopping', original: 'Lululemon Align Leggings', alternative: 'CRZ Yoga Naked Feeling Leggings', originalPrice: 98, alternativePrice: 28, store: 'Amazon', nutrition: null },
  // Transportation
  { category: 'transportation', original: 'Uber XL (5 miles)', alternative: 'City Bus/Metro Day Pass', originalPrice: 22, alternativePrice: 3.50, store: 'Local Transit App', nutrition: null },
  { category: 'transportation', original: 'Shell V-Power Premium (15 gal)', alternative: 'Costco Regular Gas (15 gal)', originalPrice: 67.50, alternativePrice: 48, store: 'Costco', nutrition: null },
  { category: 'transportation', original: 'Mister Car Wash Unlimited', alternative: 'Chemical Guys Complete Wash Kit', originalPrice: 30, alternativePrice: 8, store: 'Amazon, AutoZone', nutrition: null },
  // Entertainment
  { category: 'entertainment', original: 'AMC Movie Ticket + Popcorn Combo', alternative: 'Netflix Standard + microwave popcorn', originalPrice: 28, alternativePrice: 5, store: 'Netflix.com', nutrition: null },
  { category: 'entertainment', original: 'Kindle Unlimited Monthly', alternative: 'Libby App (free library access)', originalPrice: 11.99, alternativePrice: 0, store: 'App Store, Google Play', nutrition: null },
  { category: 'entertainment', original: 'PlayStation Plus Premium', alternative: 'Xbox Game Pass Core', originalPrice: 17.99, alternativePrice: 9.99, store: 'Xbox.com', nutrition: null },
  // Subscriptions
  { category: 'subscriptions', original: 'Netflix + Hulu + Disney+ Bundle', alternative: 'Netflix Standard with Ads', originalPrice: 45, alternativePrice: 6.99, store: 'Netflix.com', nutrition: null },
  { category: 'subscriptions', original: 'Spotify Premium Individual', alternative: 'YouTube Music Free (with ads)', originalPrice: 11.99, alternativePrice: 0, store: 'YouTube.com', nutrition: null },
  { category: 'subscriptions', original: 'Equinox Gym Membership', alternative: 'Planet Fitness Classic', originalPrice: 200, alternativePrice: 15, store: 'PlanetFitness.com', nutrition: null },
  // Groceries
  { category: 'groceries', original: 'Whole Foods Organic Spinach (5oz)', alternative: 'Aldi SimplyNature Organic Spinach (5oz)', originalPrice: 5.99, alternativePrice: 2.99, store: 'Aldi', nutrition: { originalCal: 35, altCal: 35, benefit: 'Same nutrition, USDA organic certified' } },
  { category: 'groceries', original: 'Dole Pre-Cut Fruit Bowl', alternative: 'Whole cantaloupe + grapes (DIY)', originalPrice: 8.99, alternativePrice: 4.50, store: 'Aldi, Walmart', nutrition: { originalCal: 70, altCal: 65, benefit: 'Fresher, more vitamins retained' } },
  { category: 'groceries', original: 'Tide Pods (42 count)', alternative: 'Kirkland Ultra Clean Pods (90 count)', originalPrice: 14.99, alternativePrice: 18.99, store: 'Costco', nutrition: null },
  { category: 'groceries', original: 'Oatly Oat Milk (64oz)', alternative: 'Aldi Friendly Farms Oat Milk (64oz)', originalPrice: 5.49, alternativePrice: 2.99, store: 'Aldi', nutrition: { originalCal: 120, altCal: 90, benefit: '25% fewer calories, similar protein' } },
  { category: 'groceries', original: 'Starbucks Cold Brew (bottle)', alternative: 'Chameleon Cold Brew Concentrate', originalPrice: 5.99, alternativePrice: 0.75, store: 'Target, Kroger', nutrition: { originalCal: 15, altCal: 5, benefit: 'Organic, no added sugars' } },
  { category: 'groceries', original: 'Kind Bars (12 pack)', alternative: 'Nature Valley Protein Bars (15 pack)', originalPrice: 17.99, alternativePrice: 8.99, store: 'Costco, Sam\'s Club', nutrition: { originalCal: 200, altCal: 190, benefit: 'Similar protein, more fiber' } },
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
                          {alt.store && (
                            <p className="text-xs text-muted-foreground mt-1">
                              📍 Find at: <span className="font-medium text-foreground">{alt.store}</span>
                            </p>
                          )}
                          {alt.nutrition && (
                            <p className="text-xs text-muted-foreground mt-1">
                              🥗 <span className="text-destructive font-medium">{alt.nutrition.originalCal} cal</span> → <span className="text-success font-medium">{alt.nutrition.altCal} cal</span> · {alt.nutrition.benefit}
                            </p>
                          )}
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
