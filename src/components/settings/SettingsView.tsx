import React, { useState } from 'react';
import {
  Settings, Building, Printer, Globe, Database,
  Download, Upload, RotateCcw, Check, ShieldCheck
} from 'lucide-react';
import { db } from '../../lib/storage';
import { CompanySettings, AppLanguage } from '../../types';
import { triggerHaptic } from '../../lib/utils';

interface SettingsViewProps {
  currentLang: AppLanguage;
  onLanguageChange: (lang: AppLanguage) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentLang,
  onLanguageChange
}) => {
  const [settings, setSettings] = useState<CompanySettings>(() => db.getSettings());

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    db.updateSettings(settings);
    triggerHaptic();
    alert('Paramètres de la fromagerie enregistrés avec succès !');
  };

  const handleExportBackup = () => {
    const jsonStr = db.exportData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `azrnou_sauvegarde_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    triggerHaptic();
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const success = db.importData(text);
        if (success) {
          triggerHaptic();
          alert('Sauvegarde restaurée avec succès ! La page va se recharger.');
          window.location.reload();
        } else {
          alert('Format de fichier de sauvegarde invalide.');
        }
      } catch (err) {
        alert('Erreur lors de la lecture du fichier.');
      }
    };
    reader.readAsText(file);
  };

  const handleResetDemoData = () => {
    if (confirm('Attention : Voulez-vous réinitialiser toutes les données avec les données de démonstration AZRNOU ?')) {
      db.resetToMockData();
      triggerHaptic();
      alert('Données réinitialisées !');
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in max-w-3xl">
      
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-emerald-700 dark:text-emerald-400" />
          <span>Paramètres de la Fromagerie AZRNOU</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Identité légale, entête des factures, langue et sauvegarde des données
        </p>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        
        {/* Company Identity */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-700">
            <Building className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Identité de l'Entreprise (Entête des Documents)
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Raison Sociale / Nom :
              </label>
              <input
                type="text"
                value={settings.companyName}
                onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700/50 border rounded-xl text-xs font-bold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Slogan / Sous-titre :
              </label>
              <input
                type="text"
                value={settings.slogan || ''}
                onChange={(e) => setSettings({ ...settings, slogan: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700/50 border rounded-xl text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                N° RC (Registre de Commerce) :
              </label>
              <input
                type="text"
                value={settings.taxId || ''}
                onChange={(e) => setSettings({ ...settings, taxId: e.target.value })}
                placeholder="RC 15/00-1234567B"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700/50 border rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                NIF :
              </label>
              <input
                type="text"
                value={settings.nif || ''}
                onChange={(e) => setSettings({ ...settings, nif: e.target.value })}
                placeholder="002115012345678"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700/50 border rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                NIS :
              </label>
              <input
                type="text"
                value={settings.nis || ''}
                onChange={(e) => setSettings({ ...settings, nis: e.target.value })}
                placeholder="19901501234"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700/50 border rounded-xl text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Adresse & Wilaya :
              </label>
              <input
                type="text"
                value={settings.address || ''}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700/50 border rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Téléphone de Contact :
              </label>
              <input
                type="text"
                value={settings.phone || ''}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700/50 border rounded-xl text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Coordonnées Bancaires / RIP :
            </label>
            <input
              type="text"
              value={settings.bankDetails || ''}
              onChange={(e) => setSettings({ ...settings, bankDetails: e.target.value })}
              placeholder="BNA / BADR / CCP : 00000 0000000000 00"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700/50 border rounded-xl text-xs"
            />
          </div>
        </div>

        {/* Printer & Format */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-700">
            <Printer className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Impression & Documents
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Format Imprimante Thermique Ticket :
              </label>
              <select
                value={settings.printerPaperSize || '80mm'}
                onChange={(e) => setSettings({ ...settings, printerPaperSize: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700/50 border rounded-xl text-xs"
              >
                <option value="80mm">Ticket 80 mm (Standard POS)</option>
                <option value="58mm">Ticket 58 mm (Compact)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Monnaie de Gestion :
              </label>
              <input
                type="text"
                disabled
                value="Dinar Algérien (DZD / DA)"
                className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border rounded-xl text-xs font-bold text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5"
        >
          <Check className="w-4 h-4 stroke-[3]" />
          <span>Enregistrer les Paramètres</span>
        </button>

      </form>

      {/* Backup & Demo Data Management */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-700">
          <Database className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Sécurité, Sauvegarde & Données
          </h2>
        </div>

        <p className="text-xs text-slate-500">
          Toutes les données de la fromagerie sont sauvegardées localement sur cet appareil et fonctionnent 100% hors-ligne.
          Exportez régulièrement votre fichier JSON de sauvegarde pour sécuriser votre historique.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleExportBackup}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl flex items-center gap-2 transition"
          >
            <Download className="w-4 h-4" />
            <span>Télécharger Sauvegarde JSON</span>
          </button>

          <label className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl flex items-center gap-2 transition cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>Restaurer Sauvegarde JSON</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportBackup}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={handleResetDemoData}
            className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-2 transition ml-auto"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Réinitialiser Données Démo</span>
          </button>
        </div>
      </div>

    </div>
  );
};
