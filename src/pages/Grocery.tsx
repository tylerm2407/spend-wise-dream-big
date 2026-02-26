import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, ArrowLeft, ShoppingCart, MoreVertical, Trash2, Copy, Edit3,
  MapPin, Check, Loader2, Trophy, X, ChevronRight,
} from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/calculations';

interface GroceryItem {
  name: string;
  quantity: number;
  unit: string;
}

interface GroceryList {
  id: string;
  name: string;
  items: GroceryItem[];
  created_at: string;
  updated_at: string;
}

interface Store {
  place_id: string;
  name: string;
  address: string;
  distance_miles: number;
  selected?: boolean;
}

interface StoreResult {
  store_id: string;
  store_name: string;
  distance_miles: number;
  items: Array<{ item_name: string; price: number | null; currency: string; source_product_title: string | null; url: string | null }>;
  total_price: number;
}

interface ComparisonData {
  store_results: StoreResult[];
  best_store_name: string | null;
  best_store_total_price: number | null;
}

type View = 'list' | 'editor' | 'stores' | 'comparison';

const UNITS = ['unit', 'lb', 'oz', 'gal', 'dozen', 'pack'];

export default function Grocery() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [view, setView] = useState<View>('list');
  const [lists, setLists] = useState<GroceryList[]>([]);
  const [loading, setLoading] = useState(true);

  // Editor state
  const [editingList, setEditingList] = useState<GroceryList | null>(null);
  const [listName, setListName] = useState('');
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemUnit, setNewItemUnit] = useState('unit');

  // Store selection state
  const [stores, setStores] = useState<Store[]>([]);
  const [storesLoading, setStoresLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Comparison state
  const [comparison, setComparison] = useState<ComparisonData | null>(null);
  const [comparingLoading, setComparingLoading] = useState(false);

  // Last comparisons cache
  const [lastComparisons, setLastComparisons] = useState<Record<string, { best_store_name: string; best_store_total_price: number }>>({});

  const fetchLists = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('grocery_lists')
      .select('*')
      .order('updated_at', { ascending: false });
    
    setLists((data || []).map((d: any) => ({
      ...d,
      items: (d.items as unknown as GroceryItem[]) || [],
    })));
    setLoading(false);

    // Fetch last comparisons
    const { data: comps } = await supabase
      .from('grocery_price_comparisons')
      .select('grocery_list_id, best_store_name, best_store_total_price, created_at')
      .order('created_at', { ascending: false });
    
    if (comps) {
      const map: Record<string, any> = {};
      for (const c of comps as any[]) {
        if (!map[c.grocery_list_id]) {
          map[c.grocery_list_id] = { best_store_name: c.best_store_name, best_store_total_price: c.best_store_total_price };
        }
      }
      setLastComparisons(map);
    }
  }, [user]);

  useEffect(() => { fetchLists(); }, [fetchLists]);

  // --- List operations ---
  const openEditor = (list?: GroceryList) => {
    if (list) {
      setEditingList(list);
      setListName(list.name);
      setItems([...list.items]);
    } else {
      setEditingList(null);
      setListName('');
      setItems([]);
    }
    setView('editor');
  };

  const addItem = () => {
    if (!newItemName.trim()) return;
    setItems([...items, { name: newItemName.trim(), quantity: newItemQty, unit: newItemUnit }]);
    setNewItemName('');
    setNewItemQty(1);
    setNewItemUnit('unit');
  };

  const removeItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const saveList = async () => {
    if (!listName.trim()) {
      toast({ title: 'List name is required', variant: 'destructive' });
      return;
    }
    if (!user) return;

    if (editingList) {
      await supabase
        .from('grocery_lists')
        .update({ name: listName, items: items as any, updated_at: new Date().toISOString() })
        .eq('id', editingList.id);
      toast({ title: 'List updated!' });
    } else {
      const { data } = await supabase
        .from('grocery_lists')
        .insert({ user_id: user.id, name: listName, items: items as any })
        .select()
        .single();
      if (data) {
        setEditingList({ ...data, items: data.items as unknown as GroceryItem[] });
      }
      toast({ title: 'List created!' });
    }
    await fetchLists();
  };

  const deleteList = async (id: string) => {
    await supabase.from('grocery_lists').delete().eq('id', id);
    toast({ title: 'List deleted' });
    fetchLists();
  };

  const duplicateList = async (list: GroceryList) => {
    if (!user) return;
    await supabase.from('grocery_lists').insert({
      user_id: user.id,
      name: `${list.name} (Copy)`,
      items: list.items as any,
    });
    toast({ title: 'List duplicated!' });
    fetchLists();
  };

  // --- Store finding ---
  const findStores = async () => {
    // Save list first
    await saveList();
    
    setStoresLoading(true);
    setView('stores');

    try {
      // Get location
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
      });
      const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setUserLocation(loc);

      const { data, error } = await supabase.functions.invoke('nearby-stores', {
        body: { lat: loc.lat, lng: loc.lng },
      });

      if (error) throw error;
      setStores((data.stores || []).map((s: Store) => ({ ...s, selected: false })));
    } catch (err: any) {
      console.error('Error finding stores:', err);
      toast({ title: 'Could not find nearby stores', description: err.message, variant: 'destructive' });
      setView('editor');
    } finally {
      setStoresLoading(false);
    }
  };

  const toggleStore = (idx: number) => {
    setStores(stores.map((s, i) => i === idx ? { ...s, selected: !s.selected } : s));
  };

  const estimatePrices = async () => {
    const selected = stores.filter(s => s.selected);
    if (selected.length === 0) {
      toast({ title: 'Select at least one store', variant: 'destructive' });
      return;
    }

    setComparingLoading(true);
    setView('comparison');

    try {
      const listId = editingList?.id;
      if (!listId) throw new Error('List not saved');

      const { data, error } = await supabase.functions.invoke('estimate-grocery-prices', {
        body: {
          grocery_list_id: listId,
          stores: selected.map(s => ({ place_id: s.place_id, name: s.name, distance_miles: s.distance_miles })),
          lat: userLocation?.lat,
          lng: userLocation?.lng,
        },
      });

      if (error) throw error;
      setComparison(data);
    } catch (err: any) {
      console.error('Error estimating prices:', err);
      toast({ title: 'Price estimation failed', description: err.message, variant: 'destructive' });
      setView('stores');
    } finally {
      setComparingLoading(false);
    }
  };

  const viewLastComparison = async (listId: string) => {
    setLoading(true);
    const { data } = await supabase
      .from('grocery_price_comparisons')
      .select('*')
      .eq('grocery_list_id', listId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (data) {
      setComparison({
        store_results: data.store_results as unknown as StoreResult[],
        best_store_name: data.best_store_name,
        best_store_total_price: Number(data.best_store_total_price),
      });
      setView('comparison');
    }
    setLoading(false);
  };

  // --- RENDER ---
  const renderListView = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">My Grocery Lists</h2>
        <Button size="sm" onClick={() => openEditor()} className="bg-gradient-primary">
          <Plus className="h-4 w-4 mr-1" /> New List
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
        </div>
      ) : lists.length === 0 ? (
        <Card className="p-8 text-center">
          <ShoppingCart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">
            Create your first grocery list to start comparing prices nearby.
          </p>
          <Button onClick={() => openEditor()} className="bg-gradient-primary">
            Create New List
          </Button>
        </Card>
      ) : (
        lists.map((list, i) => (
          <motion.div key={list.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="p-4 cursor-pointer" onClick={() => openEditor(list)}>
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{list.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {list.items.length} item{list.items.length !== 1 ? 's' : ''} · Updated {new Date(list.updated_at).toLocaleDateString()}
                  </p>
                  {lastComparisons[list.id] && (
                    <p className="text-xs text-primary mt-1">
                      Best: {lastComparisons[list.id].best_store_name} — {formatCurrency(lastComparisons[list.id].best_store_total_price)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {lastComparisons[list.id] && (
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); viewLastComparison(list.id); }}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditor(list); }}>
                        <Edit3 className="h-4 w-4 mr-2" /> Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); duplicateList(list); }}>
                        <Copy className="h-4 w-4 mr-2" /> Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); deleteList(list.id); }} className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </Card>
          </motion.div>
        ))
      )}
    </motion.div>
  );

  const renderEditor = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => { setView('list'); fetchLists(); }}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to lists
      </Button>

      <div>
        <Label>List Name</Label>
        <Input value={listName} onChange={(e) => setListName(e.target.value)} placeholder="e.g., Weekly Groceries" className="mt-1" />
      </div>

      <Card className="p-4 space-y-3">
        <Label>Add Items</Label>
        <div className="flex gap-2">
          <Input
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addItem()}
            placeholder="e.g., Milk"
            className="flex-1"
          />
          <Input
            type="number"
            value={newItemQty}
            onChange={(e) => setNewItemQty(Number(e.target.value) || 1)}
            className="w-16"
            min={1}
          />
          <Select value={newItemUnit} onValueChange={setNewItemUnit}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="icon" onClick={addItem}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {items.length > 0 && (
          <div className="space-y-2 mt-3">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between bg-muted/50 rounded-md px-3 py-2">
                <span className="text-sm">
                  {item.name} <span className="text-muted-foreground">× {item.quantity} {item.unit}</span>
                </span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeItem(idx)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={saveList}>
          Save List
        </Button>
        <Button className="flex-1 bg-gradient-primary" onClick={findStores} disabled={items.length === 0}>
          <MapPin className="h-4 w-4 mr-2" />
          Find Cheapest Store
        </Button>
      </div>
    </motion.div>
  );

  const renderStores = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => setView('editor')}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to editor
      </Button>
      <h2 className="text-lg font-semibold">Select Stores</h2>
      <p className="text-sm text-muted-foreground">Choose stores to compare prices</p>

      {storesLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
      ) : stores.length === 0 ? (
        <Card className="p-6 text-center">
          <MapPin className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No nearby stores found</p>
        </Card>
      ) : (
        <>
          <div className="space-y-2">
            {stores.map((store, idx) => (
              <Card
                key={store.place_id}
                className={`p-4 cursor-pointer transition-colors ${store.selected ? 'border-primary bg-primary/5' : ''}`}
                onClick={() => toggleStore(idx)}
              >
                <div className="flex items-center gap-3">
                  <div className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${store.selected ? 'bg-primary border-primary' : 'border-muted-foreground/30'}`}>
                    {store.selected && <Check className="h-3 w-3 text-primary-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{store.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{store.address}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {store.distance_miles} mi
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
          <Button
            className="w-full bg-gradient-primary"
            onClick={estimatePrices}
            disabled={!stores.some(s => s.selected)}
          >
            Estimate Prices
          </Button>
        </>
      )}
    </motion.div>
  );

  const renderComparison = () => {
    if (comparingLoading) {
      return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Comparing prices across stores…</p>
            <p className="text-xs text-muted-foreground mt-1">This may take a moment</p>
          </div>
        </motion.div>
      );
    }

    if (!comparison) return null;
    const { store_results, best_store_name, best_store_total_price } = comparison;
    const allItems = store_results[0]?.items.map(i => i.item_name) || [];
    const mostExpensiveTotal = Math.max(...store_results.map(s => s.total_price));
    const savings = best_store_total_price ? mostExpensiveTotal - best_store_total_price : 0;

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setView('list')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to lists
        </Button>

        {best_store_name && (
          <Card className="p-5 border-primary/30 bg-primary/5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Trophy className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">Cheapest: {best_store_name}</p>
                <p className="text-sm text-muted-foreground">
                  Estimated total: {formatCurrency(best_store_total_price || 0)}
                  {savings > 0 && ` · Save ${formatCurrency(savings)} vs most expensive`}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Comparison table */}
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full text-sm border-collapse min-w-[400px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-3 font-medium text-muted-foreground">Item</th>
                {store_results.map(s => (
                  <th key={s.store_id} className={`text-right py-2 px-2 font-medium ${s.store_name === best_store_name ? 'text-primary' : 'text-muted-foreground'}`}>
                    {s.store_name}
                    {s.store_name === best_store_name && (
                      <Badge className="ml-1 bg-primary/15 text-primary text-[10px] px-1">Best</Badge>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allItems.map((itemName) => (
                <tr key={itemName} className="border-b border-border/50">
                  <td className="py-2 pr-3">{itemName}</td>
                  {store_results.map(s => {
                    const item = s.items.find(i => i.item_name === itemName);
                    return (
                      <td key={s.store_id} className={`text-right py-2 px-2 ${s.store_name === best_store_name ? 'text-primary font-medium' : ''}`}>
                        {item?.price != null ? formatCurrency(item.price) : <span className="text-muted-foreground">N/A</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="font-semibold">
                <td className="py-3 pr-3">Total</td>
                {store_results.map(s => (
                  <td key={s.store_id} className={`text-right py-3 px-2 ${s.store_name === best_store_name ? 'text-primary' : ''}`}>
                    {formatCurrency(s.total_price)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </motion.div>
    );
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-hero">
        <header className="px-6 pt-6 pb-4">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-primary" />
            Grocery List
          </h1>
        </header>

        <main className="px-6 pb-8">
          <AnimatePresence mode="wait">
            {view === 'list' && renderListView()}
            {view === 'editor' && renderEditor()}
            {view === 'stores' && renderStores()}
            {view === 'comparison' && renderComparison()}
          </AnimatePresence>
        </main>
      </div>
    </AppLayout>
  );
}
