 import { useState, useCallback, useRef, useEffect } from 'react';
 import { Mic, MicOff, Loader2 } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { useToast } from '@/hooks/use-toast';
 import { cn } from '@/lib/utils';
 
 // Web Speech API types
 interface SpeechRecognitionEvent extends Event {
   results: SpeechRecognitionResultList;
 }
 
 interface SpeechRecognitionResultList {
   readonly length: number;
   item(index: number): SpeechRecognitionResult;
   [index: number]: SpeechRecognitionResult;
 }
 
 interface SpeechRecognitionResult {
   readonly length: number;
   item(index: number): SpeechRecognitionAlternative;
   [index: number]: SpeechRecognitionAlternative;
 }
 
 interface SpeechRecognitionAlternative {
   readonly transcript: string;
   readonly confidence: number;
 }
 
 interface SpeechRecognitionErrorEvent extends Event {
   error: string;
 }
 
 interface SpeechRecognitionInstance extends EventTarget {
   continuous: boolean;
   interimResults: boolean;
   lang: string;
   onresult: ((event: SpeechRecognitionEvent) => void) | null;
   onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
   onend: (() => void) | null;
   start(): void;
   stop(): void;
   abort(): void;
 }
 
 declare global {
   interface Window {
     SpeechRecognition: new () => SpeechRecognitionInstance;
     webkitSpeechRecognition: new () => SpeechRecognitionInstance;
   }
 }
 
 interface VoiceInputProps {
   onResult: (text: string) => void;
   onParsedPurchase?: (data: { amount?: number; item?: string }) => void;
   className?: string;
 }
 
 export function VoiceInput({ onResult, onParsedPurchase, className }: VoiceInputProps) {
   const [isListening, setIsListening] = useState(false);
   const [isProcessing, setIsProcessing] = useState(false);
   const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
   const { toast } = useToast();
 
   // Check browser support
   const isSupported = typeof window !== 'undefined' && 
     ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
 
   useEffect(() => {
     if (!isSupported) return;
 
     const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
     recognitionRef.current = new SpeechRecognition();
     recognitionRef.current.continuous = false;
     recognitionRef.current.interimResults = false;
     recognitionRef.current.lang = 'en-US';
 
     recognitionRef.current.onresult = (event) => {
       const transcript = event.results[0][0].transcript;
       setIsProcessing(true);
       
       // Parse the transcript for purchase info
       const parsed = parsePurchaseFromSpeech(transcript);
       
       onResult(transcript);
       if (onParsedPurchase && (parsed.amount || parsed.item)) {
         onParsedPurchase(parsed);
       }
       
       setIsProcessing(false);
       setIsListening(false);
     };
 
     recognitionRef.current.onerror = (event) => {
       console.error('Speech recognition error:', event.error);
       setIsListening(false);
       setIsProcessing(false);
       
       if (event.error === 'not-allowed') {
         toast({
           title: 'Microphone access denied',
           description: 'Please allow microphone access to use voice input.',
           variant: 'destructive',
         });
       }
     };
 
     recognitionRef.current.onend = () => {
       setIsListening(false);
     };
 
     return () => {
       recognitionRef.current?.abort();
     };
   }, [isSupported, onResult, onParsedPurchase, toast]);
 
   const parsePurchaseFromSpeech = (text: string): { amount?: number; item?: string } => {
     const result: { amount?: number; item?: string } = {};
     
     // Match patterns like "$5", "5 dollars", "five dollars", "5.50"
     const amountPatterns = [
       /\$(\d+(?:\.\d{2})?)/i,
       /(\d+(?:\.\d{2})?)\s*dollars?/i,
       /(\d+(?:\.\d{2})?)\s*bucks?/i,
     ];
     
     for (const pattern of amountPatterns) {
       const match = text.match(pattern);
       if (match) {
         result.amount = parseFloat(match[1]);
         break;
       }
     }
     
     // Word to number mapping
     const wordNumbers: Record<string, number> = {
       one: 1, two: 2, three: 3, four: 4, five: 5,
       six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
       eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
       sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
       thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
       hundred: 100,
     };
     
     if (!result.amount) {
       const wordPattern = /(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred)\s*(dollars?|bucks?)?/i;
       const match = text.match(wordPattern);
       if (match) {
         result.amount = wordNumbers[match[1].toLowerCase()];
       }
     }
     
     // Extract item name - look for patterns like "for coffee", "on lunch", "bought pizza"
     const itemPatterns = [
       /(?:for|on|bought|spent on|got)\s+(?:a\s+)?(.+?)(?:\s+for|\s+at|\s*$)/i,
       /(.+?)\s+(?:for|cost|was)\s+\$?\d/i,
     ];
     
     for (const pattern of itemPatterns) {
       const match = text.match(pattern);
       if (match && match[1]) {
         result.item = match[1].trim().replace(/\s+dollars?|\s+bucks?/gi, '').trim();
         if (result.item.length > 2) break;
       }
     }
     
     return result;
   };
 
   const toggleListening = useCallback(() => {
     if (!isSupported) {
       toast({
         title: 'Voice input not supported',
         description: 'Your browser does not support voice input. Try Chrome or Safari.',
         variant: 'destructive',
       });
       return;
     }
 
     if (isListening) {
       recognitionRef.current?.stop();
       setIsListening(false);
     } else {
       recognitionRef.current?.start();
       setIsListening(true);
     }
   }, [isListening, isSupported, toast]);
 
   if (!isSupported) {
     return null;
   }
 
   return (
     <Button
       type="button"
       variant={isListening ? 'default' : 'outline'}
       size="icon"
       onClick={toggleListening}
       disabled={isProcessing}
       className={cn(
         'relative transition-all',
         isListening && 'bg-destructive hover:bg-destructive/90 animate-pulse',
         className
       )}
       aria-label={isListening ? 'Stop listening' : 'Start voice input'}
     >
       {isProcessing ? (
         <Loader2 className="h-5 w-5 animate-spin" />
       ) : isListening ? (
         <MicOff className="h-5 w-5" />
       ) : (
         <Mic className="h-5 w-5" />
       )}
       {isListening && (
         <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full animate-ping" />
       )}
     </Button>
   );
 }