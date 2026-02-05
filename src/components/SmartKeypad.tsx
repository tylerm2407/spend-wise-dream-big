 import { motion } from 'framer-motion';
 import { TapScale } from '@/components/ui/TapScale';
 import { cn } from '@/lib/utils';
 
 interface SmartKeypadProps {
   onAmountSelect: (amount: number) => void;
   recentAmounts: number[];
   className?: string;
 }
 
 const COMMON_AMOUNTS = [5, 10, 15, 20, 25, 50];
 
 export function SmartKeypad({ onAmountSelect, recentAmounts, className }: SmartKeypadProps) {
   // Combine common amounts with recent unique amounts
   const uniqueRecent = recentAmounts
     .filter(a => !COMMON_AMOUNTS.includes(a))
     .slice(0, 3);
   
   const displayAmounts = [...new Set([...COMMON_AMOUNTS, ...uniqueRecent])].slice(0, 9).sort((a, b) => a - b);
 
   return (
     <div className={cn("space-y-2", className)}>
       <p className="text-xs text-muted-foreground font-medium">Quick amounts</p>
       <div className="flex flex-wrap gap-2">
         {displayAmounts.map((amount, index) => (
           <motion.div
             key={amount}
             initial={{ opacity: 0, scale: 0.8 }}
             animate={{ opacity: 1, scale: 1 }}
             transition={{ delay: index * 0.03 }}
           >
             <TapScale haptic="light" scale={0.95}>
               <button
                 type="button"
                 onClick={() => onAmountSelect(amount)}
                 className={cn(
                   "px-4 py-2 rounded-full text-sm font-medium transition-all",
                   "bg-secondary hover:bg-secondary/80 border border-border",
                   uniqueRecent.includes(amount) && "bg-primary/10 border-primary/30"
                 )}
               >
                 ${amount}
               </button>
             </TapScale>
           </motion.div>
         ))}
       </div>
     </div>
   );
 }