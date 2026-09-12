import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Truck, Plus, Phone, Search, RefreshCw, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';
import { formatDZD } from '../../lib/utils';

type SupplierRow = {
  id: string; name?: string; phone?: string; address?: string; notes?: string;
  total_purchases?: number | string; total_paid?: number | string; balance_owed?: number | string;
};

export const SuppliersView: React.FC = () => {
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true); setError('');
    try { const result = await api.suppliers(); setSuppliers(result.items as SupplierRow[]); }
    catch (e) { setError(e instanceof Error ? e.message : 'Impossible de charger les fournisseurs'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true); setError('');
    try {
      await api.createSupplier({ name: name.trim(), phone: phone.trim() || null, address: address.trim() || null, notes: notes.trim() || null });
      setShowAddModal(false); setName(''); setPhone(''); setAddress(''); setNotes('');
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Impossible d’enregistrer le fournisseur'); }
    finally { setSaving(false); }
  };

  const filtered = useMemo(() => suppliers.filter(s => {
    const q = searchQuery.toLowerCase().trim();
    return !q || `${s.name ?? ''} ${s.phone ?? ''} ${s.address ?? ''}`.toLowerCase().includes(q);
  }), [suppliers, searchQuery]);

  return (
    <div className="space-y-6 pb-12 animate-fade-in max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2"><Truck className="w-6 h-6 text-emerald-700 dark:text-emerald-400" /><span>Fournisseurs & Approvisionnements</span></h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">Lait, alimentation bétail, ferments, emballages et dettes fournisseurs</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => void refresh()} disabled={loading} className="inline-flex items-center gap-2 px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />Actualiser</button>
          <button type="button" onClick={() => setShowAddModal(true)} className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-md transition"><Plus className="w-4 h-4 stroke-[3]" />Nouveau Fournisseur</button>
        </div>
      </div>

      <div className="relative max-w-xl"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Rechercher un fournisseur..." className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm" /></div>
      {error && <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-sm">{error}</div>}

      {loading ? <div className="flex items-center justify-center py-16 text-slate-500"><Loader2 className="w-5 h-5 animate-spin mr-2" />Chargement...</div> : filtered.length === 0 ? <div className="p-10 text-center rounded-3xl bg-white dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-700 text-sm text-slate-500">Aucun fournisseur trouvé.</div> : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{filtered.map(s => {
        const owed = Number(s.balance_owed ?? 0);
        return <div key={s.id} className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="text-base font-bold text-slate-900 dark:text-white truncate">{s.name}</h3>{s.phone && <span className="text-xs text-slate-500 flex items-center gap-1 mt-1"><Phone className="w-3 h-3" />{s.phone}</span>}{s.address && <span className="text-xs text-slate-400 block mt-1 truncate">{s.address}</span>}</div></div>
          <div className="grid grid-cols-2 gap-2 text-xs"><div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-700/50"><span className="text-slate-500 block">Achats</span><strong>{formatDZD(Number(s.total_purchases ?? 0))}</strong></div><div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-700/50"><span className="text-slate-500 block">Payé</span><strong>{formatDZD(Number(s.total_paid ?? 0))}</strong></div></div>
          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/20 flex items-center justify-between text-xs"><span className="text-amber-700 dark:text-amber-300">Dette fournisseur</span><strong className="text-amber-900 dark:text-amber-200">{formatDZD(owed)}</strong></div>
        </div>;
      })}</div>}

      {showAddModal && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"><div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800"><h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Ajouter un Fournisseur</h3><form onSubmit={handleAddSupplier} className="space-y-4">
        <input autoFocus type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="Nom du fournisseur *" required className="w-full px-3 py-3 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm" />
        <input type="text" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Téléphone" className="w-full px-3 py-3 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm" />
        <input type="text" value={address} onChange={e=>setAddress(e.target.value)} placeholder="Adresse" className="w-full px-3 py-3 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm" />
        <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Notes" rows={3} className="w-full px-3 py-3 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm resize-none" />
        <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={()=>setShowAddModal(false)} className="px-4 py-2 text-xs font-semibold text-slate-500 rounded-xl">Annuler</button><button type="submit" disabled={saving} className="px-5 py-2 bg-emerald-800 text-white text-xs font-bold rounded-xl disabled:opacity-60">{saving?'Enregistrement...':'Enregistrer'}</button></div>
      </form></div></div>}
    </div>
  );
};