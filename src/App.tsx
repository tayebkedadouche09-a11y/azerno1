import React, { useState, useEffect } from 'react';
import { db } from './lib/storage';
import { api, getAccessToken } from './lib/api';
import { pullRemoteChanges, startCoreDataSync } from './lib/coreDataSync';
import { bootstrapFinanceBridge } from './lib/financeBridge';
import { AppLanguage, User } from './types';
import { Header } from './components/layout/Header';
import { BottomNav, MainTab } from './components/layout/BottomNav';
import { Sidebar } from './components/layout/Sidebar';
import { QuickActionModal } from './components/layout/QuickActionModal';
import { GlobalSearchModal } from './components/layout/GlobalSearchModal';
import { NotificationDrawer } from './components/layout/NotificationDrawer';
import { MoreMenuModal } from './components/layout/MoreMenuModal';
import { BarcodeScannerModal } from './components/common/BarcodeScannerModal';
import { SyncStatusPill } from './components/common/SyncStatusPill';
import { DashboardView } from './components/dashboard/DashboardView';
import { OrdersView } from './components/orders/OrdersView';
import { QuickSaleView } from './components/pos/QuickSaleView';
import { ProductsView } from './components/products/ProductsView';
import { CustomersView } from './components/customers/CustomersView';
import { ProductionView } from './components/production/ProductionView';
import { LivestockView } from './components/livestock/LivestockView';
import { MoneyView } from './components/money/MoneyView';
import { PurchasesView } from './components/money/PurchasesView';
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
  const [dataRefreshVersion, setDataRefreshVersion] = useState(0);
  const [serverSessionReady, setServerSessionReady] = useState(false);
  const [financeReady, setFinanceReady] = useState(false);
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isCreateOrderModalOpen, setIsCreateOrderModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | undefined>(undefined);
  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(undefined);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>(undefined);

  useEffect(() => { let active=true; const bootstrapSession=async()=>{ if(!getAccessToken()){if(active)setServerSessionReady(true);return;} try{const result=await api.me();if(!active)return;setCurrentUser({id:result.user.id,name:result.user.name,role:result.user.role,pin:'',active:true});}catch{await api.logout().catch(()=>undefined);}finally{if(active)setServerSessionReady(true);}};void bootstrapSession();return()=>{active=false;}; }, []);
  useEffect(() => { let active=true; void bootstrapFinanceBridge().finally(()=>{if(active)setFinanceReady(true);}); return()=>{active=false;}; }, []);
  useEffect(() => startCoreDataSync(() => setAppState({ ...db.getState() })), []);
  useEffect(() => { let active = true; const refreshRemote = async () => { if (!navigator.onLine) return; const changed = await pullRemoteChanges(); if (active && changed > 0) setDataRefreshVersion(version => version + 1); }; const interval = window.setInterval(() => void refreshRemote(), 30000); return () => { active = false; window.clearInterval(interval); }; }, []);
  useEffect(() => { const unsubscribe=db.subscribe(()=>{setAppState({...db.getState()});setCurrentUser(db.getCurrentUser());});return()=>unsubscribe(); }, []);
  useEffect(() => { const handleKeyDown=(e:KeyboardEvent)=>{if((e.ctrlKey||e.metaKey)&&e.key==='k'){e.preventDefault();setIsSearchOpen(p=>!p);}};window.addEventListener('keydown',handleKeyDown);return()=>window.removeEventListener('keydown',handleKeyDown); }, []);

  const handleUserChange=(user:User)=>{db.switchUser(user.id);setCurrentUser(user);};
  const handleNavigate=(tab:MainTab,id?:string)=>{setCurrentTab(tab);if(tab==='orders')setSelectedOrderId(id);if(tab==='products')setSelectedVariantId(id);if(tab==='customers')setSelectedCustomerId(id);};
  const handleQuickAction=(key:'new_order'|'quick_sale'|'new_batch'|'new_expense'|'record_payment'|'scan_code')=>{if(key==='new_order')setIsCreateOrderModalOpen(true);else if(key==='quick_sale')setCurrentTab('pos');else if(key==='new_batch')setCurrentTab('production');else if(key==='new_expense')setCurrentTab('money');else if(key==='record_payment')setCurrentTab('customers');else setIsScannerOpen(true);};
  const handleBarcodeScanResult=(code:string)=>{const matched=db.getVariantByBarcodeOrSku(code);if(matched){setCurrentTab('products');setSelectedVariantId(matched.id);alert(`Produit identifié : ${matched.name} (Stock: ${matched.currentStock} ${matched.unit})`);}else alert(`Code scanné : "${code}" — Aucun article correspondant trouvé.`);};
  const pendingOrdersCount=appState.orders.filter(o=>['confirmed','preparing','ready'].includes(o.status)).length;
  if(!serverSessionReady || !financeReady)return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-sm text-slate-500">Connexion sécurisée AZRNOU...</div>;
  return <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
    <Header currentLang={currentLang} onLanguageChange={setCurrentLang} currentUser={currentUser} onUserChange={handleUserChange} onOpenSearch={()=>setIsSearchOpen(true)} onOpenNotifications={()=>setIsNotificationsOpen(true)} onOpenBarcodeScanner={()=>setIsScannerOpen(true)} />
    <div className="flex-1 flex flex-row"><Sidebar currentTab={currentTab} onSelectTab={tab=>handleNavigate(tab)} onOpenQuickActions={()=>setIsQuickActionsOpen(true)} currentLang={currentLang} pendingOrdersCount={pendingOrdersCount}/><main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-12 overflow-x-hidden">
      {currentTab==='home'&&<DashboardView key={`home-${dataRefreshVersion}`} onNavigate={handleNavigate} onOpenQuickAction={handleQuickAction} currentLang={currentLang}/>} {currentTab==='orders'&&<OrdersView key={`orders-${dataRefreshVersion}`} selectedOrderId={selectedOrderId} onClearSelectedOrder={()=>setSelectedOrderId(undefined)}/>} {currentTab==='pos'&&<QuickSaleView key={`pos-${dataRefreshVersion}`}/>} {currentTab==='products'&&<ProductsView key={`products-${dataRefreshVersion}`} selectedVariantId={selectedVariantId} onClearSelectedVariant={()=>setSelectedVariantId(undefined)}/>} {currentTab==='customers'&&<CustomersView key={`customers-${dataRefreshVersion}`} selectedCustomerId={selectedCustomerId} onClearSelectedCustomer={()=>setSelectedCustomerId(undefined)}/>} {currentTab==='production'&&<ProductionView key={`production-${dataRefreshVersion}`}/>} {currentTab==='livestock'&&<LivestockView key={`livestock-${dataRefreshVersion}`}/>} {currentTab==='money'&&<React.Fragment key={`money-${dataRefreshVersion}`}><MoneyView/><div className="mt-6"><PurchasesView/></div></React.Fragment>} {currentTab==='documents'&&<DocumentsView key={`documents-${dataRefreshVersion}`}/>} {currentTab==='reports'&&<ReportsView key={`reports-${dataRefreshVersion}`}/>} {currentTab==='suppliers'&&<SuppliersView key={`suppliers-${dataRefreshVersion}`}/>} {currentTab==='audit'&&<AuditView key={`audit-${dataRefreshVersion}`}/>} {currentTab==='settings'&&<SettingsView key={`settings-${dataRefreshVersion}`} currentLang={currentLang} onLanguageChange={setCurrentLang}/>} 
    </main></div>
    <BottomNav currentTab={currentTab} onSelectTab={tab=>handleNavigate(tab)} onOpenQuickActions={()=>setIsQuickActionsOpen(true)} onOpenMoreMenu={()=>setIsMoreMenuOpen(true)} currentLang={currentLang} pendingOrdersCount={pendingOrdersCount}/>
    <QuickActionModal isOpen={isQuickActionsOpen} onClose={()=>setIsQuickActionsOpen(false)} onAction={handleQuickAction} currentLang={currentLang}/><GlobalSearchModal isOpen={isSearchOpen} onClose={()=>setIsSearchOpen(false)} onNavigate={handleNavigate}/><NotificationDrawer isOpen={isNotificationsOpen} onClose={()=>setIsNotificationsOpen(false)} onNavigate={handleNavigate}/><MoreMenuModal isOpen={isMoreMenuOpen} onClose={()=>setIsMoreMenuOpen(false)} onSelectTab={tab=>handleNavigate(tab)} currentTab={currentTab}/><BarcodeScannerModal isOpen={isScannerOpen} onClose={()=>setIsScannerOpen(false)} onScan={handleBarcodeScanResult}/>{isCreateOrderModalOpen&&<CreateOrderModal isOpen={isCreateOrderModalOpen} onClose={()=>setIsCreateOrderModalOpen(false)} onOrderCreated={orderId=>{setCurrentTab('orders');setSelectedOrderId(orderId);}}/>}<SyncStatusPill/>
  </div>;
}
