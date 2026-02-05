 import { useState, useEffect } from 'react';
 import { motion, AnimatePresence } from 'framer-motion';
 import { RefreshCw, X, Check } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { Card } from '@/components/ui/card';
 
 interface RecurringPurchasePromptProps {
   itemName: string;
   matchedPurchase?: {
     item_name: string;
     amount: number;
     frequency: string;
   };
   onConfirm: (frequency: string) => void;
   onDismiss: () => void;
 }
 
 export function RecurringPurchasePrompt({
   itemName,
   matchedPurchase,
   onConfirm,
   onDismiss,
 }: RecurringPurchasePromptProps) {
   const [isVisible, setIsVisible] = useState(true);
 
   if (!isVisible || !matchedPurchase) return null;
 
   return (
     <AnimatePresence>
       <motion.div
         initial={{ opacity: 0, y: 20, scale: 0.95 }}
         animate={{ opacity: 1, y: 0, scale: 1 }}
         exit={{ opacity: 0, y: -10, scale: 0.95 }}
       >
         <Card className="p-4 bg-primary/5 border-primary/20">
           <div className="flex items-start gap-3">
             <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
               <RefreshCw className="h-5 w-5 text-primary" />
             </div>
             <div className="flex-1 min-w-0">
               <h4 className="font-medium text-sm">Recurring purchase?</h4>
               <p className="text-xs text-muted-foreground mt-0.5">
                 This looks like "{matchedPurchase.item_name}" which you buy{' '}
                 <span className="font-medium text-foreground">{matchedPurchase.frequency}</span>
               </p>
               
               <div className="flex gap-2 mt-3">
                 <Button
                   size="sm"
                   onClick={() => {
                     onConfirm(matchedPurchase.frequency);
                     setIsVisible(false);
                   }}
                   className="h-8"
                 >
                   <Check className="h-3.5 w-3.5 mr-1" />
                   Yes, {matchedPurchase.frequency}
                 </Button>
                 <Button
                   size="sm"
                   variant="outline"
                   onClick={() => {
                     onDismiss();
                     setIsVisible(false);
                   }}
                   className="h-8"
                 >
                   <X className="h-3.5 w-3.5 mr-1" />
                   No
                 </Button>
               </div>
             </div>
           </div>
         </Card>
       </motion.div>
     </AnimatePresence>
   );
 }