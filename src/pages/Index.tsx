import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Target, 
  DollarSign, 
  ArrowRight,
  Sparkles,
  BarChart3,
  Shield,
  Zap,
  PiggyBank,
  Clock,
  Lightbulb,
  CreditCard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function Index() {
  const features = [
    {
      icon: <Clock className="h-5 w-5" />,
      title: 'Log purchases in under 30 seconds',
      description: 'Quick-add with smart defaults and automatic categorization',
    },
    {
      icon: <TrendingUp className="h-5 w-5" />,
      title: 'See the true opportunity cost',
      description: 'Visualize how $5 today becomes $25,000 over your lifetime',
    },
    {
      icon: <Lightbulb className="h-5 w-5" />,
      title: 'Get smarter alternatives instantly',
      description: 'Discover 1-3 cheaper swaps for every purchase you make',
    },
    {
      icon: <Target className="h-5 w-5" />,
      title: 'Track progress toward your goals',
      description: 'See exactly how each decision moves you closer to financial freedom',
    },
    {
      icon: <CreditCard className="h-5 w-5" />,
      title: 'Connect your cards for auto-tracking',
      description: 'Link credit cards to automatically import and categorize spending',
    },
  ];

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
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Hero Section */}
      <motion.main
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="px-6 py-10 max-w-md mx-auto"
      >
        {/* Badge */}
        <motion.div variants={itemVariants} className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">
              Financial clarity in seconds
            </span>
          </div>
        </motion.div>

        {/* Value Proposition - App Store Ready */}
        <motion.div variants={itemVariants} className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-3 tracking-tight text-foreground">
            True Cost
          </h1>
          <p className="text-lg font-medium text-foreground mb-2">
            See what your spending <span className="text-primary">really</span> costs you
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
            Transform everyday purchases into investment insights. Know exactly what you're giving up—and find smarter alternatives.
          </p>
        </motion.div>

        {/* Quick Demo Card */}
        <motion.div variants={itemVariants}>
          <Card className="p-5 mb-8 bg-card border-border relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-primary/10 to-transparent rounded-bl-full" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                    ☕
                  </div>
                  <span className="text-sm text-muted-foreground">Daily Coffee</span>
                </div>
                <span className="font-bold text-lg text-foreground">$5.00</span>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 bg-muted/50 rounded-lg">
                  <span className="text-xs text-muted-foreground">Monthly</span>
                  <span className="font-semibold text-sm text-foreground">$150</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-muted/50 rounded-lg">
                  <span className="text-xs text-muted-foreground">Yearly</span>
                  <span className="font-semibold text-sm text-primary">$1,825</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-success/10 rounded-lg border border-success/20">
                  <span className="text-xs text-success">10 Years (invested)</span>
                  <span className="font-bold text-success">$25,232</span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground mb-2">
                  That's equivalent to:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2.5 py-1 bg-secondary text-secondary-foreground rounded-full text-xs">
                    🏝️ Dream vacation
                  </span>
                  <span className="px-2.5 py-1 bg-secondary text-secondary-foreground rounded-full text-xs">
                    💰 1 month rent
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* 5 Key Features - App Store Bullets */}
        <motion.div variants={itemVariants} className="mb-8">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4 text-center">
            Why True Cost?
          </h2>
          <div className="space-y-3">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + index * 0.08 }}
                className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
                  {feature.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm text-foreground leading-tight">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Motivational Quote */}
        <motion.div 
          variants={itemVariants}
          className="text-center mb-6 px-4"
        >
          <p className="text-sm italic text-muted-foreground">
            "This isn't about guilt—it's about clarity."
          </p>
        </motion.div>

        {/* CTAs */}
        <motion.div variants={itemVariants} className="space-y-3">
          <Link to="/signup" className="block">
            <Button className="w-full h-13 text-base bg-cta hover:bg-cta/90 text-cta-foreground font-semibold shadow-lg shadow-cta/25">
              Start Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          
          <Link to="/login" className="block">
            <Button variant="outline" className="w-full h-11 text-sm border-border">
              I already have an account
            </Button>
          </Link>
        </motion.div>

        {/* Trust Indicators */}
        <motion.div 
          variants={itemVariants}
          className="mt-8 flex flex-col items-center gap-3"
        >
          <div className="flex items-center gap-2 text-muted-foreground">
            <Shield className="h-4 w-4" />
            <span className="text-xs">Your data is secure and private</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Zap className="h-3 w-3" /> Fast setup
            </span>
            <span className="flex items-center gap-1">
              <PiggyBank className="h-3 w-3" /> Free to use
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
            <Link to="/privacy-policy" className="hover:text-primary hover:underline">
              Privacy Policy
            </Link>
            <span>•</span>
            <Link to="/terms-of-service" className="hover:text-primary hover:underline">
              Terms of Service
            </Link>
          </div>
        </motion.div>
      </motion.main>
    </div>
  );
}