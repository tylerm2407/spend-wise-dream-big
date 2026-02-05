 import { Clock, Briefcase } from 'lucide-react';
 import { Card } from '@/components/ui/card';
 
 interface WorkHoursDisplayProps {
   amount: number;
   hourlyWage: number;
   className?: string;
 }
 
 export function WorkHoursDisplay({ amount, hourlyWage, className }: WorkHoursDisplayProps) {
   if (!hourlyWage || hourlyWage <= 0) return null;
   
   const hoursWorked = amount / hourlyWage;
   const minutes = Math.round((hoursWorked % 1) * 60);
   const hours = Math.floor(hoursWorked);
   
   const formatTime = () => {
     if (hours === 0 && minutes === 0) return 'Less than 1 minute';
     if (hours === 0) return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
     if (minutes === 0) return `${hours} hour${hours !== 1 ? 's' : ''}`;
     return `${hours}h ${minutes}m`;
   };
 
   return (
     <Card className={className}>
       <div className="p-4 bg-gradient-to-br from-accent/50 to-accent/30">
         <div className="flex items-center gap-3">
           <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
             <Briefcase className="h-5 w-5 text-primary" />
           </div>
           <div>
             <h3 className="font-semibold text-sm flex items-center gap-2">
               <Clock className="h-4 w-4" />
               Work Hours Equivalent
             </h3>
             <p className="text-2xl font-bold text-primary mt-1">{formatTime()}</p>
             <p className="text-xs text-muted-foreground">
               at ${hourlyWage.toFixed(2)}/hour
             </p>
           </div>
         </div>
       </div>
     </Card>
   );
 }