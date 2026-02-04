import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Target, 
  DollarSign, 
  ArrowRight,
  Sparkles,
  BarChart3,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function Index() {
  const features = [
    {
      icon: <TrendingUp className="h-6 w-6" />,
      title: 'See the True Cost',
      description: '$5 daily coffee = $1,825/year = vacation delayed by weeks',
    },
    {
      icon: <Target className="h-6 w-6" />,
      title: 'Track Your Goals',
      description: 'Visualize how every purchase affects your dreams',
    },
    {
      icon: <BarChart3 className="h-6 w-6" />,
      title: 'Smart Insights',
      description: 'Understand your spending patterns with beautiful charts',
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen bg-gradient-hero overflow-hidden">
      {/* Hero Section */}
      <motion.main
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="px-6 py-12 max-w-md mx-auto"
      >
        {/* Logo */}
        <motion.div variants={itemVariants} className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-6">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              Make smarter spending decisions
            </span>
          </div>
          
          <h1 className="text-4xl font-bold mb-4 tracking-tight">
            See the{' '}
            <span className="text-gradient-primary">True Cost</span>
            {' '}of Everything
          </h1>
          
          <p className="text-lg text-muted-foreground leading-relaxed">
            Understand how your daily purchases affect your long-term goals through emotional, relatable visualizations.
          </p>
        </motion.div>

        {/* Visualization Preview */}
        <motion.div variants={itemVariants}>
          <Card className="p-6 mb-8 glass-card relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-muted-foreground">Daily Coffee</span>
                <span className="font-bold text-xl">$5.00</span>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm">Monthly</span>
                  <span className="font-semibold">$150</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm">Yearly</span>
                  <span className="font-semibold text-primary">$1,825</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg">
                  <span className="text-sm">10 Years (invested)</span>
                  <span className="font-bold text-success">$25,232</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  That's equivalent to:
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="px-3 py-1 bg-secondary rounded-full text-sm">
                    🏝️ A dream vacation
                  </span>
                  <span className="px-3 py-1 bg-secondary rounded-full text-sm">
                    💰 1 month rent
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Features */}
        <motion.div variants={itemVariants} className="space-y-4 mb-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center flex-shrink-0 text-primary-foreground">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* CTAs */}
        <motion.div variants={itemVariants} className="space-y-3">
          <Link to="/signup" className="block">
            <Button className="w-full h-14 text-lg bg-gradient-primary hover:opacity-90 glow">
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          
          <Link to="/login" className="block">
            <Button variant="outline" className="w-full h-12">
              I already have an account
            </Button>
          </Link>
        </motion.div>

        {/* Trust Badge */}
        <motion.div 
          variants={itemVariants}
          className="mt-8 flex items-center justify-center gap-2 text-muted-foreground"
        >
          <Shield className="h-4 w-4" />
          <span className="text-sm">Your data is secure and private</span>
        </motion.div>
      </motion.main>
    </div>
  );
}