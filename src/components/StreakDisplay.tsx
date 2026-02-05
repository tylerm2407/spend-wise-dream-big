 import { motion } from 'framer-motion';
 import { Flame, Shield, Trophy } from 'lucide-react';
 import { Card } from '@/components/ui/card';
 import { TapScale } from '@/components/ui/TapScale';
 import { cn } from '@/lib/utils';
 
 interface StreakDisplayProps {
   currentStreak: number;
   longestStreak: number;
   freezesRemaining: number;
   onClick?: () => void;
   compact?: boolean;
   className?: string;
 }
 
 export function StreakDisplay({ 
   currentStreak, 
   longestStreak, 
   freezesRemaining, 
   onClick,
   compact = false,
   className 
 }: StreakDisplayProps) {
   const isOnFire = currentStreak >= 7;
   
   if (compact) {
     return (
       <TapScale haptic="light" onClick={onClick}>
         <div className={cn(
           "flex items-center gap-2 px-3 py-2 rounded-full",
           "bg-gradient-to-r from-warning/10 to-orange-500/10 border border-warning/20",
           className
         )}>
           <motion.div
             animate={isOnFire ? { scale: [1, 1.2, 1] } : {}}
             transition={{ repeat: Infinity, duration: 1.5 }}
           >
             <Flame className={cn(
               "h-5 w-5",
               isOnFire ? "text-orange-500" : "text-warning"
             )} />
           </motion.div>
           <span className="font-bold text-sm">{currentStreak}</span>
           <span className="text-xs text-muted-foreground">day streak</span>
         </div>
       </TapScale>
     );
   }
 
   return (
     <Card className={cn("p-4", className)}>
       <div className="flex items-center justify-between">
         <div className="flex items-center gap-4">
           <motion.div
             className={cn(
               "w-14 h-14 rounded-full flex items-center justify-center",
               isOnFire 
                 ? "bg-gradient-to-br from-orange-400 to-red-500" 
                 : "bg-gradient-to-br from-warning/20 to-warning/40"
             )}
             animate={isOnFire ? { scale: [1, 1.05, 1] } : {}}
             transition={{ repeat: Infinity, duration: 2 }}
           >
             <Flame className={cn(
               "h-7 w-7",
               isOnFire ? "text-white" : "text-warning"
             )} />
           </motion.div>
           <div>
             <p className="text-3xl font-bold">{currentStreak}</p>
             <p className="text-sm text-muted-foreground">day streak</p>
           </div>
         </div>
         
         <div className="flex flex-col items-end gap-2">
           <div className="flex items-center gap-1 text-xs text-muted-foreground">
             <Trophy className="h-3 w-3" />
             <span>Best: {longestStreak}</span>
           </div>
           <div className="flex items-center gap-1">
             {[...Array(2)].map((_, i) => (
               <Shield 
                 key={i} 
                 className={cn(
                   "h-4 w-4",
                   i < freezesRemaining ? "text-primary" : "text-muted-foreground/30"
                 )} 
               />
             ))}
             <span className="text-xs text-muted-foreground ml-1">freezes</span>
           </div>
         </div>
       </div>
     </Card>
   );
 }