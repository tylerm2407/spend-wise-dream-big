 import { useMemo } from 'react';
 import { usePurchases } from './usePurchases';
 
 interface RecurringMatch {
   item_name: string;
   amount: number;
   frequency: string;
   count: number;
 }
 
 export function useRecurringDetection(currentItemName: string) {
   const { purchases } = usePurchases();
 
   const matchedRecurring = useMemo((): RecurringMatch | null => {
     if (!currentItemName || currentItemName.length < 3) return null;
     
     const normalizedInput = currentItemName.toLowerCase().trim();
     
     // Group purchases by similar names
     const purchaseCounts = new Map<string, { 
       count: number; 
       amounts: number[]; 
       dates: Date[];
       originalName: string;
     }>();
     
     purchases.forEach(p => {
       const normalizedName = p.item_name.toLowerCase().trim();
       const existing = purchaseCounts.get(normalizedName);
       
       if (existing) {
         existing.count++;
         existing.amounts.push(Number(p.amount));
         existing.dates.push(new Date(p.purchase_date!));
       } else {
         purchaseCounts.set(normalizedName, {
           count: 1,
           amounts: [Number(p.amount)],
           dates: [new Date(p.purchase_date!)],
           originalName: p.item_name,
         });
       }
     });
     
     // Find matching purchase pattern
     for (const [name, data] of purchaseCounts.entries()) {
       // Check if current input matches or is similar to existing purchase
       const isSimilar = 
         name.includes(normalizedInput) || 
         normalizedInput.includes(name) ||
         levenshteinSimilarity(name, normalizedInput) > 0.7;
       
       if (isSimilar && data.count >= 2) {
         // Determine frequency based on purchase dates
         const frequency = detectFrequency(data.dates);
         const avgAmount = data.amounts.reduce((a, b) => a + b, 0) / data.amounts.length;
         
         return {
           item_name: data.originalName,
           amount: Math.round(avgAmount * 100) / 100,
           frequency,
           count: data.count,
         };
       }
     }
     
     return null;
   }, [currentItemName, purchases]);
 
   return { matchedRecurring };
 }
 
 function detectFrequency(dates: Date[]): string {
   if (dates.length < 2) return 'one-time';
   
   // Sort dates
   const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
   
   // Calculate average days between purchases
   let totalDays = 0;
   for (let i = 1; i < sorted.length; i++) {
     const diffDays = (sorted[i].getTime() - sorted[i-1].getTime()) / (1000 * 60 * 60 * 24);
     totalDays += diffDays;
   }
   const avgDays = totalDays / (sorted.length - 1);
   
   // Classify frequency
   if (avgDays <= 2) return 'daily';
   if (avgDays <= 10) return 'weekly';
   if (avgDays <= 45) return 'monthly';
   return 'one-time';
 }
 
 function levenshteinSimilarity(str1: string, str2: string): number {
   const len1 = str1.length;
   const len2 = str2.length;
   
   if (len1 === 0) return len2 === 0 ? 1 : 0;
   if (len2 === 0) return 0;
   
   const matrix: number[][] = [];
   
   for (let i = 0; i <= len1; i++) {
     matrix[i] = [i];
   }
   for (let j = 0; j <= len2; j++) {
     matrix[0][j] = j;
   }
   
   for (let i = 1; i <= len1; i++) {
     for (let j = 1; j <= len2; j++) {
       const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
       matrix[i][j] = Math.min(
         matrix[i - 1][j] + 1,
         matrix[i][j - 1] + 1,
         matrix[i - 1][j - 1] + cost
       );
     }
   }
   
   const distance = matrix[len1][len2];
   const maxLen = Math.max(len1, len2);
   return 1 - distance / maxLen;
 }