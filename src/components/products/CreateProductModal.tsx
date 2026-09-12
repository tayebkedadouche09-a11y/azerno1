import React, { useState } from 'react';
import { X, PackagePlus } from 'lucide-react';
import { dataRepository } from '../../lib/dataRepository';
import { UnitType } from '../../types';
import { triggerHaptic } from '../../lib/utils';

type Category = { id: string; name: string };

interface CreateProductModalProps {
  categories: Category[];
  onCreated: () => Promise<void> | void;
  onClose: () => void;
}

export const CreateProductModal: React.FC<CreateProductModalProps> = ({ categories, onCreated, onClose }) => {
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [variantName, setVariantName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [unit, setUnit] = useState<UnitType>('piece');
  const [retailPrice, setRetailPrice] = useState(0);
  const [wholesalePrice, setWholesalePrice] = useState(0);
  const [productionCost, setProductionCost] = useState(0);
  const [minStock, setMinStock] = useState(0);
  const [saving, setSaving] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !variantName.trim()) return;
    setSaving(true);
    try {
      const result = await dataRepository.createProduct({
        name: name.trim(),
        categoryId: categoryId || null,
        variant: {
          name: variantName.trim(),
          sku: sku.trim() || null,
          barcode: barcode.trim() || null,
          unit,
          retailPrice,
          wholesalePrice,
          productionCost,
          minStock,
          minOrderQty: 1,
        },
      });
      await onCreated();
      triggerHaptic();
      alert(result.queued ? `Produit ${result.item.name} enregistré hors ligne et placé dans la file de synchronisation.` : `Produit ${result.item.name} créé avec succès.`);
      onClose();
    } catch (error: any) {
      alert(error?.message || 'Erreur lors de la création du produit.');
    } finally {
      setSaving(false);
    }
  };

  const field = 'w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2"><PackagePlus className="w-5 h-5 text-emerald-700" />Nouveau Produit</h3>
            <p className="text-xs text-slate-500 mt-1">Création réelle du produit et de sa première déclinaison.</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Nom du produit *</label><input className={field} value={name} onChange={e => setName(e.target.value)} placeholder="Ex. Fromage frais" required /></div>
            <div><label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Rayon / catégorie</label><select className={field} value={categoryId} onChange={e => setCategoryId(e.target.value)}><option value="">Sans catégorie</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="text-xs font-black uppercase tracking-wider text-slate-500">Première déclinaison</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Nom / format *</label><input className={field} value={variantName} onChange={e => setVariantName(e.target.value)} placeholder="Ex. 500 g" required /></div>
              <div><label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Unité *</label><select className={field} value={unit} onChange={e => setUnit(e.target.value as UnitType)}><option value="piece">Pièce</option><option value="kg">kg</option><option value="g">Gramme</option><option value="litre">Litre</option><option value="pot">Pot</option><option value="pack5">Pack 5</option><option value="pack10">Pack 10</option><option value="carton">Carton</option></select></div>
              <div><label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">SKU</label><input className={field} value={sku} onChange={e => setSku(e.target.value)} placeholder="SKU-001" /></div>
              <div><label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Code-barres</label><input className={field} value={barcode} onChange={e => setBarcode(e.target.value)} /></div>
              <div><label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Prix détail (DA)</label><input className={field} type="number" min="0" step="0.01" value={retailPrice} onChange={e => setRetailPrice(Number(e.target.value) || 0)} /></div>
              <div><label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Prix gros (DA)</label><input className={field} type="number" min="0" step="0.01" value={wholesalePrice} onChange={e => setWholesalePrice(Number(e.target.value) || 0)} /></div>
              <div><label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Coût de production (DA)</label><input className={field} type="number" min="0" step="0.01" value={productionCost} onChange={e => setProductionCost(Number(e.target.value) || 0)} /></div>
              <div><label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Seuil stock minimum</label><input className={field} type="number" min="0" step="0.001" value={minStock} onChange={e => setMinStock(Number(e.target.value) || 0)} /></div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={onClose} className="px-4 py-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">Annuler</button><button type="submit" disabled={saving} className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold rounded-xl">{saving ? 'Création...' : 'Créer le produit'}</button></div>
        </form>
      </div>
    </div>
  );
};
