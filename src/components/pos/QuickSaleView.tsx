import React, { useEffect, useMemo, useState } from 'react';
import { Store, Plus, Minus, Check, DollarSign, CreditCard, Receipt, Search, Loader2 } from 'lucide-react';
import { ProductVariant, PaymentMethod, CompanySettings } from '../../types';
import { formatDZD, triggerHaptic } from '../../lib/utils';
import { downloadDocumentPDF, DocumentData } from '../../lib/pdfGenerator';
import { dataRepository } from '../../lib/dataRepository';
import { api } from '../../lib/api';
import { getCachedCompanySettings, loadCompanySettings } from '../../lib/companySettings';

type CartItem = { variant: ProductVariant; quantity: number };
type ReceiptState = { saleNumber:string; date:string; customerName:string; total:number; profit:number; paymentMethod:PaymentMethod; items:Array<{productName:string;quantity:number;unit:string;unitPrice:number;subtotal:number}> };

export const QuickSaleView: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<Array<{id:string;name:string}>>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [customerName, setCustomerName] = useState('Client Comptoir');
  const [lastSaleReceipt, setLastSaleReceipt] = useState<ReceiptState | null>(null);
  const [settings, setSettings] = useState<CompanySettings>(() => getCachedCompanySettings());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const [products, categoryResult] = await Promise.all([dataRepository.products(), dataRepository.productCategories()]);
      setVariants(products.items.filter(v => v.active !== false));
      setCategories((categoryResult ?? []).map((c:any) => ({ id:String(c.id), name:String(c.name) })));
    } finally { setLoading(false); }
  };
  useEffect(() => { void refresh(); void loadCompanySettings().then(setSettings).catch(() => undefined); }, []);

  const filteredVariants = useMemo(() => variants.filter(v => {
    if (selectedCategory !== 'all' && v.categoryId !== selectedCategory) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return String(v.name ?? '').toLowerCase().includes(q) || String(v.sku ?? '').toLowerCase().includes(q) || Boolean(v.barcode?.includes(q));
  }), [variants, selectedCategory, searchQuery]);

  const cartSummary = useMemo(() => {
    let total=0,totalCost=0;
    cart.forEach(item=>{ total += item.quantity*Number(item.variant.retailPrice??0); totalCost += item.quantity*Number(item.variant.cost??0); });
    return { total, totalCost, profit:total-totalCost, itemCount:cart.reduce((s,i)=>s+i.quantity,0) };
  }, [cart]);

  const addToCart = (variant:ProductVariant) => { triggerHaptic(); setCart(prev=>{const current=prev.find(i=>i.variant.id===variant.id); return current ? prev.map(i=>i.variant.id===variant.id?{...i,quantity:i.quantity+1}:i) : [...prev,{variant,quantity:1}];}); };
  const updateQuantity = (variantId:string,delta:number) => { triggerHaptic(); setCart(prev=>prev.map(i=>i.variant.id===variantId?{...i,quantity:i.quantity+delta}:i).filter(i=>i.quantity>0)); };

  const handleCheckout = async (e:React.FormEvent) => {
    e.preventDefault(); if(!cart.length || saving)return;
    if(!navigator.onLine){alert('La caisse rapide nécessite une connexion pour garantir la cohérence paiement + stock.');return;}
    setSaving(true);
    try {
      const orderResult = await api.createOrder({ customerId:null, deliveryDate:null, notes:customerName.trim() || 'Client Comptoir', idempotencyKey:`pos:${crypto.randomUUID()}`, items:cart.map(i=>({variantId:i.variant.id,quantity:i.quantity,unitPrice:Number(i.variant.retailPrice??0),discount:0}))});
      const order = orderResult as any;
      const payment = await api.createPayment({ orderId:order.id, amount:Number(order.total??cartSummary.total), method:paymentMethod, note:'Vente comptoir', idempotencyKey:`pos-payment:${order.id}` });
      const receipt:ReceiptState = { saleNumber:String(order.number??order.id), date:new Date().toISOString(), customerName:customerName.trim()||'Client Comptoir', total:Number(order.total??cartSummary.total), profit:cartSummary.profit, paymentMethod, items:cart.map(i=>({productName:String(i.variant.name),quantity:i.quantity,unit:String(i.variant.unit??'u'),unitPrice:Number(i.variant.retailPrice??0),subtotal:i.quantity*Number(i.variant.retailPrice??0)})) };
      setLastSaleReceipt(receipt); setCart([]); await refresh(); triggerHaptic(); alert(`Vente enregistrée avec succès ! Reçu N° ${receipt.saleNumber} (${formatDZD(receipt.total)})`);
      void payment;
    } catch(error:any){ alert(error?.message || 'Erreur lors de la vente'); }
    finally { setSaving(false); }
  };

  const handleDownloadReceipt = () => {
    if(!lastSaleReceipt)return;
    const docData:DocumentData={type:'receipt',documentNumber:lastSaleReceipt.saleNumber,date:lastSaleReceipt.date,customerName:lastSaleReceipt.customerName,items:lastSaleReceipt.items.map(i=>({designation:i.productName,quantity:i.quantity,unit:i.unit,unitPrice:i.unitPrice,total:i.subtotal})),subtotal:lastSaleReceipt.total,total:lastSaleReceipt.total,paidAmount:lastSaleReceipt.total,balanceRemaining:0,paymentMethod:lastSaleReceipt.paymentMethod==='cash'?'Espèces':'Virement / Carte',notes:`Vente directe au comptoir. Bénéfice brut calculé : ${formatDZD(lastSaleReceipt.profit)}`};
    downloadDocumentPDF(docData, settings);
  };

  return <div className="space-y-6 pb-12 animate-fade-in">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2"><div><h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2"><Store className="w-6 h-6 text-emerald-700"/><span>Vente Comptoir (Caisse Rapide)</span></h1><p className="text-xs sm:text-sm text-slate-500">Encaissement réel via API, réservation stock et paiement serveur</p></div>{lastSaleReceipt&&<button type="button" onClick={handleDownloadReceipt} className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-xl text-xs font-semibold"><Receipt className="w-4 h-4 text-emerald-600"/>Télécharger Reçu {lastSaleReceipt.saleNumber}</button>}</div>
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-7 xl:col-span-8 space-y-4"><div className="flex flex-col sm:flex-row gap-3"><div className="relative flex-1"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/><input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Rechercher produit..." className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border rounded-2xl text-xs sm:text-sm"/></div><div className="flex gap-1.5 overflow-x-auto">{[['all','Tous'],...categories.map(c=>[c.id,c.name])].map(([id,label])=><button key={id} type="button" onClick={()=>setSelectedCategory(id)} className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap ${selectedCategory===id?'bg-emerald-800 text-white':'bg-white dark:bg-slate-800 border'}`}>{label}</button>)}</div></div>{loading?<div className="p-12 text-center text-sm text-slate-400"><Loader2 className="w-5 h-5 animate-spin inline mr-2"/>Chargement du catalogue...</div>:<div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{filteredVariants.map(v=>{const inCart=cart.find(i=>i.variant.id===v.id);const isOut=Number(v.currentStock??0)<=0;return <button key={v.id} type="button" disabled={isOut} onClick={()=>addToCart(v)} className={`p-4 rounded-2xl bg-white dark:bg-slate-800 border text-left ${inCart?'border-emerald-600 ring-2 ring-emerald-500/20':'border-slate-200 dark:border-slate-700'} ${isOut?'opacity-40':''}`}><div className="text-[10px] font-bold text-slate-400">{v.sku}</div><h3 className="text-sm font-bold mt-2">{v.name}</h3><div className="mt-3 flex items-center justify-between"><span className="font-extrabold text-emerald-800">{formatDZD(Number(v.retailPrice??0))}</span><span className="text-[10px] text-slate-500">Stock {v.currentStock}</span></div></button>})}</div>}</div>
      <div className="lg:col-span-5 xl:col-span-4 bg-white dark:bg-slate-800 rounded-3xl p-5 border shadow-sm"><div className="flex items-center justify-between pb-4 border-b"><h2 className="font-extrabold">Panier ({cartSummary.itemCount})</h2>{cart.length>0&&<button type="button" onClick={()=>setCart([])} className="text-xs text-rose-600">Vider</button>}</div><div className="py-4 space-y-3 min-h-40 max-h-80 overflow-auto">{cart.length===0?<div className="text-center py-12 text-slate-400 text-xs">Ajoutez des produits au panier.</div>:cart.map(item=><div key={item.variant.id} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-700/50 flex items-center gap-2"><div className="flex-1 min-w-0"><span className="text-xs font-bold block truncate">{item.variant.name}</span><span className="text-[11px] text-slate-500">{formatDZD(Number(item.variant.retailPrice??0))} / {item.variant.unit}</span></div><button type="button" onClick={()=>updateQuantity(item.variant.id,-1)} className="w-7 h-7 rounded-lg border flex items-center justify-center"><Minus className="w-3.5 h-3.5"/></button><span className="w-5 text-center text-xs font-bold">{item.quantity}</span><button type="button" onClick={()=>updateQuantity(item.variant.id,1)} className="w-7 h-7 rounded-lg border flex items-center justify-center"><Plus className="w-3.5 h-3.5"/></button></div>)}</div><form onSubmit={handleCheckout} className="pt-4 border-t space-y-4"><input value={customerName} onChange={e=>setCustomerName(e.target.value)} placeholder="Client Comptoir" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border rounded-xl text-xs"/><div className="grid grid-cols-2 gap-2"><button type="button" onClick={()=>setPaymentMethod('cash')} className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 ${paymentMethod==='cash'?'bg-emerald-800 text-white':'bg-slate-100'}`}><DollarSign className="w-3.5 h-3.5"/>Espèces</button><button type="button" onClick={()=>setPaymentMethod('bank_transfer')} className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 ${paymentMethod==='bank_transfer'?'bg-emerald-800 text-white':'bg-slate-100'}`}><CreditCard className="w-3.5 h-3.5"/>Banque</button></div><div className="p-4 rounded-2xl bg-emerald-50 border flex items-center justify-between"><div><span className="text-xs text-emerald-800 block">Bénéfice calculé</span><span className="font-bold">+ {formatDZD(cartSummary.profit)}</span></div><span className="text-xl font-black">{formatDZD(cartSummary.total)}</span></div><button type="submit" disabled={!cart.length||saving} className="w-full py-3.5 bg-emerald-800 disabled:opacity-40 text-white font-extrabold text-sm rounded-2xl flex items-center justify-center gap-2">{saving?<><Loader2 className="w-5 h-5 animate-spin"/>Enregistrement...</>:<><Check className="w-5 h-5"/>Valider la Vente</>}</button></form></div>
    </div>
  </div>;
};
