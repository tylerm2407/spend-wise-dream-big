import { useEffect, useState } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Crown, Clock, CreditCard, Check, X, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
 
 export function SubscriptionGate({ children }: SubscriptionGateProps) {
 const { 
   hasAccess, 
   loading, 
   isInTrial, 
   trialDaysRemaining, 
   subscribed,
   openCheckout 
 } = useSubscription();
 
   if (loading) {
     return (
       <div className="min-h-screen bg-background flex items-center justify-center">
         <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
       </div>
     );
   }
 
 // User has access (trial or subscribed)
 if (hasAccess) {
   return <>{children}</>;
 }
 
 const features = [
   { name: 'Track purchases', free: true, premium: true },
   { name: 'Set savings goals', free: true, premium: true },
   { name: 'Basic spending insights', free: true, premium: true },
   { name: 'AI-powered alternatives', free: false, premium: true },
   { name: 'Weekly savings challenges', free: false, premium: true },
   { name: 'Advanced analytics', free: false, premium: true },
   { name: 'Receipt scanning', free: false, premium: true },
   { name: 'Unlimited history', free: false, premium: true },
 ];
 
 // Trial expired, need to subscribe
 return (
   <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
     <motion.div
       initial={{ opacity: 0, y: 20 }}
       animate={{ opacity: 1, y: 0 }}
       transition={{ duration: 0.5 }}
       className="w-full max-w-lg"
     >
       <Card className="border-primary/20 shadow-xl">
         <CardHeader className="text-center pb-2">
           <div className="mx-auto w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center mb-4">
             <Crown className="w-8 h-8 text-primary-foreground" />
           </div>
           <CardTitle className="text-2xl">Your Free Trial Has Ended</CardTitle>
            <CardDescription className="text-base mt-2">
              Continue your journey to financial wellness with Cost Clarity Premium
           </CardDescription>
         </CardHeader>
         <CardContent className="space-y-6">
           {/* Feature Comparison Table */}
           <div className="rounded-lg border border-border overflow-hidden">
             <div className="grid grid-cols-3 bg-muted/50 p-3 text-sm font-medium">
               <span>Feature</span>
               <span className="text-center">Free Trial</span>
               <span className="text-center text-primary">Premium</span>
             </div>
             <div className="divide-y divide-border">
               {features.map((feature) => (
                 <div key={feature.name} className="grid grid-cols-3 p-3 text-sm items-center">
                   <span className="text-muted-foreground">{feature.name}</span>
                   <div className="flex justify-center">
                     {feature.free ? (
                       <Check className="w-4 h-4 text-success" />
                     ) : (
                       <X className="w-4 h-4 text-muted-foreground/50" />
                     )}
                   </div>
                   <div className="flex justify-center">
                     <Check className="w-4 h-4 text-primary" />
                   </div>
                 </div>
               ))}
             </div>
           </div>
 
           <div className="bg-gradient-primary/10 rounded-lg p-4 text-center border border-primary/20">
             <div className="text-3xl font-bold text-primary">$5</div>
             <div className="text-muted-foreground text-sm">per month</div>
             <div className="text-xs text-muted-foreground mt-1">Cancel anytime</div>
           </div>
 
           <Button 
             onClick={openCheckout}
             className="w-full h-12 text-lg bg-gradient-primary glow"
             size="lg"
           >
             <CreditCard className="w-5 h-5 mr-2" />
             Subscribe Now
           </Button>
 
           <p className="text-xs text-center text-muted-foreground">
             Secure payment powered by Stripe. You can cancel your subscription at any time from Settings.
           </p>
         </CardContent>
       </Card>
     </motion.div>
   </div>
 );
 }
 
// Trial popup to show when 7 or fewer days remaining
export function TrialBanner() {
  const { isInTrial, trialDaysRemaining, subscribed, openCheckout } = useSubscription();
  const [showPopup, setShowPopup] = useState(false);

  // Show popup when 7 or fewer days left
  useEffect(() => {
    if (subscribed || !isInTrial) return;
    
    // Only show popup at 7 days or less
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
              ? "Last Day of Your Trial!" 
              : `${trialDaysRemaining} Days Left in Your Trial`}
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            {critical 
              ? "Subscribe now to keep all your data and continue your savings journey!"
              : "Your free trial is ending soon. Upgrade to Premium to unlock all features."}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 pt-2">
          <div className="bg-gradient-primary/10 rounded-lg p-4 text-center border border-primary/20">
            <div className="text-2xl font-bold text-primary">$5/month</div>
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
              Subscribe Now
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => setShowPopup(false)}
              className="text-muted-foreground"
            >
              Maybe later
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}