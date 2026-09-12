import React, { useEffect, useMemo, useState } from 'react';
import { CreditCard, Loader2, Plus, RefreshCw, ShoppingBag, X } from 'lucide-react';
import { api } from '../../lib/api';
import { formatDZD, formatDate, triggerHaptic } from '../../lib/utils';

type Row = Record<string, any>;
type PurchaseLine = { variantId: string; quantity: number; unitCost: number; description: string };

const money = (v: unknown) => formatDZD(Number(v ?? 0));
const idOf = (v: unknown) => String(v ?? '');

export const PurchasesView: React.FC = () => {
  const [purchases, setPurchases] = useState<Row[]>([]);
  const [suppliers, setSuppliers] = useState<Row[]>([]);
  const [products, setProducts] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [payPurchase, setPayPurchase] = useState<Row | null>(null);
  const [supplierId, setSupplierId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [lines, setLines] = useState<PurchaseLine[]>([{ variantId: '', quantity: 1, unitCost: 0, description: '' }]);

  const load = async () => {
    try {
      setError('');
      const [p, s, pr] = await Promise.all([api.purchases(), api.suppliers(), api.products()]);
      setPurchases(p.items ?? []);
      setSuppliers(s.items ?? []);
      setProducts(pr.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible de charger les achats.');
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const variants = useMemo(() => products.flatMap(product =>
    (Array.isArray(product.variants) ? product.variants : []).map((variant: Row) => ({
      ...variant,
      productName: product.name,
      label: `${product.name} — ${variant.name ?? variant.sku ?? 'Variante'}`,
    }))
  ), [products]);

  const total = useMemo(() => lines.reduce((sum, line) => sum + line.quantity * line.unitCost, 0), [lines]);

  const updateLine = (index: number, patch: Partial<PurchaseLine>) => setLines(current => current.map((line, i) => i === index ? { ...line, ...patch } : line));
  const addLine = () => setLines(current => [...current, { variantId: '', quantity: 1, unitCost: 0, description: '' }]);
  const removeLine = (index: number) => setLines(current => current.length === 1 ? current : current.filter((_, i) => i !== index));

  const createPurchase = async (event: React.FormEvent) => {
    event.preventDefault();
    const valid = lines.filter(line => line.variantId && line.quantity > 0 && line.unitCost >= 0);
    if (!valid.length) { setError('Ajoutez au moins un article valide.'); return; }
    setSaving(true); setError('');
    try {
      await api.createPurchase({
        idempotencyKey: crypto.randomUUID(),
        supplierId: supplierId || null,
        date,
        notes: notes.trim() || null,
        items: valid.map(line => ({ ...line, description: line.description || variants.find(v => idOf(v.id) === line.variantId)?.label || 'Article acheté' })),
      });
      setShowCreate(false); setSupplierId(''); setNotes(''); setDate(new Date().toISOString().slice(0, 10));
      setLines([{ variantId: '', quantity: 1, unitCost: 0, description: '' }]);
      triggerHaptic(); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Création de l’achat impossible.'); }
    finally { setSaving(false); }
  };

  const openPayment = (purchase: Row) => {
    const balance = Math.max(Number(purchase.total ?? 0) - Number(purchase.paid_total ?? 0), 0);
    setPaymentAmount(String(balance)); setPaymentMethod('cash'); setPayPurchase(purchase);
  };

  const createPayment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!payPurchase) return;
    const amount = Number(paymentAmount);
    const balance = Math.max(Number(payPurchase.total ?? 0) - Number(payPurchase.paid_total ?? 0), 0);
    if (!Number.isFinite(amount) || amount <= 0 || amount > balance) { setError('Montant de paiement invalide.'); return; }
    setPaying(true); setError('');
    try {
      await api.createSupplierPayment({
        idempotencyKey: crypto.randomUUID(),
        purchaseId: payPurchase.id,
        amount,
        method: paymentMethod,
        paymentDate: new Date().toISOString().slice(0, 10),
        note: `Paiement achat ${payPurchase.number ?? payPurchase.id}`,
      });
      setPayPurchase(null); triggerHaptic(); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Paiement fournisseur impossible.'); }
    finally { setPaying(false); }
  };

  return <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
    <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div><h2 className="font-bold flex items-center gap-2"><ShoppingBag className="w-5 h-5 text-emerald-700" /> Achats fournisseurs</h2><p className="text-xs text-slate-500 mt-1">Achats réels PostgreSQL • réception stock • solde fournisseur</p></div>
      <div className="flex gap-2"><button onClick={() => void load()} className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm font-semibold"><RefreshCw className="w-4 h-4 inline mr-1" />Actualiser</button><button onClick={() => setShowCreate(true)} className="px-3 py-2 rounded-xl bg-emerald-800 text-white text-sm font-bold"><Plus className="w-4 h-4 inline mr-1" />Nouvel achat</button></div>
    </div>
    {error && <div className="m-4 rounded-xl bg-red-50 border border-red-200 text-red-800 px-4 py-3 text-sm">{error}</div>}
    {loading ? <div className="p-10 flex justify-center text-slate-500"><Loader2 className="w-5 h-5 animate-spin mr-2" />Chargement…</div> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-xs text-slate-500 border-b border-slate-100 dark:border-slate-800"><th className="p-4">Achat</th><th className="p-4">Fournisseur</th><th className="p-4">Date</th><th className="p-4 text-right">Total</th><th className="p-4 text-right">Payé</th><th className="p-4 text-right">Reste</th><th className="p-4"></th></tr></thead><tbody>
      {purchases.length === 0 ? <tr><td colSpan={7} className="p-8 text-center text-slate-500">Aucun achat enregistré.</td></tr> : purchases.map((purchase, index) => { const totalValue = Number(purchase.total ?? 0); const paid = Number(purchase.paid_total ?? 0); const balance = Math.max(totalValue - paid, 0); return <tr key={idOf(purchase.id) || index} className="border-b border-slate-100 dark:border-slate-800 last:border-0"><td className="p-4 font-semibold">{purchase.number ?? `Achat ${index + 1}`}</td><td className="p-4">{purchase.supplier_name ?? 'Sans fournisseur'}</td><td className="p-4 text-slate-500">{formatDate(String(purchase.purchase_date ?? purchase.date ?? purchase.created_at ?? '').slice(0,10))}</td><td className="p-4 text-right font-semibold">{money(totalValue)}</td><td className="p-4 text-right text-emerald-700">{money(paid)}</td><td className="p-4 text-right font-bold text-amber-700">{money(balance)}</td><td className="p-4 text-right">{balance > 0 && <button onClick={() => openPayment(purchase)} className="px-3 py-2 rounded-lg bg-amber-600 text-white font-semibold text-xs"><CreditCard className="w-3.5 h-3.5 inline mr-1" />Payer</button>}</td></tr>; })}
    </tbody></table></div>}

    {showCreate && <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-3"><form onSubmit={createPurchase} className="w-full max-w-3xl max-h-[92vh] overflow-auto rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-2xl"><div className="flex justify-between items-center mb-5"><h3 className="text-lg font-black">Nouvel achat fournisseur</h3><button type="button" onClick={() => setShowCreate(false)}><X /></button></div><div className="grid sm:grid-cols-3 gap-3"><label className="text-sm font-semibold">Fournisseur<select value={supplierId} onChange={e => setSupplierId(e.target.value)} className="mt-1 w-full rounded-xl border p-3 bg-white dark:bg-slate-800"><option value="">Sans fournisseur</option>{suppliers.map(s => <option key={idOf(s.id)} value={idOf(s.id)}>{s.name}</option>)}</select></label><label className="text-sm font-semibold">Date<input type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1 w-full rounded-xl border p-3 bg-white dark:bg-slate-800" /></label><label className="text-sm font-semibold">Total<input value={money(total)} readOnly className="mt-1 w-full rounded-xl border p-3 bg-slate-50 dark:bg-slate-800" /></label></div><div className="mt-5 space-y-3">{lines.map((line, index) => <div key={index} className="grid grid-cols-1 sm:grid-cols-[1fr_100px_140px_auto] gap-2 items-end"><label className="text-xs font-semibold">Article<select required value={line.variantId} onChange={e => updateLine(index,{variantId:e.target.value})} className="mt-1 w-full rounded-xl border p-3 bg-white dark:bg-slate-800"><option value="">Choisir…</option>{variants.map(v => <option key={idOf(v.id)} value={idOf(v.id)}>{v.label}</option>)}</select></label><label className="text-xs font-semibold">Qté<input type="number" min="0.001" step="0.001" value={line.quantity} onChange={e => updateLine(index,{quantity:Number(e.target.value)})} className="mt-1 w-full rounded-xl border p-3 bg-white dark:bg-slate-800" /></label><label className="text-xs font-semibold">Coût unitaire<input type="number" min="0" step="0.01" value={line.unitCost} onChange={e => updateLine(index,{unitCost:Number(e.target.value)})} className="mt-1 w-full rounded-xl border p-3 bg-white dark:bg-slate-800" /></label><button type="button" onClick={() => removeLine(index)} className="p-3 rounded-xl bg-red-50 text-red-700">×</button></div>)}</div><button type="button" onClick={addLine} className="mt-3 text-sm font-bold text-emerald-700">+ Ajouter une ligne</button><textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes" className="mt-4 w-full rounded-xl border p-3 bg-white dark:bg-slate-800" /><button disabled={saving} className="mt-4 w-full rounded-xl bg-emerald-800 text-white py-3 font-bold">{saving ? 'Enregistrement…' : `Réceptionner l’achat • ${money(total)}`}</button></form></div>}

    {payPurchase && <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-3"><form onSubmit={createPayment} className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-2xl"><div className="flex justify-between items-center mb-4"><div><h3 className="font-black">Payer le fournisseur</h3><p className="text-xs text-slate-500">{payPurchase.number} • reste {money(Number(payPurchase.total ?? 0)-Number(payPurchase.paid_total ?? 0))}</p></div><button type="button" onClick={() => setPayPurchase(null)}><X /></button></div><label className="text-sm font-semibold">Montant<input autoFocus type="number" min="0.01" step="0.01" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} className="mt-1 w-full rounded-xl border p-3 bg-white dark:bg-slate-800" /></label><label className="block text-sm font-semibold mt-3">Mode<select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="mt-1 w-full rounded-xl border p-3 bg-white dark:bg-slate-800"><option value="cash">Espèces</option><option value="bank">Banque</option><option value="transfer">Virement</option><option value="check">Chèque</option></select></label><button disabled={paying} className="mt-4 w-full rounded-xl bg-amber-600 text-white py-3 font-bold">{paying ? 'Paiement…' : 'Enregistrer le paiement'}</button></form></div>}
  </section>;
};
