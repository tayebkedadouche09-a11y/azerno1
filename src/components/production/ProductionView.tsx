import React, { useState, useMemo } from 'react';
import {
  Factory, Plus, Calendar, CheckCircle2, Clock,
  AlertTriangle, DollarSign, ArrowRight, ShieldCheck, Sparkles
} from 'lucide-react';
import { db } from '../../lib/storage';
import { ProductionBatch } from '../../types';
import { formatDZD, formatDate, triggerHaptic } from '../../lib/utils';
import { StatusBadge } from '../common/Badge';

export const ProductionView: React.FC = () => {
  const [batches, setBatches] = useState<ProductionBatch[]>(() => db.getBatches());
  const [showNewBatchModal, setShowNewBatchModal] = useState(false);

  // New batch state
  const variants = db.getActiveVariants();
  const [milkType, setMilkType] = useState<'cow' | 'goat' | 'sheep' | 'mixed'>('goat');
  const [milkLiters, setMilkLiters] = useState<number>(120);
  const [targetVariantId, setTargetVariantId] = useState<string>(variants[0]?.id || '');
  const [quantityProduced, setQuantityProduced] = useState<number>(80);
  const [ingredientCost, setIngredientCost] = useState<number>(2500); // ferments + présure + sel
  const [packagingCost, setPackagingCost] = useState<number>(1800);
  const [curingDays, setCuringDays] = useState<number>(14);
  const [notes, setNotes] = useState<string>('');

  const refresh = () => {
    setBatches([...db.getBatches()]);
  };

  const selectedVariant = useMemo(() => {
    return variants.find(v => v.id === targetVariantId) || variants[0];
  }, [variants, targetVariantId]);

  // Live Unit Cost calculation
  const calculatedCost = useMemo(() => {
    const milkPricePerLiter = milkType === 'goat' ? 110 : 85;
    const milkTotal = milkLiters * milkPricePerLiter;
    const totalCost = milkTotal + ingredientCost + packagingCost;
    const unitCost = quantityProduced > 0 ? Math.round(totalCost / quantityProduced) : 0;
    return { milkTotal, totalCost, unitCost };
  }, [milkType, milkLiters, ingredientCost, packagingCost, quantityProduced]);

  const handleCreateBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVariant) return;

    try {
      const expiryDate = new Date(Date.now() + (curingDays + 45) * 86400000).toISOString().split('T')[0];
      const milkPrice = milkType === 'goat' ? 110 : 85;

      db.createProductionBatch({
        productVariantId: selectedVariant.id,
        milkType,
        milkInputLiters: milkLiters,
        milkCostPerLiter: milkPrice,
        additionalCosts: [
          { label: 'Ferments & Présure', amount: ingredientCost },
          { label: 'Emballages & Étiquettes', amount: packagingCost }
        ],
        outputQuantity: quantityProduced,
        expiryDate,
        notes: notes.trim() || undefined
      });

      refresh();
      setShowNewBatchModal(false);
      triggerHaptic();
      alert(`Lot de fabrication créé avec succès ! Coût unitaire calculé : ${formatDZD(calculatedCost.unitCost)} / pièce`);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleCompleteBatch = (batchId: string) => {
    try {
      db.completeBatch(batchId);
      refresh();
      triggerHaptic();
      alert('Lot marqué prêt à la vente ! Le stock du produit a été automatiquement augmenté.');
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Stats
  const curingCount = batches.filter(b => b.status === 'curing').length;
  const readyCount = batches.filter(b => b.status === 'completed').length;
  const totalLitersUsed = batches.reduce((sum, b) => sum + b.milkInputLiters, 0);

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Factory className="w-6 h-6 text-emerald-700 dark:text-emerald-400" />
            <span>Fabrication & Lots de Fromagerie</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Lait mis en œuvre → affinage → calcul du coût de revient → intégration stock
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowNewBatchModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-md transition"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Nouveau Lot de Fabrication</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs text-slate-500 font-medium block">En cours d'Affinage</span>
          <span className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1 block">
            {curingCount} lots
          </span>
          <span className="text-[11px] text-slate-400">En cave contrôlée</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs text-slate-500 font-medium block">Lots Prêts pour Vente</span>
          <span className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 mt-1 block">
            {readyCount} lots
          </span>
          <span className="text-[11px] text-slate-400">Disponibles au catalogue</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs text-slate-500 font-medium block">Lait Total Transformé</span>
          <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">
            {totalLitersUsed} Litres
          </span>
          <span className="text-[11px] text-slate-400">Vache & Chèvre</span>
        </div>
      </div>

      {/* Batches List */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
          Historique des Lots de Fabrication ({batches.length})
        </h2>

        <div className="grid grid-cols-1 gap-3">
          {batches.map((batch) => {
            const isCuring = batch.status === 'curing';

            return (
              <div
                key={batch.id}
                className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                      <Factory className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                          {batch.batchNumber}
                        </h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isCuring
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}>
                          {isCuring ? 'En affinage' : 'Prêt à la vente'}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {batch.productName} · {batch.outputQuantity} {batch.outputUnit}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Coût Unitaire Calculé</span>
                    <span className="text-base font-black text-emerald-800 dark:text-emerald-400">
                      {formatDZD(batch.costPerUnit)} / {batch.outputUnit}
                    </span>
                  </div>
                </div>

                {/* Batch Metrics Details */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-slate-50 dark:bg-slate-700/40 rounded-2xl text-xs">
                  <div>
                    <span className="text-slate-400 block">Lait Utilisé :</span>
                    <strong className="text-slate-800 dark:text-slate-200">{batch.milkInputLiters} L ({batch.milkType})</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Coût Total Lot :</span>
                    <strong className="text-slate-800 dark:text-slate-200">{formatDZD(batch.totalCost)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Date Fab. :</span>
                    <strong className="text-slate-800 dark:text-slate-200">{formatDate(batch.date)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Date Limite (DLC) :</span>
                    <strong className="text-slate-800 dark:text-slate-200">{formatDate(batch.expiryDate || '')}</strong>
                  </div>
                </div>

                {/* Complete / Release to Stock Action */}
                {isCuring && (
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700">
                    <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                      Affinage en cours
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCompleteBatch(batch.id)}
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Libérer le lot & Ajouter au Stock (+{batch.outputQuantity})</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* New Batch Modal */}
      {showNewBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 my-8 max-h-[92vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Nouveau Lot de Fabrication Fromagère
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Liez le lait de traite à la fabrication et calculez automatiquement le coût unitaire
            </p>

            <form onSubmit={handleCreateBatch} className="space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Type de Lait Utilisé :
                  </label>
                  <select
                    value={milkType}
                    onChange={(e) => setMilkType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-semibold"
                  >
                    <option value="goat">Lait de Chèvre (110 DA/L)</option>
                    <option value="cow">Lait de Vache (85 DA/L)</option>
                    <option value="sheep">Lait de Brebis (130 DA/L)</option>
                    <option value="mixed">Lait Mixte (100 DA/L)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Litres de Lait Mis en Œuvre :
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={milkLiters}
                    onChange={(e) => setMilkLiters(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Fromage Produit :
                  </label>
                  <select
                    value={targetVariantId}
                    onChange={(e) => setTargetVariantId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-semibold"
                  >
                    {variants.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.unit})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Quantité Fabriquée ({selectedVariant?.unit}) :
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quantityProduced}
                    onChange={(e) => setQuantityProduced(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Ferments & Présure (DA) :
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={ingredientCost}
                    onChange={(e) => setIngredientCost(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Emballages & Étiquettes (DA) :
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={packagingCost}
                    onChange={(e) => setPackagingCost(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Durée d'Affinage en Cave (Jours) :
                </label>
                <input
                  type="number"
                  min="0"
                  value={curingDays}
                  onChange={(e) => setCuringDays(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-bold"
                />
              </div>

              {/* Live Cost Breakdown Banner */}
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-1">
                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300">
                  <span>Coût Lait ({milkLiters}L) :</span>
                  <span>{formatDZD(calculatedCost.milkTotal)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300">
                  <span>Coût Total du Lot :</span>
                  <span className="font-bold">{formatDZD(calculatedCost.totalCost)}</span>
                </div>
                <div className="flex justify-between text-sm font-extrabold text-emerald-900 dark:text-emerald-200 pt-1 border-t border-emerald-200 dark:border-emerald-700">
                  <span>Coût de Revient Unitaire :</span>
                  <span>{formatDZD(calculatedCost.unitCost)} / {selectedVariant?.unit}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewBatchModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
                >
                  Créer le Lot de Fabrication
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
