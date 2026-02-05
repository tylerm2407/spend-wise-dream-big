 import { useState, useRef } from 'react';
 import { Camera, Upload, Loader2, X, RotateCcw } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
 import { useToast } from '@/hooks/use-toast';
 import { supabase } from '@/integrations/supabase/client';
 
 interface ReceiptData {
   merchant?: string;
   total?: number;
   date?: string;
   items?: string[];
 }
 
 interface ReceiptScannerProps {
   onReceiptScanned: (data: ReceiptData) => void;
 }
 
 export function ReceiptScanner({ onReceiptScanned }: ReceiptScannerProps) {
   const [isOpen, setIsOpen] = useState(false);
   const [isProcessing, setIsProcessing] = useState(false);
   const [previewUrl, setPreviewUrl] = useState<string | null>(null);
   const fileInputRef = useRef<HTMLInputElement>(null);
   const { toast } = useToast();
 
   const handleFileSelect = async (file: File) => {
     if (!file.type.startsWith('image/')) {
       toast({
         title: 'Invalid file',
         description: 'Please select an image file.',
         variant: 'destructive',
       });
       return;
     }
 
     // Create preview
     const reader = new FileReader();
     reader.onload = (e) => {
       setPreviewUrl(e.target?.result as string);
     };
     reader.readAsDataURL(file);
 
     // Process the image
     await processReceipt(file);
   };
 
   const processReceipt = async (file: File) => {
     setIsProcessing(true);
     
     try {
       // Convert to base64
       const base64 = await fileToBase64(file);
       
       // Call edge function
       const { data, error } = await supabase.functions.invoke('scan-receipt', {
         body: { image: base64 },
       });
 
       if (error) throw error;
 
       if (data?.merchant || data?.total) {
         onReceiptScanned(data);
         toast({
           title: 'Receipt scanned!',
           description: `Found: ${data.merchant || 'Unknown'} - $${data.total || '?'}`,
         });
         setIsOpen(false);
         setPreviewUrl(null);
       } else {
         toast({
           title: 'Could not read receipt',
           description: 'Try taking a clearer photo with good lighting.',
           variant: 'destructive',
         });
       }
     } catch (error) {
       console.error('Receipt scan error:', error);
       toast({
         title: 'Scan failed',
         description: 'Unable to process receipt. Please try again.',
         variant: 'destructive',
       });
     } finally {
       setIsProcessing(false);
     }
   };
 
   const fileToBase64 = (file: File): Promise<string> => {
     return new Promise((resolve, reject) => {
       const reader = new FileReader();
       reader.onload = () => {
         const result = reader.result as string;
         // Remove data URL prefix
         const base64 = result.split(',')[1];
         resolve(base64);
       };
       reader.onerror = reject;
       reader.readAsDataURL(file);
     });
   };
 
   const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (file) {
       handleFileSelect(file);
     }
   };
 
   const handleRetry = () => {
     setPreviewUrl(null);
     fileInputRef.current?.click();
   };
 
   return (
     <>
       <Button
         type="button"
         variant="outline"
         size="icon"
         onClick={() => setIsOpen(true)}
         aria-label="Scan receipt"
       >
         <Camera className="h-5 w-5" />
       </Button>
 
       <Dialog open={isOpen} onOpenChange={setIsOpen}>
         <DialogContent className="sm:max-w-md">
           <DialogHeader>
             <DialogTitle>Scan Receipt</DialogTitle>
           </DialogHeader>
 
           <div className="space-y-4">
             {previewUrl ? (
               <div className="relative">
                 <img 
                   src={previewUrl} 
                   alt="Receipt preview" 
                   className="w-full max-h-64 object-contain rounded-lg border"
                 />
                 {isProcessing && (
                   <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
                     <div className="text-center">
                       <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
                       <p className="text-sm text-muted-foreground">Analyzing receipt...</p>
                     </div>
                   </div>
                 )}
               </div>
             ) : (
               <div 
                 className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                 onClick={() => fileInputRef.current?.click()}
               >
                 <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                 <p className="text-sm font-medium">Tap to upload a receipt</p>
                 <p className="text-xs text-muted-foreground mt-1">
                   JPG, PNG or HEIC
                 </p>
               </div>
             )}
 
             <input
               ref={fileInputRef}
               type="file"
               accept="image/*"
               capture="environment"
               onChange={handleInputChange}
               className="hidden"
             />
 
             <div className="flex gap-2">
               {previewUrl && !isProcessing && (
                 <Button 
                   variant="outline" 
                   onClick={handleRetry}
                   className="flex-1"
                 >
                   <RotateCcw className="h-4 w-4 mr-2" />
                   Try Again
                 </Button>
               )}
               <Button
                 variant="outline"
                 onClick={() => {
                   setIsOpen(false);
                   setPreviewUrl(null);
                 }}
                 className="flex-1"
               >
                 <X className="h-4 w-4 mr-2" />
                 Cancel
               </Button>
             </div>
           </div>
         </DialogContent>
       </Dialog>
     </>
   );
 }