import React, { useState } from 'react';
import { Truck, Plus, Phone, Search, DollarSign, Check } from 'lucide-react';
import { db } from '../../lib/storage';
import { Supplier } from '../../types';
import { formatDZD } from '../../lib/utils';

export const SuppliersView: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => db.getSuppliers());
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState<any>('packaging');
  const [balance, setBalance] = useState(0);

  const refresh = () => {
    setSuppliers([...db.getSuppliers()]);
  };

  const handleAddSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    db.createSupplier({
      name: name.trim(),
      phone: phone.trim() || '0550...',
      category,
      outstandingBalance: balance,
      address: 'Algérie'
    });

    refresh();
    setShowAddModal(false);
    setName('');
    setPhone('');
  };

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.phone.includes(searchQuery)
  );

  return (
    <div className="space-y-6 pb-12 animate-fade-in max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Truck className="w-6 h-6 text-emerald-700 dark:text-emerald-400" />
            <span>Fournisseurs & Approvisionnements</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Lait extérieur, aliment bétail, ferments, emballages et suivi des dettes fournisseurs
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-md transition"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Nouveau Fournisseur</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(s => (
          <div
            key={s.id}
            className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {s.category}
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {s.name}
                </h3>
                <span className="text-xs text-slate-500 block mt-0.5">
                  {s.phone}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-700/50 flex items-center justify-between text-xs">
              <span className="text-slate-500">Solde dû au fournisseur :</span>
              <strong className="text-slate-900 dark:text-white">{formatDZD(s.outstandingBalance)}</strong>
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              Ajouter un Fournisseur
            </h3>
            <form onSubmit={handleAddSupplier} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nom Fournisseur * :
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Téléphone :
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0550..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Catégorie Fourniture :
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs"
                >
                  <option value="raw_milk">Lait Cru Collecté</option>
                  <option value="feed">Alimentation Bétail (Fourrage / Foin)</option>
                  <option value="packaging">Emballages & Étiquettes</option>
                  <option value="ingredients">Ferments & Présure</option>
                  <option value="veterinary">Produits Vétérinaires</option>
                  <option value="other">Autre Fournisseur</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
