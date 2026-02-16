import { useEffect, useState } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Crown, Clock, CreditCard, Check, X, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface SubscriptionGateProps {
  children: React.ReactNode;
}

/**
 * SubscriptionGate no longer blocks the app for free tier users.
 * All authenticated users can browse freely. Pro-specific features
 * are gated at the action level via useSubscriptionGate.
 */
export function SubscriptionGate({ children }: SubscriptionGateProps) {
  const { loading } = useSubscription();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // All users always have access - free tier with limits, Pro with unlimited
  return <>{children}</>;
}

// Trial popup to show when 7 or fewer days remaining in Pro trial
export function TrialBanner() {
  const { isInTrial, trialDaysRemaining, subscribed, openCheckout } = useSubscription();
  const [showPopup, setShowPopup] = useState(false);

  // Show popup when 7 or fewer days left
  useEffect(() => {
    if (subscribed || !isInTrial) return;
    
    if (trialDaysRemaining <= 7) {
      const popupShownKey = `trial_popup_shown_${trialDaysRemaining}`;
      const alreadyShown = sessionStorage.getItem(popupShownKey);
      
      if (!alreadyShown) {
        setShowPopup(true);
        sessionStorage.setItem(popupShownKey, 'true');
      }
    }
  }, [isInTrial, trialDaysRemaining, subscribed]);

  if (subscribed || !isInTrial || trialDaysRemaining > 7) return null;

  const critical = trialDaysRemaining <= 3;

  return (
    <Dialog open={showPopup} onOpenChange={setShowPopup}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className={`mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-2 ${
            critical ? 'bg-destructive/10' : 'bg-warning/10'
          }`}>
            {critical ? (
              <AlertTriangle className={`w-7 h-7 text-destructive`} />
            ) : (
              <Clock className="w-7 h-7 text-warning" />
            )}
          </div>
          <DialogTitle className="text-xl">
            {trialDaysRemaining === 1 
              ? "Last Day of Your Pro Trial!" 
              : `${trialDaysRemaining} Days Left in Your Pro Trial`}
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            {critical 
              ? "Subscribe now to keep unlimited goals, AI alternatives, and all Pro features!"
              : "Your free Pro trial is ending soon. Subscribe to keep unlimited access to all features."}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 pt-2">
          <div className="bg-gradient-primary/10 rounded-lg p-4 text-center border border-primary/20">
            <div className="text-2xl font-bold text-primary">$4.99/month</div>
            <div className="text-xs text-muted-foreground mt-1">Cancel anytime</div>
          </div>

          <div className="flex flex-col gap-2">
            <Button 
              onClick={() => {
                openCheckout();
                setShowPopup(false);
              }}
              className="w-full h-11 bg-gradient-primary glow"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Subscribe to Pro
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => setShowPopup(false)}
              className="text-muted-foreground"
            >
              Continue with Free
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
