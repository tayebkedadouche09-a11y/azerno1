import React, { useState } from 'react';
import {
  Search, Bell, Shield, ChevronDown, Check,
  Sun, Moon, Globe, Wifi, WifiOff, RefreshCw
} from 'lucide-react';
import { db } from '../../lib/storage';
import { AppLanguage, AppTheme, User } from '../../types';
import { translations } from '../../lib/i18n';

interface HeaderProps {
  currentLang: AppLanguage;
  onLanguageChange: (lang: AppLanguage) => void;
  theme: AppTheme;
  onToggleTheme: () => void;
  onOpenSearch: () => void;
  onOpenNotifications: () => void;
  unreadCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentLang,
  onLanguageChange,
  theme,
  onToggleTheme,
  onOpenSearch,
  onOpenNotifications,
  unreadCount
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);

  const currentUser = db.getCurrentUser();
  const allUsers = db.getState().users;
  const t = translations[currentLang];

  // Listen to network status
  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSelectUser = (user: User) => {
    db.setCurrentUser(user.id);
    setShowUserMenu(false);
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner': return t.roleOwner;
      case 'manager': return t.roleManager;
      case 'worker': return t.roleWorker;
      default: return role;
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        
        {/* Logo & Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-900 flex items-center justify-center text-white shadow-md shadow-emerald-900/20 ring-2 ring-emerald-500/30">
            <span className="font-extrabold text-lg tracking-wider">A</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                AZRNOU
              </span>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                Artisanal DZ
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
              Fromagerie & Élevage
            </p>
          </div>
        </div>

        {/* Global Search Bar (Trigger) */}
        <div className="flex-1 max-w-md mx-2 sm:mx-4">
          <button
            type="button"
            onClick={onOpenSearch}
            className="w-full flex items-center justify-between px-3.5 py-2 text-sm bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-500 dark:text-slate-400 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition" />
              <span className="truncate text-xs sm:text-sm">{t.search}</span>
            </div>
            <kbd className="hidden md:inline-flex items-center px-2 py-0.5 text-[10px] font-medium text-slate-400 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right Tools & Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          
          {/* Online / Offline Sync status */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
            {isOnline ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{t.synced}</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-amber-600 dark:text-amber-400">{t.offlineMode}</span>
              </>
            )}
          </div>

          {/* Language Switcher */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition"
              title="Langue / اللغة"
            >
              <Globe className="w-4 h-4" />
            </button>
            {showLangMenu && (
              <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 z-50 animate-fade-in">
                <button
                  type="button"
                  onClick={() => { onLanguageChange('fr'); setShowLangMenu(false); }}
                  className="w-full text-left px-3.5 py-2 text-xs font-medium flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200"
                >
                  <span>Français</span>
                  {currentLang === 'fr' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                </button>
                <button
                  type="button"
                  onClick={() => { onLanguageChange('ar'); setShowLangMenu(false); }}
                  className="w-full text-left px-3.5 py-2 text-xs font-medium flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200"
                >
                  <span>العربية</span>
                  {currentLang === 'ar' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                </button>
                <button
                  type="button"
                  onClick={() => { onLanguageChange('en'); setShowLangMenu(false); }}
                  className="w-full text-left px-3.5 py-2 text-xs font-medium flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200"
                >
                  <span>English</span>
                  {currentLang === 'en' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                </button>
              </div>
            )}
          </div>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={onToggleTheme}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition"
            title="Thème Clair / Sombre"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Notifications Bell */}
          <button
            type="button"
            onClick={onOpenNotifications}
            className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
            )}
          </button>

          {/* User Role Switcher Pill */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition"
            >
              <div className="w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center text-xs font-bold">
                {currentUser.name.charAt(0)}
              </div>
              <div className="text-left hidden sm:block">
                <span className="text-xs font-semibold text-slate-900 dark:text-white block leading-tight">
                  {currentUser.name.split(' ')[0]}
                </span>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium block leading-none">
                  {getRoleLabel(currentUser.role)}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Switch User Dropdown */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-2 z-50 animate-fade-in">
                <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Changer d'utilisateur
                </div>
                {allUsers.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleSelectUser(user)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition ${
                      currentUser.id === user.id
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <div>
                      <span className="block font-medium">{user.name}</span>
                      <span className="text-[10px] opacity-75">{getRoleLabel(user.role)}</span>
                    </div>
                    {currentUser.id === user.id && <Check className="w-4 h-4 text-emerald-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </header>
  );
};
