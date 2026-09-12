/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db } from './lib/storage';
import { AppLanguage, User } from './types';
import { Header } from './components/layout/Header';
import { BottomNav, MainTab } from './components/layout/BottomNav';
import { Sidebar } from './components/layout/Sidebar';
import { QuickActionModal } from './components/layout/QuickActionModal';
import { GlobalSearchModal } from './components/layout/GlobalSearchModal';
import { NotificationDrawer } from './components/layout/NotificationDrawer';
import { MoreMenuModal } from './components/layout/MoreMenuModal';
import { BarcodeScannerModal } from './components/common/BarcodeScannerModal';

// Views
import { DashboardView } from './components/dashboard/DashboardView';
import { OrdersView } from './components/orders/OrdersView';
import { QuickSaleView } from './components/pos/QuickSaleView';
import { ProductsView } from './components/products/ProductsView';
import { CustomersView } from './components/customers/CustomersView';
import { ProductionView } from './components/production/ProductionView';
import { LivestockView } from './components/livestock/LivestockView';
import { MoneyView } from './components/money/MoneyView';
import { DocumentsView } from './components/documents/DocumentsView';
import { ReportsView } from './components/reports/ReportsView';
import { SettingsView } from './components/settings/SettingsView';
import { AuditView } from './components/audit/AuditView';
import { SuppliersView } from './components/suppliers/SuppliersView';
import { CreateOrderModal } from './components/orders/CreateOrderModal';

export default function App() {
  const [currentTab, setCurrentTab] = useState<MainTab>('home');
  const [currentLang, setCurrentLang] = useState<AppLanguage>('fr');
  const [currentUser, setCurrentUser] = useState<User>(() => db.getCurrentUser());
  const [appState, setAppState] = useState(() => db.getState());

  // Modals state
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isCreateOrderModalOpen, setIsCreateOrderModalOpen] = useState(false);

  // Deep link selections
  const [selectedOrderId, setSelectedOrderId] = useState<string | undefined>(undefined);
  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(undefined);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>(undefined);

  // Reactive subscription to database changes
  useEffect(() => {
    const unsubscribe = db.subscribe(() => {
      setAppState({ ...db.getState() });
      setCurrentUser(db.getCurrentUser());
    });
    return () => unsubscribe();
  }, []);

  // Keyboard shortcut: Ctrl+K or / opens search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleUserChange = (user: User) => {
    db.switchUser(user.id);
    setCurrentUser(user);
  };

  const handleNavigate = (tab: MainTab, id?: string) => {
    setCurrentTab(tab);
    if (tab === 'orders') setSelectedOrderId(id);
    if (tab === 'products') setSelectedVariantId(id);
    if (tab === 'customers') setSelectedCustomerId(id);
  };

  const handleQuickAction = (key: 'new_order' | 'quick_sale' | 'new_batch' | 'new_expense' | 'record_payment' | 'scan_code') => {
    if (key === 'new_order') {
      setIsCreateOrderModalOpen(true);
    } else if (key === 'quick_sale') {
      setCurrentTab('pos');
    } else if (key === 'new_batch') {
      setCurrentTab('production');
    } else if (key === 'new_expense') {
      setCurrentTab('money');
    } else if (key === 'record_payment') {
      setCurrentTab('customers');
    } else if (key === 'scan_code') {
      setIsScannerOpen(true);
    }
  };

  const handleBarcodeScanResult = (code: string) => {
    const matched = db.getVariantByBarcodeOrSku(code);
    if (matched) {
      setCurrentTab('products');
      setSelectedVariantId(matched.id);
      alert(`Produit identifié : ${matched.name} (Stock: ${matched.currentStock} ${matched.unit})`);
    } else {
      alert(`Code scanné : "${code}" — Aucun article correspondant trouvé.`);
    }
  };

  const pendingOrdersCount = appState.orders.filter(o => ['confirmed', 'preparing', 'ready'].includes(o.status)).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      
      {/* Top Application Header */}
      <Header
        currentLang={currentLang}
        onLanguageChange={setCurrentLang}
        currentUser={currentUser}
        onUserChange={handleUserChange}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenBarcodeScanner={() => setIsScannerOpen(true)}
      />

      {/* Main Layout Body */}
      <div className="flex-1 flex flex-row">
        
        {/* Desktop Sticky Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => handleNavigate(tab)}
          onOpenQuickActions={() => setIsQuickActionsOpen(true)}
          currentLang={currentLang}
          pendingOrdersCount={pendingOrdersCount}
        />

        {/* Content View Container */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-12 overflow-x-hidden">
          {currentTab === 'home' && (
            <DashboardView
              onNavigate={handleNavigate}
              onOpenQuickAction={handleQuickAction}
              currentLang={currentLang}
            />
          )}

          {currentTab === 'orders' && (
            <OrdersView
              selectedOrderId={selectedOrderId}
              onClearSelectedOrder={() => setSelectedOrderId(undefined)}
            />
          )}

          {currentTab === 'pos' && (
            <QuickSaleView />
          )}

          {currentTab === 'products' && (
            <ProductsView
              selectedVariantId={selectedVariantId}
              onClearSelectedVariant={() => setSelectedVariantId(undefined)}
            />
          )}

          {currentTab === 'customers' && (
            <CustomersView
              selectedCustomerId={selectedCustomerId}
              onClearSelectedCustomer={() => setSelectedCustomerId(undefined)}
            />
          )}

          {currentTab === 'production' && (
            <ProductionView />
          )}

          {currentTab === 'livestock' && (
            <LivestockView />
          )}

          {currentTab === 'money' && (
            <MoneyView />
          )}

          {currentTab === 'documents' && (
            <DocumentsView />
          )}

          {currentTab === 'reports' && (
            <ReportsView />
          )}

          {currentTab === 'suppliers' && (
            <SuppliersView />
          )}

          {currentTab === 'audit' && (
            <AuditView />
          )}

          {currentTab === 'settings' && (
            <SettingsView
              currentLang={currentLang}
              onLanguageChange={setCurrentLang}
            />
          )}
        </main>

      </div>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={(tab) => handleNavigate(tab)}
        onOpenQuickActions={() => setIsQuickActionsOpen(true)}
        onOpenMoreMenu={() => setIsMoreMenuOpen(true)}
        currentLang={currentLang}
        pendingOrdersCount={pendingOrdersCount}
      />

      {/* Quick Action Sheet Modal */}
      <QuickActionModal
        isOpen={isQuickActionsOpen}
        onClose={() => setIsQuickActionsOpen(false)}
        onAction={handleQuickAction}
        currentLang={currentLang}
      />

      {/* Global Instant Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={handleNavigate}
      />

      {/* Operational Notifications & Rules Drawer */}
      <NotificationDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        onNavigate={handleNavigate}
      />

      {/* Mobile More Modules Drawer */}
      <MoreMenuModal
        isOpen={isMoreMenuOpen}
        onClose={() => setIsMoreMenuOpen(false)}
        onSelectTab={(tab) => handleNavigate(tab)}
        currentTab={currentTab}
      />

      {/* Barcode Camera Scanner */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScanResult}
      />

      {/* Create Order Modal from Global Quick Action */}
      {isCreateOrderModalOpen && (
        <CreateOrderModal
          isOpen={isCreateOrderModalOpen}
          onClose={() => setIsCreateOrderModalOpen(false)}
          onOrderCreated={(orderId) => {
            setCurrentTab('orders');
            setSelectedOrderId(orderId);
          }}
        />
      )}

    </div>
  );
}
