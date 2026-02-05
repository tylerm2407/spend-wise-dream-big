 import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
 import { useAuth } from './useAuth';
 import { supabase } from '@/integrations/supabase/client';
 
 interface SubscriptionStatus {
   subscribed: boolean;
   isInTrial: boolean;
   trialDaysRemaining: number;
   trialEndDate: string | null;
   hasAccess: boolean;
   subscriptionEnd: string | null;
   productId: string | null;
 }
 
 interface SubscriptionContextType extends SubscriptionStatus {
   loading: boolean;
   error: string | null;
   checkSubscription: () => Promise<void>;
   openCheckout: () => Promise<void>;
   openCustomerPortal: () => Promise<void>;
 }
 
 const defaultStatus: SubscriptionStatus = {
   subscribed: false,
   isInTrial: true,
   trialDaysRemaining: 30,
   trialEndDate: null,
   hasAccess: true,
   subscriptionEnd: null,
   productId: null,
 };
 
 const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);
 
 export function SubscriptionProvider({ children }: { children: ReactNode }) {
   const { user, session } = useAuth();
   const [status, setStatus] = useState<SubscriptionStatus>(defaultStatus);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);
 
   const checkSubscription = useCallback(async () => {
     if (!session?.access_token) {
       setStatus(defaultStatus);
       setLoading(false);
       return;
     }
 
     try {
       setError(null);
       const { data, error: fnError } = await supabase.functions.invoke('check-subscription');
       
       if (fnError) {
         console.error('Error checking subscription:', fnError);
         setError(fnError.message);
         return;
       }
 
       if (data.error) {
         console.error('Subscription check error:', data.error);
         setError(data.error);
         return;
       }
 
       setStatus({
         subscribed: data.subscribed ?? false,
         isInTrial: data.is_in_trial ?? false,
         trialDaysRemaining: data.trial_days_remaining ?? 0,
         trialEndDate: data.trial_end_date ?? null,
         hasAccess: data.has_access ?? false,
         subscriptionEnd: data.subscription_end ?? null,
         productId: data.product_id ?? null,
       });
     } catch (err) {
       console.error('Failed to check subscription:', err);
       setError(err instanceof Error ? err.message : 'Unknown error');
     } finally {
       setLoading(false);
     }
   }, [session?.access_token]);
 
   const openCheckout = async () => {
     if (!session?.access_token) {
       throw new Error('Not authenticated');
     }
 
     const { data, error: fnError } = await supabase.functions.invoke('create-checkout');
     
     if (fnError || data.error) {
       throw new Error(fnError?.message || data.error);
     }
 
     if (data.url) {
       window.open(data.url, '_blank');
     }
   };
 
   const openCustomerPortal = async () => {
     if (!session?.access_token) {
       throw new Error('Not authenticated');
     }
 
     const { data, error: fnError } = await supabase.functions.invoke('customer-portal');
     
     if (fnError || data.error) {
       throw new Error(fnError?.message || data.error);
     }
 
     if (data.url) {
       window.open(data.url, '_blank');
     }
   };
 
   useEffect(() => {
     if (user) {
       checkSubscription();
     } else {
       setStatus(defaultStatus);
       setLoading(false);
     }
   }, [user, checkSubscription]);
 
   // Auto-refresh every minute
   useEffect(() => {
     if (!user) return;
     
     const interval = setInterval(checkSubscription, 60000);
     return () => clearInterval(interval);
   }, [user, checkSubscription]);
 
   return (
     <SubscriptionContext.Provider
       value={{
         ...status,
         loading,
         error,
         checkSubscription,
         openCheckout,
         openCustomerPortal,
       }}
     >
       {children}
     </SubscriptionContext.Provider>
   );
 }
 
 export function useSubscription() {
   const context = useContext(SubscriptionContext);
   if (context === undefined) {
     throw new Error('useSubscription must be used within a SubscriptionProvider');
   }
   return context;
 }