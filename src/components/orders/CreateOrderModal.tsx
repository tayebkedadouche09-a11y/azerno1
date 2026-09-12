import React, { useEffect, useMemo, useState } from 'react';
import { X, Plus, Trash2, ShoppingBag, AlertTriangle, Check } from 'lucide-react';
import { dataRepository } from '../../lib/dataRepository';
import { formatDZD } from '../../lib/utils';
import { Customer, ProductVariant } from '../../types';

interface CreateOrderModalProps { isOpen: boolean; onClose: () => void; onOrderCreated: (orderId: string) => void; }
interface OrderItemInput { variantId: string; quantity: number; unitPrice: number; discountPercent: number; }

export const CreateOrderModal: React.FC<CreateOrderModalProps> = ({ isOpen, onClose, onOrderCreated }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const defaultDelivery = useMemo(() => new Date(Date.now() + 86400000).toISOString().split('T')[0], []);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(defaultDelivery);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<OrderItemInput[]>([]);

  const resolvePrice = (variant: ProductVariant, customer: Customer | null) => customer?.customPrices?.[variant.id] ?? (customer?.type === 'retail' ? variant.retailPrice : variant.wholesalePrice);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      try {
        const [customerResult, productResult] = await Promise.all([dataRepository.customers(), dataRepository.products()]);
        if (cancelled) return;
        setCustomers(customerResult.items); setVariants(productResult.items);
        setSelectedCustomerId(prev => prev || customerResult.items[0]?.id || '');
        setItems(prev => prev.length ? prev : productResult.items[0] ? [{ variantId: productResult.items[0].id, quantity: 10, unitPrice: productResult.items[0].wholesalePrice, discountPercent: 0 }] : []);
      } catch (error: any) { alert(error.message || 'Impossible de charger les données de commande.'); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [isOpen]);

  const selectedCustomer = useMemo(() => customers.find(c => c.id === selectedCustomerId) || null, [customers, selectedCustomerId]);
  const handleCustomerChange = (custId: string) => { setSelectedCustomerId(custId); const cust = customers.find(c => c.id === custId) || null; setItems(prev => prev.map(item => { const v = variants.find(x => x.id === item.variantId); return v ? { ...item, unitPrice: resolvePrice(v, cust) } : item; })); };
  const handleItemVariantChange = (index: number, variantId: string) => { const v = variants.find(x => x.id === variantId); if (!v) return; setItems(prev => { const copy = [...prev]; copy[index] = { ...copy[index], variantId, unitPrice: resolvePrice(v, selectedCustomer) }; return copy; }); };
  const handleItemQuantityChange = (index: number, qty: number) => setItems(prev => { const copy = [...prev]; copy[index].quantity = Math.max(1, qty); return copy; });
  const handleItemPriceChange = (index: number, price: number) => setItems(prev => { const copy = [...prev]; copy[index].unitPrice = Math.max(0, price); return copy; });
  const handleAddItem = () => { const v = variants[0]; if (!v) return; setItems(prev => [...prev, { variantId: v.id, quantity: 5, unitPrice: resolvePrice(v, selectedCustomer), discountPercent: 0 }]); };
  const handleRemoveItem = (index: number) => { if (items.length <= 1) return; setItems(prev => prev.filter((_, i) => i !== index)); };

  const summary = useMemo(() => {
    let total = 0, totalCost = 0; const stockShortages: { name: string; needed: number; available: number }[] = [];
    items.forEach(item => { const v = variants.find(x => x.id === item.variantId); if (!v) return; const lineTotal = Math.round(item.quantity * item.unitPrice * (1 - item.discountPercent / 100)); total += lineTotal; totalCost += item.quantity * v.cost; const reserved = Number((v as any).reservedStock ?? 0); const available = v.currentStock - reserved; if (item.quantity > available) stockShortages.push({ name: v.name, needed: item.quantity, available }); });
    return { total, totalCost, expectedProfit: total - totalCost, stockShortages };
  }, [items, variants]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) return alert('Veuillez sélectionner un client.');
    if (!items.length) return alert('Veuillez ajouter au moins un produit.');
    try {
      const result = await dataRepository.createOrder({ customerId: selectedCustomerId, deliveryDate, notes: notes.trim() || undefined, items: items.map(i => ({ variantId: i.variantId, quantity: i.quantity, unitPrice: i.unitPrice, discount: Math.round(i.quantity * i.unitPrice * i.discountPercent / 100) })), status: 'confirmed' });
      onOrderCreated(result.item.id); onClose();
      alert(result.queued ? 'Commande enregistrée hors ligne et placée dans la file de synchronisation.' : 'Bon de commande créé avec succès.');
    } catch (error: any) { alert(error.message || 'Erreur lors de la création de la commande'); }
  };

  if (!isOpen) return null;
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto"><div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col my-8 max-h-[92vh]">
    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0"><div className="flex items-center gap-2.5"><div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400"><ShoppingBag className="w-5 h-5" /></div><div><h2 className="text-base font-bold text-slate-900 dark:text-white">Créer un Bon de Commande</h2><p className="text-xs text-slate-500 dark:text-slate-400">Réservation de stock et calcul automatique de marge</p></div></div><button type="button" onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-5 h-5" /></button></div>
    {loading ? <div className="p-12 text-center text-sm text-slate-400">Chargement des clients et produits...</div> : <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Client Destinataire *</label><select value={selectedCustomerId} onChange={e => handleCustomerChange(e.target.value)} className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500" required>{customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.type === 'retail' ? 'Détail' : 'Grossiste/Pro'})</option>)}</select>{selectedCustomer && selectedCustomer.outstandingBalance > 0 && <span className="text-xs font-semibold text-rose-600 mt-1 block">Solde dû actuel : {formatDZD(selectedCustomer.outstandingBalance)}</span>}</div><div><label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Date de Livraison Prévue *</label><input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500" required /></div></div>
      <div className="space-y-3"><div className="flex items-center justify-between"><label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Lignes de Commande ({items.length})</label><button type="button" onClick={handleAddItem} className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400"><Plus className="w-3.5 h-3.5" />Ajouter un produit</button></div><div className="space-y-3">{items.map((item,index) => { const currentV = variants.find(v => v.id === item.variantId); const reserved = Number((currentV as any)?.reservedStock ?? 0); const available = (currentV?.currentStock ?? 0) - reserved; const isShort = item.quantity > available; return <div key={index} className="p-3.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3"><div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end"><div className="sm:col-span-6"><span className="text-[11px] font-semibold text-slate-500 block mb-1">Produit & Déclinaison</span><select value={item.variantId} onChange={e => handleItemVariantChange(index,e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white">{variants.map(v => <option key={v.id} value={v.id}>{v.name} ({v.sku})</option>)}</select></div><div className="sm:col-span-2"><span className="text-[11px] font-semibold text-slate-500 block mb-1">Quantité</span><input type="number" min="1" value={item.quantity} onChange={e => handleItemQuantityChange(index,parseInt(e.target.value)||1)} className="w-full px-2.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-center text-slate-900 dark:text-white" /></div><div className="sm:col-span-3"><span className="text-[11px] font-semibold text-slate-500 block mb-1">Prix Unit. (DA)</span><input type="number" min="0" value={item.unitPrice} onChange={e => handleItemPriceChange(index,parseFloat(e.target.value)||0)} className="w-full px-2.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-right text-slate-900 dark:text-white" /></div><div className="sm:col-span-1 flex justify-end"><button type="button" onClick={() => handleRemoveItem(index)} disabled={items.length <= 1} className="p-2 text-slate-400 hover:text-rose-600 disabled:opacity-30"><Trash2 className="w-4 h-4" /></button></div></div><div className="flex items-center justify-between text-[11px] px-1"><span className={`${isShort ? 'text-amber-600 font-semibold flex items-center gap-1' : 'text-slate-400'}`}>{isShort && <AlertTriangle className="w-3 h-3 text-amber-500" />}Stock dispo : {available} {currentV?.unit} (Physique: {currentV?.currentStock ?? 0})</span><span className="font-bold text-slate-800 dark:text-slate-200">Total ligne: {formatDZD(item.quantity * item.unitPrice)}</span></div></div>; })}</div></div>
      {summary.stockShortages.length > 0 && <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2.5"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /><div><span className="font-bold block">Besoin de fabrication détecté :</span>{summary.stockShortages.map((s,i) => <span key={i} className="block mt-0.5">• {s.name} : {s.needed} demandés vs {s.available} dispo (Manque: {s.needed-s.available})</span>)}</div></div>}
      <div><label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Notes de Livraison / Préparation (Optionnel)</label><textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ex: Livrer avant 10h. Appeler à l'arrivée..." className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white" /></div>
      <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between"><div><span className="text-xs text-emerald-800 dark:text-emerald-300 font-semibold block">Marge brute estimée</span><span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">+ {formatDZD(summary.expectedProfit)}</span></div><div className="text-right"><span className="text-xs text-emerald-800 dark:text-emerald-300 font-semibold block">Total Commande</span><span className="text-xl font-black text-emerald-950 dark:text-emerald-200">{formatDZD(summary.total)}</span></div></div>
      <div className="flex items-center justify-end gap-3 pt-2"><button type="button" onClick={onClose} className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl">Annuler</button><button type="submit" className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition active:scale-95 flex items-center gap-1.5"><Check className="w-4 h-4 stroke-[3]" /><span>Confirmer le Bon de Commande</span></button></div>
    </form>}
  </div></div>;
};
