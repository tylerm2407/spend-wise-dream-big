 import { useEffect } from 'react';
 import { useNavigate } from 'react-router-dom';
 import { motion } from 'framer-motion';
 import { CheckCircle, Sparkles, TrendingUp, Shield, Zap } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { Card, CardContent } from '@/components/ui/card';
 import confetti from 'canvas-confetti';
 
 const benefits = [
   { icon: Sparkles, title: 'AI-Powered Suggestions', description: 'Get smart alternatives for every purchase' },
   { icon: TrendingUp, title: 'Advanced Analytics', description: 'Deep insights into your spending patterns' },
   { icon: Shield, title: 'Unlimited History', description: 'Access your complete purchase history' },
   { icon: Zap, title: 'Priority Features', description: 'First access to new features and updates' },
 ];
 
 export default function SubscriptionSuccess() {
   const navigate = useNavigate();
 
   useEffect(() => {
     // Trigger confetti celebration
     const duration = 3000;
     const end = Date.now() + duration;
 
     const frame = () => {
       confetti({
         particleCount: 3,
         angle: 60,
         spread: 55,
         origin: { x: 0 },
         colors: ['#10b981', '#3b82f6', '#8b5cf6'],
       });
       confetti({
         particleCount: 3,
         angle: 120,
         spread: 55,
         origin: { x: 1 },
         colors: ['#10b981', '#3b82f6', '#8b5cf6'],
       });
 
       if (Date.now() < end) {
         requestAnimationFrame(frame);
       }
     };
     frame();
   }, []);
 
   return (
     <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
       <motion.div
         initial={{ opacity: 0, scale: 0.9 }}
         animate={{ opacity: 1, scale: 1 }}
         transition={{ duration: 0.5 }}
         className="w-full max-w-lg"
       >
         <Card className="border-0 shadow-xl bg-card/95 backdrop-blur">
           <CardContent className="pt-8 pb-6 px-6 text-center">
             <motion.div
               initial={{ scale: 0 }}
               animate={{ scale: 1 }}
               transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
               className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center"
             >
               <CheckCircle className="w-12 h-12 text-primary" />
             </motion.div>
 
             <motion.h1
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.3 }}
               className="text-2xl font-bold text-foreground mb-2"
             >
               Welcome to Premium! 🎉
             </motion.h1>
 
             <motion.p
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.4 }}
               className="text-muted-foreground mb-8"
             >
               Your subscription is now active. Here's what you've unlocked:
             </motion.p>
 
             <div className="space-y-3 mb-8">
               {benefits.map((benefit, index) => (
                 <motion.div
                   key={benefit.title}
                   initial={{ opacity: 0, x: -20 }}
                   animate={{ opacity: 1, x: 0 }}
                   transition={{ delay: 0.5 + index * 0.1 }}
                   className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 text-left"
                 >
                   <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                     <benefit.icon className="w-5 h-5 text-primary" />
                   </div>
                   <div>
                     <p className="font-medium text-sm text-foreground">{benefit.title}</p>
                     <p className="text-xs text-muted-foreground">{benefit.description}</p>
                   </div>
                 </motion.div>
               ))}
             </div>
 
             <motion.div
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.9 }}
             >
               <Button
                 onClick={() => navigate('/home')}
                 className="w-full h-12 text-base font-semibold"
                 size="lg"
               >
                 Start Saving Smarter
               </Button>
             </motion.div>
           </CardContent>
         </Card>
       </motion.div>
     </div>
   );
 }