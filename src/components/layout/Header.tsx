import React, { useEffect, useState } from 'react';
import { Search, Bell, ChevronDown, Check, Sun, Moon, Globe, WifiOff } from 'lucide-react';
import { AppLanguage, AppTheme, User } from '../../types';
import { ApiCompany } from '../../lib/api';
import { translations } from '../../lib/i18n';

interface HeaderProps {
  currentLang: AppLanguage;
  onLanguageChange: (lang: AppLanguage) => void;
  currentUser: User;
  companies: ApiCompany[];
  currentCompanyId?: string;
  onSelectCompany: (companyId: string) => void;
  onOpenSearch: () => void;
  onOpenNotifications: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentLang,
  onLanguageChange,
  currentUser,
  companies,
  currentCompanyId,
  onSelectCompany,
  onOpenSearch,
  onOpenNotifications,
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showMenu, setShowMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [theme, setTheme] = useState<AppTheme>(() => (localStorage.getItem('azrnou_theme') as AppTheme) || 'light');
  const t = translations[currentLang];

  useEffect(() => {
    const on = () => setIsOnline(true); const off = () => setIsOnline(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    root.classList.toggle('dark', dark);
    localStorage.setItem('azrnou_theme', theme);
  }, [theme]);

  const roleLabel = (role: string) => role === 'owner' ? t.roleOwner : role === 'manager' ? t.roleManager : t.roleWorker;

  return <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-900 flex items-center justify-center text-white shadow-md shrink-0"><span className="font-extrabold text-lg">A</span></div>
        <div className="min-w-0"><div className="flex items-center gap-2"><span className="text-lg font-bold text-slate-900 dark:text-white">AZRNOU</span><span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">Artisanal DZ</span></div><p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">Fromagerie & Élevage</p></div>
      </div>
      <div className="flex-1 max-w-md mx-2 sm:mx-4"><button type="button" onClick={onOpenSearch} className="w-full flex items-center justify-between px-3.5 py-2 text-sm bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-500 dark:text-slate-400"><span>{t.search}</span><kbd className="hidden md:inline-flex px-2 py-0.5 text-[10px] bg-white dark:bg-slate-900 rounded-lg">⌘K</kbd></button></div>
      <div className="flex items-center gap-1.5 sm:gap-2.5">
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">{isOnline ? <><span className="w-2 h-2 rounded-full bg-emerald-500"/><span>{t.synced}</span></> : <><WifiOff className="w-3.5 h-3.5 text-amber-500"/><span>{t.offlineMode}</span></>}</div>
        <div className="relative"><button type="button" onClick={() => setShowLangMenu(v => !v)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"><Globe className="w-4 h-4"/></button>{showLangMenu && <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-slate-800 rounded-xl shadow-xl border p-1.5 z-50">{(['fr','ar','en'] as AppLanguage[]).map(lang => <button key={lang} type="button" onClick={() => {onLanguageChange(lang);setShowLangMenu(false);}} className="w-full px-3 py-2 text-xs text-left rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex justify-between"><span>{lang === 'fr' ? 'Français' : lang === 'ar' ? 'العربية' : 'English'}</span>{currentLang === lang && <Check className="w-3.5 h-3.5 text-emerald-600"/>}</button>)}</div>}</div>
        <button type="button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800" title="Thème">{theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400"/> : <Moon className="w-4 h-4"/>}</button>
        <button type="button" onClick={onOpenNotifications} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"><Bell className="w-4 h-4"/></button>
        <div className="relative"><button type="button" onClick={() => setShowMenu(v => !v)} className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"><div className="w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center text-xs font-bold">{currentUser.name.charAt(0)}</div><div className="text-left hidden sm:block"><span className="text-xs font-semibold block">{currentUser.name.split(' ')[0]}</span><span className="text-[10px] text-emerald-700 dark:text-emerald-400">{roleLabel(currentUser.role)}</span></div><ChevronDown className="w-3.5 h-3.5 text-slate-400"/></button>
          {showMenu && <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-3 z-50">
            <div className="px-2 pb-3 border-b border-slate-100 dark:border-slate-700"><div className="font-bold text-sm">{currentUser.name}</div><div className="text-xs text-slate-500">{currentUser.email || ''} · {roleLabel(currentUser.role)}</div></div>
            <div className="px-2 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Entreprise active</div>
            {companies.map(company => <button key={company.id} type="button" onClick={() => {onSelectCompany(company.id);setShowMenu(false);}} className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between ${company.id === currentCompanyId ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}><span>{company.name}</span>{company.id === currentCompanyId && <Check className="w-4 h-4 text-emerald-600"/>}</button>)}
          </div>}
        </div>
      </div>
    </div>
  </header>;
};
