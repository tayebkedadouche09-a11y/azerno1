import React, { useEffect, useMemo, useState } from 'react';
import { Users, Plus, Search, DollarSign, MessageSquare, AlertCircle, CheckCircle2, Download } from 'lucide-react';
import { Customer, Order } from '../../types';
import { formatDZD, formatDate, generateWhatsAppLink, triggerHaptic } from '../../lib/utils';
import { downloadDocumentPDF, DocumentData } from '../../lib/pdfGenerator';
import { dataRepository } from '../../lib/dataRepository';
import { api } from '../../lib/api';
import { db } from '../../lib/storage';

interface CustomersViewProps { selectedCustomerId?: string; onClearSelectedCustomer?: () => void; }

export const CustomersView: React.FC<CustomersViewProps> = ({ selectedCustomerId }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDebtOnly, setFilterDebtOnly] = useState(false);
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);
  const [dataSource, setDataSource] = useState<'api' | 'cache'>('cache');
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payAmount, setPayAmount] = useState(0);
  const [payNotes, setPayNotes] = useState('');
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [newCustType, setNewCustType] = useState<Customer['type']>('wholesale');
  const [newCustCreditLimit, setNewCustCreditLimit] = useState(50000);
  const settings = db.getSettings();

  const refresh = async () => {
    try {
      const [customerResult, orderResult] = await Promise.all([dataRepository.customers(), dataRepository.orders()]);
      setCustomers(customerResult.items); setOrders(orderResult.items);
      setDataSource(customerResult.source === 'api' && orderResult.source === 'api' ? 'api' : 'cache');
      if (activeCustomer) setActiveCustomer(customerResult.items.find(c => c.id === activeCustomer.id) ?? null);
      else if (selectedCustomerId) setActiveCustomer(customerResult.items.find(c => c.id === selectedCustomerId) ?? null);
    } catch (error) { console.error('AZRNOU customers load failed:', error); }
    finally { setLoading(false); }
  };

  useEffect(() => { void refresh(); const handleOnline = () => void refresh(); window.addEventListener('online', handleOnline); return () => window.removeEventListener('online', handleOnline); }, [selectedCustomerId]);

  const filteredCustomers = useMemo(() => customers.filter(c => {
    if (filterDebtOnly && c.outstandingBalance <= 0) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.address.toLowerCase().includes(q);
  }), [customers, filterDebtOnly, searchQuery]);
  const totalOutstanding = useMemo(() => customers.reduce((sum, c) => sum + Math.max(0, c.outstandingBalance), 0), [customers]);
  const customerOrders = useMemo(() => activeCustomer ? orders.filter(o => o.customerId === activeCustomer.id) : [], [orders, activeCustomer]);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault(); if (!activeCustomer || payAmount <= 0) return;
    if (!navigator.onLine) { alert('Les encaissements ne sont pas autorisés hors ligne pour éviter un double paiement.'); return; }
    try {
      const target = customerOrders.filter(o => o.total > o.paidAmount && o.status !== 'cancelled').sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
      if (!target) throw new Error('Aucune commande avec solde à encaisser pour ce client.');
      if (payAmount > target.total - target.paidAmount) throw new Error('Le montant dépasse le solde de la commande la plus ancienne.');
      await api.createPayment({ orderId: target.id, amount: payAmount, method: 'cash', note: payNotes.trim() || 'Règlement de dette client', idempotencyKey: `customer-payment:${target.id}:${Date.now()}` });
      await refresh(); setShowPaymentModal(false); setPayAmount(0); setPayNotes(''); triggerHaptic();
      alert(`Paiement de ${formatDZD(payAmount)} enregistré avec succès pour ${activeCustomer.name}.`);
    } catch (error: any) { alert(error.message || 'Erreur lors de l’encaissement.'); }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault(); if (!newCustName.trim()) return;
    try {
      const result = await dataRepository.createCustomer({ name: newCustName.trim(), phone: newCustPhone.trim() || null, address: newCustAddress.trim() || null, type: newCustType, creditLimit: newCustCreditLimit, paymentTermsDays: 15 });
      await refresh(); setActiveCustomer(result.item); setShowNewCustomerModal(false); setNewCustName(''); setNewCustPhone(''); setNewCustAddress(''); triggerHaptic();
      alert(result.queued ? `Client ${result.item.name} enregistré hors ligne et placé dans la file de synchronisation.` : `Client ${result.item.name} créé avec succès.`);
    } catch (error: any) { alert(error.message || 'Erreur lors de la création du client.'); }
  };

  const handleSendWhatsAppReminder = (c: Customer) => { const text = `Bonjour ${c.name},\nNous vous informons que votre solde restant dû auprès de la fromagerie AZRNOU s'élève à ${formatDZD(c.outstandingBalance)}.\nMerci de bien vouloir régulariser votre compte dès que possible.`; window.open(generateWhatsAppLink(c.phone, text), '_blank'); };
  const handleDownloadStatement = (c: Customer) => {
    const docData: DocumentData = { type: 'statement', documentNumber: 'REL-' + c.id.substring(0, 6).toUpperCase(), date: new Date().toISOString(), customerName: c.name, customerPhone: c.phone, customerAddress: c.address, items: [{ designation: 'Solde initial & cumul des livraisons antérieures', quantity: 1, unit: 'ct', unitPrice: c.outstandingBalance, total: c.outstandingBalance }], subtotal: c.outstandingBalance, total: c.outstandingBalance, balanceRemaining: c.outstandingBalance, notes: `Relevé de compte client officiel. Solde restant dû : ${formatDZD(c.outstandingBalance)}.` };
    downloadDocumentPDF(docData, settings);
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2"><Users className="w-6 h-6 text-emerald-700 dark:text-emerald-400" /><span>Clients & Gestion des Créances (Dettes)</span></h1><p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">Suivi des soldes dus, encaissements et rappels WhatsApp en un clic</p></div><div className="flex items-center gap-2"><span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${dataSource === 'api' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{dataSource === 'api' ? 'Serveur' : 'Cache local'}</span><button type="button" onClick={() => setShowNewCustomerModal(true)} className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-md transition"><Plus className="w-4 h-4 stroke-[3]" /><span>Nouveau Client</span></button></div></div>
      <div className="p-5 rounded-3xl bg-gradient-to-r from-rose-900 to-amber-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg"><div><span className="text-xs text-rose-200 font-semibold uppercase tracking-wider block">Total Créances Clients en Attente</span><span className="text-2xl sm:text-3xl font-black mt-1 block">{formatDZD(totalOutstanding)}</span><span className="text-xs text-rose-200/80 mt-0.5 block">Dettes cumulées sur les commandes livrées non soldées</span></div><button type="button" onClick={() => setFilterDebtOnly(!filterDebtOnly)} className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 ${filterDebtOnly ? 'bg-white text-rose-950 shadow-md' : 'bg-rose-800/80 hover:bg-rose-800 text-white'}`}><AlertCircle className="w-4 h-4" /><span>{filterDebtOnly ? 'Afficher tous les clients' : 'Filtrer clients avec dettes'}</span></button></div>
      {loading ? <div className="p-12 text-center text-sm text-slate-400">Chargement des clients...</div> : <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-3"><div className="relative"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Rechercher client par nom ou téléphone..." className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white" /></div><div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">{filteredCustomers.map(c => <div key={c.id} onClick={() => setActiveCustomer(c)} className={`p-4 rounded-2xl border transition-all cursor-pointer select-none ${activeCustomer?.id === c.id ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 shadow-sm' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}><div className="flex items-start justify-between gap-2"><div><h4 className="text-sm font-bold text-slate-900 dark:text-white">{c.name}</h4><span className="text-xs text-slate-400 block mt-0.5">{c.phone} · {c.type === 'wholesale' ? 'Grossiste' : c.type === 'retail' ? 'Détail' : c.type}</span></div>{c.outstandingBalance > 0 ? <span className="text-xs font-extrabold text-rose-600 bg-rose-50 dark:bg-rose-950/60 px-2.5 py-1 rounded-xl">Dû : {formatDZD(c.outstandingBalance)}</span> : <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-xl">À jour</span>}</div></div>)}</div></div>
        <div className="lg:col-span-7">{!activeCustomer ? <div className="bg-white dark:bg-slate-800 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-700"><Users className="w-12 h-12 text-slate-300 mx-auto mb-3" /><h3 className="text-base font-bold text-slate-700 dark:text-slate-300">Sélectionnez un client</h3><p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">Consultez le relevé de compte, encaissez des règlements ou envoyez un rappel de dette sur WhatsApp.</p></div> : <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-700"><div><div className="flex items-center gap-2"><h2 className="text-lg font-black text-slate-900 dark:text-white">{activeCustomer.name}</h2><span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">{activeCustomer.type === 'wholesale' ? 'Client Professionnel / Grossiste' : 'Client Particulier'}</span></div><p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Téléphone : {activeCustomer.phone} · Adresse : {activeCustomer.address || 'Non renseignée'}</p><p className="text-xs text-slate-400 mt-0.5">Plafond autorisé : {formatDZD(activeCustomer.creditLimit)} · Délai : {activeCustomer.paymentTermsDays} jours</p></div><div className="flex items-center gap-2">{activeCustomer.outstandingBalance > 0 && <button type="button" onClick={() => handleSendWhatsAppReminder(activeCustomer)} className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition"><MessageSquare className="w-4 h-4" /><span>Rappel WhatsApp</span></button>}<button type="button" onClick={() => handleDownloadStatement(activeCustomer)} className="p-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 rounded-xl"><Download className="w-4 h-4" /></button></div></div>
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div><span className="text-xs text-slate-500 font-semibold block">Solde Dû Actuel</span><span className={`text-2xl font-black mt-0.5 block ${activeCustomer.outstandingBalance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600'}`}>{formatDZD(activeCustomer.outstandingBalance)}</span></div>{activeCustomer.outstandingBalance > 0 ? <button type="button" onClick={() => { setPayAmount(activeCustomer.outstandingBalance); setShowPaymentModal(true); }} className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition active:scale-95 flex items-center justify-center gap-1.5"><DollarSign className="w-4 h-4" /><span>Encaisser Règlement</span></button> : <span className="text-xs text-emerald-600 font-bold flex items-center gap-1"><CheckCircle2 className="w-4 h-4" />Compte à jour, aucune dette</span>}</div>
          <div className="space-y-3"><h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Historique des Commandes ({customerOrders.length})</h4>{customerOrders.length === 0 ? <div className="text-center py-6 text-slate-400 text-xs">Aucune commande enregistrée pour ce client.</div> : <div className="space-y-2">{customerOrders.map(o => <div key={o.id} className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"><div><div className="flex items-center gap-2"><span className="font-bold text-slate-900 dark:text-white">{o.orderNumber}</span><span className="text-slate-400">· {formatDate(o.createdAt)}</span></div><span className="text-slate-500 block mt-0.5">{o.items.map(i => `${i.quantity} ${i.productName}`).join(', ')}</span></div><div className="text-right"><span className="font-bold text-slate-900 dark:text-white block">{formatDZD(o.total)}</span><span className={`text-[10px] font-semibold ${o.paymentStatus === 'paid' ? 'text-emerald-600' : 'text-rose-600'}`}>{o.paymentStatus === 'paid' ? 'Réglé' : 'Solde restant'}</span></div></div>)}</div>}</div>
        </div>}</div>
      </div>}

      {showPaymentModal && activeCustomer && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"><div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800"><h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">Encaisser un Paiement Client</h3><p className="text-xs text-slate-500 mb-4">Client : {activeCustomer.name} (Dette : {formatDZD(activeCustomer.outstandingBalance)})</p><form onSubmit={handleRecordPayment} className="space-y-4"><div><label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Montant encaissé (DA) :</label><input type="number" min="1" max={activeCustomer.outstandingBalance} value={payAmount} onChange={e => setPayAmount(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-base font-bold text-slate-900 dark:text-white" required autoFocus /></div><div><label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Notes / Référence du reçu :</label><input type="text" value={payNotes} onChange={e => setPayNotes(e.target.value)} placeholder="Ex: Espèces remises en main propre..." className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs" /></div><div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setShowPaymentModal(false)} className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-xl">Annuler</button><button type="submit" className="px-5 py-2 bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl">Valider l'Encaissement</button></div></form></div></div>}

      {showNewCustomerModal && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"><div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800"><h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">Ajouter un Nouveau Client</h3><p className="text-xs text-slate-500 mb-4">Création du compte et configuration des conditions de crédit</p><form onSubmit={handleCreateCustomer} className="space-y-4"><div><label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Nom ou Raison Sociale * :</label><input type="text" value={newCustName} onChange={e => setNewCustName(e.target.value)} placeholder="Ex: Épicerie Fine Djurdjura" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-semibold" required /></div><div className="grid grid-cols-2 gap-3"><div><label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Téléphone :</label><input type="text" value={newCustPhone} onChange={e => setNewCustPhone(e.target.value)} placeholder="0550..." className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs" /></div><div><label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Type de Client :</label><select value={newCustType} onChange={e => setNewCustType(e.target.value as Customer['type'])} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs"><option value="wholesale">Grossiste / Magasin</option><option value="retail">Client Particulier</option><option value="superette">Supérette</option><option value="restaurant">Restaurant</option><option value="distributor">Distributeur</option></select></div></div><div><label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Adresse / Ville :</label><input type="text" value={newCustAddress} onChange={e => setNewCustAddress(e.target.value)} placeholder="Ex: Tizi Ouzou, Rue Principale" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs" /></div><div><label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Plafond de Crédit Autorisé (DA) :</label><input type="number" value={newCustCreditLimit} onChange={e => setNewCustCreditLimit(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-bold" /></div><div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setShowNewCustomerModal(false)} className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-xl">Annuler</button><button type="submit" className="px-5 py-2 bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl">Créer le Client</button></div></form></div></div>}
    </div>
  );
};
