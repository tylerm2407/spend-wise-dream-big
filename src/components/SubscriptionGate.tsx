 import { useSubscription } from '@/hooks/useSubscription';
 import { Button } from '@/components/ui/button';
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
 import { Crown, Sparkles, Clock, CreditCard } from 'lucide-react';
 import { motion } from 'framer-motion';
 
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
 
   // Trial expired, need to subscribe
   return (
     <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
       <motion.div
         initial={{ opacity: 0, y: 20 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ duration: 0.5 }}
         className="w-full max-w-md"
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
             <div className="space-y-3">
               <div className="flex items-center gap-3 text-sm">
                 <Sparkles className="w-5 h-5 text-primary shrink-0" />
                 <span>Track all your purchases & savings</span>
               </div>
               <div className="flex items-center gap-3 text-sm">
                 <Sparkles className="w-5 h-5 text-primary shrink-0" />
                 <span>AI-powered alternative suggestions</span>
               </div>
               <div className="flex items-center gap-3 text-sm">
                 <Sparkles className="w-5 h-5 text-primary shrink-0" />
                 <span>Goal tracking & progress insights</span>
               </div>
               <div className="flex items-center gap-3 text-sm">
                 <Sparkles className="w-5 h-5 text-primary shrink-0" />
                 <span>Weekly savings challenges</span>
               </div>
             </div>
 
             <div className="bg-muted/50 rounded-lg p-4 text-center">
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
 
   if (subscribed || !isInTrial) return null;
 
   const urgency = trialDaysRemaining <= 7;
 
   return (
     <motion.div 
       initial={{ opacity: 0, y: -10 }}
       animate={{ opacity: 1, y: 0 }}
       className={`px-4 py-2 text-center text-sm ${
         urgency 
           ? 'bg-destructive/10 text-destructive' 
           : 'bg-primary/10 text-primary'
       }`}
     >
       <div className="flex items-center justify-center gap-2">
         <Clock className="w-4 h-4" />
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