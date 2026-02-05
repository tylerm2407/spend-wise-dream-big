 import { motion } from 'framer-motion';
 import { Lock } from 'lucide-react';
 import { TapScale } from '@/components/ui/TapScale';
 import { cn } from '@/lib/utils';
 
 interface Achievement {
   type: string;
   name: string;
   description: string;
   icon: string;
   unlocked: boolean;
   unlockedAt?: string;
 }
 
 interface AchievementBadgesProps {
   achievements: Achievement[];
   className?: string;
 }
 
 export function AchievementBadges({ achievements, className }: AchievementBadgesProps) {
   const unlockedCount = achievements.filter(a => a.unlocked).length;
   
   return (
     <div className={cn("space-y-4", className)}>
       <div className="flex items-center justify-between">
         <h3 className="font-semibold">Achievements</h3>
         <span className="text-sm text-muted-foreground">
           {unlockedCount}/{achievements.length} unlocked
         </span>
       </div>
       
       <div className="grid grid-cols-3 gap-3">
         {achievements.map((achievement, index) => (
           <motion.div
             key={achievement.type}
             initial={{ opacity: 0, scale: 0.8 }}
             animate={{ opacity: 1, scale: 1 }}
             transition={{ delay: index * 0.05 }}
           >
             <TapScale haptic="light" scale={0.95}>
               <div
                 className={cn(
                   "flex flex-col items-center p-3 rounded-xl border transition-all",
                   achievement.unlocked
                     ? "bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20"
                     : "bg-muted/30 border-border opacity-50"
                 )}
               >
                 <div className={cn(
                   "w-12 h-12 rounded-full flex items-center justify-center mb-2",
                   achievement.unlocked 
                     ? "bg-primary/10" 
                     : "bg-muted"
                 )}>
                   {achievement.unlocked ? (
                     <span className="text-2xl">{achievement.icon}</span>
                   ) : (
                     <Lock className="h-5 w-5 text-muted-foreground" />
                   )}
                 </div>
                 <p className="text-xs font-medium text-center line-clamp-2">
                   {achievement.name}
                 </p>
                 {achievement.unlocked && (
                   <p className="text-[10px] text-muted-foreground mt-1">
                     {new Date(achievement.unlockedAt!).toLocaleDateString()}
                   </p>
                 )}
               </div>
             </TapScale>
           </motion.div>
         ))}
       </div>
     </div>
   );
 }