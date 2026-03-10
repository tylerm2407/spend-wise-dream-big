import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, Check, X, AlertCircle, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type Category = 'dining' | 'shopping' | 'transportation' | 'entertainment' | 'subscriptions' | 'groceries' | 'health' | 'utilities' | 'travel' | 'other';

interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  category: Category;
  skip: boolean;
}

// ─── CSV Parsing ─────────────────────────────────────────────────────────────

function detectDelimiter(line: string): string {
  const commas = (line.match(/,/g) || []).length;
  const tabs = (line.match(/\t/g) || []).length;
  return tabs > commas ? '\t' : ',';
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseAmount(raw: string): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[$,\s]/g, '').replace(/[()]/g, '-');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : Math.abs(num);
}

function parseDate(raw: string): string | null {
  if (!raw) return null;
  // Try ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.substring(0, 10);
  // Try MM/DD/YYYY or M/D/YYYY
  const m1 = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m1) return `${m1[3]}-${m1[1].padStart(2, '0')}-${m1[2].padStart(2, '0')}`;
  // Try MM-DD-YYYY
  const m2 = raw.match(/^(\d{1,2})-(\d{1,2})-(\d{4})/);
  if (m2) return `${m2[3]}-${m2[1].padStart(2, '0')}-${m2[2].padStart(2, '0')}`;
  return null;
}

function guessCategory(description: string): Category {
  const d = description.toUpperCase();
  if (/STARBUCKS|MCDONALD|BURGER|PIZZA|RESTAURANT|SUSHI|TACO|CHIPOTLE|PANERA|SUBWAY|DUNKIN|DOMINO|WENDY|CHICK-FIL|KFC|POPEYE|WAFFLE|DENNY|IHOP|APPLEBEE|CAFE|COFFEE|DELI|BAR |GRILL|PUB |BREW|DINING/.test(d)) return 'dining';
  if (/GROCERY|SAFEWAY|KROGER|WHOLE FOODS|TRADER JOE|ALDI|PUBLIX|WEGMAN|FOOD LION|STOP.SHOP|GIANT|RALPHS|SPROUTS|MARKET|H-E-B|VONS|MEIJER/.test(d)) return 'groceries';
  if (/UBER|LYFT|TAXI|SHELL|EXXON|CHEVRON|BP |SUNOCO|MARATHON|MOBIL|SPEEDWAY|CIRCLE K|PARKING|TOLL|TRANSIT|MTA |METRO|BUS |TRAIN|AMTRAK/.test(d)) return 'transportation';
  if (/NETFLIX|SPOTIFY|HULU|DISNEY|HBO|APPLE MUSIC|AMAZON PRIME|YOUTUBE|PEACOCK|PARAMOUNT|TIDAL|AUDIBLE|DROPBOX|ICLOUD|GOOGLE ONE|MICROSOFT 365|ADOBE|ZOOM|SLACK/.test(d)) return 'subscriptions';
  if (/AMAZON|TARGET|WALMART|BEST BUY|COSTCO|EBAY|ETSY|IKEA|HOME DEPOT|LOWES|NORDSTROM|MACY|GAP |OLD NAVY|H&M|ZARA|APPLE STORE|SAMSUNG|SHOPIFY|WAYFAIR/.test(d)) return 'shopping';
  if (/CVS|WALGREEN|PHARMACY|RITE AID|HOSPITAL|CLINIC|DOCTOR|DENTAL|VISION|THERAPY|URGENT CARE|LAB |MEDICAL|HEALTH|FITBIT|PELOTON|GYM |PLANET FITNESS|YMCA/.test(d)) return 'health';
  if (/ELECTRIC|GAS COMPANY|WATER DEPT|XFINITY|COMCAST|AT&T|VERIZON|T-MOBILE|SPECTRUM|COX |UTILITY|WASTE MGMT|SEWER/.test(d)) return 'utilities';
  if (/AIRLINE|DELTA|UNITED|AMERICAN AIR|SOUTHWEST|JETBLUE|SPIRIT|FRONTIER|HOTEL|MARRIOTT|HILTON|HYATT|IHG|AIRBNB|VRBO|EXPEDIA|BOOKING|PRICELINE|RENTAL CAR|HERTZ|ENTERPRISE/.test(d)) return 'travel';
  if (/MOVIE|CINEMA|AMC |REGAL|CONCERT|TICKETMASTER|STUBHUB|THEATER|SPORT|GOLF|BOWLING|ARCADE|STEAM|PLAYSTATION|XBOX|NINTENDO/.test(d)) return 'entertainment';
  return 'other';
}

interface ColMap { date: number; desc: number; amount: number; debit?: number; credit?: number }

function detectColumns(headers: string[]): ColMap | null {
  const h = headers.map(h => h.toLowerCase().replace(/[^a-z]/g, ''));
  const find = (...keys: string[]) => h.findIndex(col => keys.some(k => col.includes(k)));

  const dateIdx = find('date', 'transactiondate', 'postdate');
  const descIdx = find('description', 'desc', 'memo', 'name', 'narrative', 'detail');
  const amountIdx = find('amount', 'amt');
  const debitIdx = find('debit', 'withdrawal', 'charge');
  const creditIdx = find('credit', 'deposit', 'payment');

  if (dateIdx === -1 || descIdx === -1) return null;
  if (amountIdx !== -1) return { date: dateIdx, desc: descIdx, amount: amountIdx };
  if (debitIdx !== -1) return { date: dateIdx, desc: descIdx, amount: debitIdx, debit: debitIdx, credit: creditIdx === -1 ? undefined : creditIdx };
  return null;
}

function parseCSV(text: string): ParsedTransaction[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  // Skip common bank header boilerplate (non-data rows before the actual CSV headers)
  let headerIdx = 0;
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const delimiter = detectDelimiter(lines[i]);
    const cols = parseCsvLine(lines[i], delimiter);
    const colMap = detectColumns(cols);
    if (colMap !== null) { headerIdx = i; break; }
  }

  const delimiter = detectDelimiter(lines[headerIdx]);
  const headers = parseCsvLine(lines[headerIdx], delimiter);
  const colMap = detectColumns(headers);
  if (!colMap) return [];

  const results: ParsedTransaction[] = [];

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i], delimiter);
    if (cols.length < Math.max(colMap.date, colMap.desc, colMap.amount) + 1) continue;

    const rawDate = cols[colMap.date] ?? '';
    const rawDesc = cols[colMap.desc] ?? '';

    let amount: number | null = null;
    if (colMap.debit !== undefined) {
      // Separate debit/credit columns — only import debits
      amount = parseAmount(cols[colMap.debit] ?? '');
      if (!amount || amount <= 0) continue; // skip credits/transfers
    } else {
      amount = parseAmount(cols[colMap.amount] ?? '');
      if (!amount || amount <= 0) continue; // skip income/credits
    }

    const date = parseDate(rawDate);
    if (!date) continue;

    const description = rawDesc.replace(/^"|"$/g, '').trim();
    if (!description) continue;

    results.push({
      date,
      description,
      amount,
      category: guessCategory(description),
      skip: false,
    });
  }

  return results;
}

// ─── Component ────────────────────────────────────────────────────────────────

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'dining', label: 'Dining' },
  { value: 'shopping', label: 'Shopping' },
  { value: 'transportation', label: 'Transportation' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'subscriptions', label: 'Subscriptions' },
  { value: 'groceries', label: 'Groceries' },
  { value: 'health', label: 'Health' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'travel', label: 'Travel' },
  { value: 'other', label: 'Other' },
];

interface Props {
  onClose: () => void;
}

export function BankCSVImport({ onClose }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'upload' | 'review' | 'done'>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<ParsedTransaction[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [showAll, setShowAll] = useState(false);

  const handleFile = (file: File) => {
    setError(null);
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      setError('Please upload a CSV file. Most banks let you download transactions as CSV from their website.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File is too large. Please export a shorter date range (e.g., last 3 months).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length === 0) {
        setError('No transactions found. Make sure you\'re uploading a bank CSV with Date, Description, and Amount columns.');
        return;
      }
      setTransactions(parsed);
      setStep('review');
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const toggleSkip = (idx: number) => {
    setTransactions(prev => prev.map((t, i) => i === idx ? { ...t, skip: !t.skip } : t));
  };

  const updateCategory = (idx: number, category: Category) => {
    setTransactions(prev => prev.map((t, i) => i === idx ? { ...t, category } : t));
  };

  const handleImport = async () => {
    if (!user) return;
    const toImport = transactions.filter(t => !t.skip);
    if (toImport.length === 0) return;

    setIsImporting(true);
    const batchId = `csv_${Date.now()}`;
    let count = 0;

    try {
      // Insert in chunks of 50
      const chunkSize = 50;
      for (let i = 0; i < toImport.length; i += chunkSize) {
        const chunk = toImport.slice(i, i + chunkSize).map(t => ({
          user_id: user.id,
          item_name: t.description,
          amount: t.amount,
          category: t.category,
          purchase_date: t.date,
          source: 'csv_import',
          import_batch_id: batchId,
          frequency: 'one-time' as const,
        }));

        const { error: insertError } = await supabase.from('purchases').insert(chunk);
        if (insertError) throw insertError;
        count += chunk.length;
      }

      setImportedCount(count);
      setStep('done');
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      toast({ title: 'Import complete', description: `${count} transactions added to your history.` });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Import failed';
      toast({ title: 'Import failed', description: msg, variant: 'destructive' });
    } finally {
      setIsImporting(false);
    }
  };

  const activeCount = transactions.filter(t => !t.skip).length;
  const displayedTx = showAll ? transactions : transactions.slice(0, 5);

  return (
    <div className="space-y-4">
      <AnimatePresence mode="wait">

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="mb-4 p-3 bg-muted/50 rounded-xl text-sm">
              <p className="font-medium mb-1">How to export your bank transactions:</p>
              <ol className="text-muted-foreground space-y-1 list-decimal list-inside text-xs">
                <li>Log in to your bank's website (Chase, BoA, Wells Fargo, etc.)</li>
                <li>Go to Account Activity or Transactions</li>
                <li>Look for "Download", "Export", or "CSV" option</li>
                <li>Select your date range and download</li>
                <li>Upload the downloaded CSV file below</li>
              </ol>
            </div>

            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
                isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/5'
              )}
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="font-medium text-sm">Drop your bank CSV here</p>
              <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
              <p className="text-xs text-muted-foreground mt-2">Supports Chase, Bank of America, Wells Fargo, Citi, and most major banks</p>
            </div>
            <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

            {error && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg text-sm mt-2">
                <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-destructive">{error}</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Step 2: Review */}
        {step === 'review' && (
          <motion.div key="review" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{transactions.length} transactions found</p>
                <p className="text-xs text-muted-foreground">{activeCount} selected for import</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setStep('upload')}>← Back</Button>
            </div>

            <p className="text-xs text-muted-foreground">Review and adjust categories. Uncheck any transactions you don't want to import.</p>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {displayedTx.map((tx, idx) => (
                <div key={idx} className={cn('flex items-center gap-2 p-2 rounded-lg border text-sm', tx.skip ? 'opacity-40 bg-muted/20' : 'bg-muted/30')}>
                  <input
                    type="checkbox"
                    checked={!tx.skip}
                    onChange={() => toggleSkip(idx)}
                    className="h-4 w-4 accent-primary shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium text-xs">{tx.description}</p>
                    <p className="text-xs text-muted-foreground">{tx.date}</p>
                  </div>
                  <span className="font-semibold text-xs shrink-0">${tx.amount.toFixed(2)}</span>
                  <Select value={tx.category} onValueChange={v => updateCategory(idx, v as Category)}>
                    <SelectTrigger className="h-7 w-28 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => (
                        <SelectItem key={c.value} value={c.value} className="text-xs">{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {transactions.length > 5 && (
              <button
                onClick={() => setShowAll(!showAll)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mx-auto"
              >
                {showAll ? <><ChevronUp className="h-3 w-3" /> Show less</> : <><ChevronDown className="h-3 w-3" /> Show all {transactions.length} transactions</>}
              </button>
            )}

            <Button
              onClick={handleImport}
              disabled={isImporting || activeCount === 0}
              className="w-full bg-gradient-primary"
            >
              {isImporting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importing...</>
              ) : (
                `Import ${activeCount} Transaction${activeCount !== 1 ? 's' : ''}`
              )}
            </Button>
          </motion.div>
        )}

        {/* Step 3: Done */}
        {step === 'done' && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-success/20 flex items-center justify-center">
              <Check className="h-7 w-7 text-success" />
            </div>
            <p className="font-semibold">{importedCount} transactions imported</p>
            <p className="text-sm text-muted-foreground mt-1">They're now in your spending history and insights.</p>
            <Button onClick={onClose} className="mt-4 w-full">Done</Button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
