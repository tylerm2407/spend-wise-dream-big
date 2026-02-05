 import { motion } from 'framer-motion';
 import { Star, Clock } from 'lucide-react';
 import { TapScale } from '@/components/ui/TapScale';
 import { formatCurrency } from '@/lib/calculations';
 import { cn } from '@/lib/utils';
 
 interface Favorite {
   id: string;
   item_name: string;
   amount: number;
   category: string;
   frequency: string;
   use_count: number;
 }
 
 interface FavoritesListProps {
   favorites: Favorite[];
   onSelect: (favorite: Favorite) => void;
   className?: string;
 }
 
 export function FavoritesList({ favorites, onSelect, className }: FavoritesListProps) {
   if (favorites.length === 0) return null;
 
   return (
     <div className={cn("space-y-3", className)}>
       <div className="flex items-center gap-2">
         <Star className="h-4 w-4 text-warning" />
         <span className="text-sm font-medium">Favorites</span>
         <span className="text-xs text-muted-foreground">(2-tap logging)</span>
       </div>
       <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
         {favorites.map((fav, index) => (
           <motion.div
             key={fav.id}
             initial={{ opacity: 0, x: -10 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ delay: index * 0.05 }}
           >
             <TapScale haptic="medium" scale={0.95}>
               <button
                 type="button"
                 onClick={() => onSelect(fav)}
                 className={cn(
                   "flex-shrink-0 px-4 py-3 rounded-xl border transition-all",
                   "bg-gradient-to-br from-warning/5 to-warning/10 border-warning/20",
                   "hover:border-warning/40 hover:shadow-md"
                 )}
               >
                 <div className="flex items-center gap-2">
                   <span className="font-medium text-sm whitespace-nowrap">{fav.item_name}</span>
                   <span className="text-primary font-bold text-sm">{formatCurrency(fav.amount, 0)}</span>
                 </div>
                 <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                   <Clock className="h-3 w-3" />
                   <span>Used {fav.use_count}x</span>
                 </div>
               </button>
             </TapScale>
           </motion.div>
         ))}
       </div>
     </div>
   );
 }