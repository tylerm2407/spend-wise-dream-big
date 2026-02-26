import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PricingCards } from '@/components/PricingCards';
import { useGuest } from '@/hooks/useGuest';
import { useToast } from '@/hooks/use-toast';

export default function Index() {
  const navigate = useNavigate();
  const { enterGuestMode } = useGuest();
  const { toast } = useToast();

  const handleGuest = () => {
    enterGuestMode();
    toast({
      title: 'Guest Mode',
      description:
        "You're browsing as a guest. No data will be saved — when you close the app everything will be lost. Sign up anytime to keep your data!",
      variant: 'destructive',
      duration: 8000,
    });
    navigate('/home');
  };

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="px-6 py-10 max-w-3xl mx-auto"
      >
        {/* App title */}
        <div className="text-center mb-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Cost Clarity</h1>
          <p className="text-sm text-muted-foreground mt-1">
            See what your spending <span className="text-primary">really</span> costs you
          </p>
        </div>

        {/* Pricing Section */}
        <div className="mt-8">
          <PricingCards
            showFreeAction
            onSelectFree={() => navigate('/signup')}
          />
        </div>

        {/* Guest / Login options */}
        <div className="mt-8 space-y-3 max-w-sm mx-auto">
          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={handleGuest}
          >
            <AlertTriangle className="h-4 w-4 mr-2 text-warning" />
            Continue as Guest
          </Button>

          <Link to="/login" className="block">
            <Button variant="outline" className="w-full">
              I already have an account
            </Button>
          </Link>
        </div>

        {/* Footer */}
        <div className="mt-8 flex flex-col items-center gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span>Your data is secure and private</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/privacy-policy" className="hover:text-primary hover:underline">
              Privacy Policy
            </Link>
            <span>•</span>
            <Link to="/terms-of-service" className="hover:text-primary hover:underline">
              Terms of Service
            </Link>
          </div>
        </div>
      </motion.main>
    </div>
  );
}
