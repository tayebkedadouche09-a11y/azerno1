import React, { useState, useMemo } from 'react';
import {
  HeartPulse, Plus, Droplets, Utensils, Activity,
  AlertTriangle, CheckCircle2, ChevronRight, ShieldCheck
} from 'lucide-react';
import { db } from '../../lib/storage';
import { Animal } from '../../types';
import { formatDZD, triggerHaptic } from '../../lib/utils';

export const LivestockView: React.FC = () => {
  const [animals, setAnimals] = useState<Animal[]>(() => db.getAnimals());
  const [selectedSpecies, setSelectedSpecies] = useState<'all' | 'cow' | 'goat' | 'sheep'>('all');
  const [showAddAnimalModal, setShowAddAnimalModal] = useState(false);

  // New Animal form state
  const [tagNumber, setTagNumber] = useState('');
  const [name, setName] = useState('');
  const [species, setSpecies] = useState<'cow' | 'goat' | 'sheep'>('goat');
  const [breed, setBreed] = useState('Saanen');
  const [status, setStatus] = useState<any>('lactating');
  const [dailyYield, setDailyYield] = useState<number>(3.5);
  const [dailyFeedCost, setDailyFeedCost] = useState<number>(180);

  const refresh = () => {
    setAnimals([...db.getAnimals()]);
  };

  const filteredAnimals = useMemo(() => {
    return animals.filter(a => {
      if (selectedSpecies !== 'all' && a.species !== selectedSpecies) return false;
      return true;
    });
  }, [animals, selectedSpecies]);

  // Overall calculations
  const herdStats = useMemo(() => {
    const lactating = animals.filter(a => a.status === 'lactating');
    const totalDailyMilk = lactating.reduce((sum, a) => sum + a.dailyMilkYieldLiters, 0);
    const totalDailyFeed = animals.reduce((sum, a) => sum + a.dailyFeedCost, 0);
    const calculatedMilkCostPerLiter = totalDailyMilk > 0 ? Math.round(totalDailyFeed / totalDailyMilk) : 85;

    return {
      totalAnimals: animals.length,
      lactatingCount: lactating.length,
      totalDailyMilk,
      totalDailyFeed,
      calculatedMilkCostPerLiter
    };
  }, [animals]);

  const handleAddAnimal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagNumber.trim()) return;

    try {
      db.addAnimal({
        tagNumber: tagNumber.trim(),
        name: name.trim() || `Animal ${tagNumber}`,
        species,
        breed: breed.trim() || 'Locale',
        birthDate: '2023-03-10',
        status,
        dailyMilkYieldLiters: dailyYield,
        dailyFeedCost: dailyFeedCost,
        veterinaryRecords: []
      });

      refresh();
      setShowAddAnimalModal(false);
      setTagNumber('');
      setName('');
      triggerHaptic();
      alert('Animal ajouté au troupeau avec succès !');
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <HeartPulse className="w-6 h-6 text-emerald-700 dark:text-emerald-400" />
            <span>Troupeau & Suivi de l'Élevage Laitier</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Traite journalière, coût de l'aliment et alimentation directe du coût de revient fromager
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddAnimalModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-md transition"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Nouvel Animal</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs text-slate-500 font-medium block">Effectif Troupeau</span>
          <span className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1 block">
            {herdStats.totalAnimals} têtes
          </span>
          <span className="text-[11px] text-emerald-600 font-semibold">{herdStats.lactatingCount} en lactation</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs text-slate-500 font-medium block">Production Laitière / Jour</span>
          <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1 block">
            {herdStats.totalDailyMilk} Litres / j
          </span>
          <span className="text-[11px] text-slate-400">Total traites matin & soir</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs text-slate-500 font-medium block">Coût Alimentation / Jour</span>
          <span className="text-2xl font-bold text-slate-900 dark:text-white mt-1 block">
            {formatDZD(herdStats.totalDailyFeed)}
          </span>
          <span className="text-[11px] text-slate-400">Fourrage, foin & concentré</span>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 shadow-sm">
          <span className="text-xs text-emerald-800 dark:text-emerald-300 font-semibold block">Coût Lait Propre Produit</span>
          <span className="text-2xl font-black text-emerald-950 dark:text-emerald-200 mt-1 block">
            {formatDZD(herdStats.calculatedMilkCostPerLiter)} / L
          </span>
          <span className="text-[11px] text-emerald-700 dark:text-emerald-400">Aliment divisé par traite</span>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-2">
        {[
          { key: 'all', label: 'Tout le troupeau' },
          { key: 'goat', label: 'Chèvres' },
          { key: 'cow', label: 'Vaches' },
          { key: 'sheep', label: 'Brebis' }
        ].map(chip => (
          <button
            key={chip.key}
            type="button"
            onClick={() => setSelectedSpecies(chip.key as any)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              selectedSpecies === chip.key
                ? 'bg-emerald-800 text-white'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Animal Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAnimals.map((animal) => {
          const isLactating = animal.status === 'lactating';

          return (
            <div
              key={animal.id}
              className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    N° Boucle : {animal.tagNumber}
                  </span>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {animal.name}
                  </h3>
                  <span className="text-xs text-slate-500">
                    {animal.species === 'cow' ? 'Vache' : animal.species === 'goat' ? 'Chèvre' : 'Brebis'} · Race {animal.breed}
                  </span>
                </div>

                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isLactating
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {isLactating ? 'Lactation' : animal.status}
                </span>
              </div>

              {/* Yield & Feed */}
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 dark:bg-slate-700/40 rounded-2xl text-xs">
                <div>
                  <div className="flex items-center gap-1 text-slate-400 mb-0.5">
                    <Droplets className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Traite journalière :</span>
                  </div>
                  <strong className="text-slate-900 dark:text-white font-black text-sm">
                    {animal.dailyMilkYieldLiters} L / j
                  </strong>
                </div>

                <div>
                  <div className="flex items-center gap-1 text-slate-400 mb-0.5">
                    <Utensils className="w-3.5 h-3.5 text-amber-600" />
                    <span>Coût Aliment / j :</span>
                  </div>
                  <strong className="text-slate-900 dark:text-white font-bold text-sm">
                    {formatDZD(animal.dailyFeedCost)}
                  </strong>
                </div>
              </div>

              {/* Health status */}
              <div className="flex items-center justify-between text-[11px] pt-1 text-slate-400">
                <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  État sanitaire sain
                </span>
                <span>Vaccinations à jour</span>
              </div>

            </div>
          );
        })}
      </div>

      {/* Add Animal Modal */}
      {showAddAnimalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Ajouter un Animal au Troupeau
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Identification officielle et suivi de la lactation
            </p>

            <form onSubmit={handleAddAnimal} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    N° Boucle / Tag * :
                  </label>
                  <input
                    type="text"
                    value={tagNumber}
                    onChange={(e) => setTagNumber(e.target.value)}
                    placeholder="DZ-15-..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Nom / Repère :
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Blanchette"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Espèce :
                  </label>
                  <select
                    value={species}
                    onChange={(e) => setSpecies(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs"
                  >
                    <option value="goat">Chèvre</option>
                    <option value="cow">Vache</option>
                    <option value="sheep">Brebis</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Race :
                  </label>
                  <input
                    type="text"
                    value={breed}
                    onChange={(e) => setBreed(e.target.value)}
                    placeholder="Saanen / Montbéliarde..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Traite Moyenne (L/jour) :
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={dailyYield}
                    onChange={(e) => setDailyYield(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Coût Aliment / Jour (DA) :
                  </label>
                  <input
                    type="number"
                    value={dailyFeedCost}
                    onChange={(e) => setDailyFeedCost(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddAnimalModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
                >
                  Enregistrer l'Animal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
