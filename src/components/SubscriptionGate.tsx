 import { useEffect } from 'react';
 import { useSubscription } from '@/hooks/useSubscription';
 import { Button } from '@/components/ui/button';
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
 import { Crown, Sparkles, Clock, CreditCard, Check, X, AlertTriangle } from 'lucide-react';
 import { motion } from 'framer-motion';
 import { useToast } from '@/hooks/use-toast';
 
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
             Continue your journey to financial wellness with SpendWise Premium
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
 
 // Trial banner to show remaining days
 export function TrialBanner() {
   const { isInTrial, trialDaysRemaining, subscribed, openCheckout } = useSubscription();
   const { toast } = useToast();
 
   // Show trial expiration reminders as toasts
   useEffect(() => {
     if (subscribed || !isInTrial) return;
     
     // Show reminder toasts at key milestones
     const reminderShownKey = `trial_reminder_${trialDaysRemaining}`;
     const alreadyShown = sessionStorage.getItem(reminderShownKey);
     
     if (!alreadyShown) {
       if (trialDaysRemaining === 7) {
         toast({
           title: "1 Week Left in Your Trial",
           description: "Subscribe now to keep all your data and continue saving money!",
           duration: 8000,
         });
         sessionStorage.setItem(reminderShownKey, 'true');
       } else if (trialDaysRemaining === 3) {
         toast({
           title: "Only 3 Days Left!",
           description: "Your trial ends soon. Subscribe to unlock AI suggestions and more.",
           variant: "destructive",
           duration: 10000,
         });
         sessionStorage.setItem(reminderShownKey, 'true');
       } else if (trialDaysRemaining === 1) {
         toast({
           title: "Last Day of Your Trial!",
           description: "Subscribe today to avoid losing access to SpendWise.",
           variant: "destructive",
           duration: 15000,
         });
         sessionStorage.setItem(reminderShownKey, 'true');
       }
     }
   }, [isInTrial, trialDaysRemaining, subscribed, toast]);
 
   if (subscribed || !isInTrial) return null;
 
   const urgency = trialDaysRemaining <= 7;
   const critical = trialDaysRemaining <= 3;
 
   return (
     <motion.div 
       initial={{ opacity: 0, y: -10 }}
       animate={{ opacity: 1, y: 0 }}
       className={`px-4 py-2 text-center text-sm ${
         critical
           ? 'bg-destructive/10 text-destructive'
           : urgency 
             ? 'bg-warning/10 text-warning' 
             : 'bg-primary/10 text-primary'
       }`}
     >
       <div className="flex items-center justify-center gap-2">
         {critical ? (
           <AlertTriangle className="w-4 h-4" />
         ) : (
           <Clock className="w-4 h-4" />
         )}
         <span>
           {trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''} left in your free trial
         </span>
         <Button 
           variant="link" 
           size="sm" 
           onClick={openCheckout}
           className="text-inherit underline p-0 h-auto font-semibold"
         >
           Subscribe now
         </Button>
       </div>
     </motion.div>
   );
 }