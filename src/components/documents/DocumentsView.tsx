import React, { useState, useMemo } from 'react';
import {
  FileText, Search, Download, Printer, Share2,
  Calendar, CheckCircle2, ChevronRight, Eye
} from 'lucide-react';
import { db } from '../../lib/storage';
import { formatDZD, formatDate, generateWhatsAppLink } from '../../lib/utils';
import { downloadDocumentPDF, DocumentData } from '../../lib/pdfGenerator';
import { EmptyState } from '../common/EmptyState';

export const DocumentsView: React.FC = () => {
  const [docTypeFilter, setDocTypeFilter] = useState<'all' | 'order' | 'delivery' | 'invoice' | 'receipt'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const orders = db.getOrders();
  const invoices = db.getInvoices();
  const quickSales = db.getQuickSales();
  const payments = db.getPayments();
  const settings = db.getSettings();

  const allDocuments = useMemo(() => {
    const list: Array<{ id:string; number:string; type:'order'|'delivery'|'invoice'|'receipt'; typeName:string; date:string; customerName:string; total:number; raw:any }> = [];
    orders.forEach(o => {
      list.push({ id:o.id, number:o.orderNumber, type:'order', typeName:'Bon de Commande (BC)', date:o.createdAt, customerName:o.customerName, total:o.total, raw:o });
      if (o.status === 'delivered' || o.status === 'partial') {
        list.push({ id:'bl_'+o.id, number:'BL-'+o.orderNumber.replace('BC-',''), type:'delivery', typeName:'Bon de Livraison (BL)', date:o.deliveredAt || o.createdAt, customerName:o.customerName, total:o.total, raw:o });
      }
    });
    invoices.forEach(inv => list.push({ id:inv.id, number:inv.invoiceNumber, type:'invoice', typeName:'Facture (FAC)', date:inv.date, customerName:inv.customerName, total:inv.total, raw:inv }));
    quickSales.forEach(s => list.push({ id:s.id, number:s.saleNumber, type:'receipt', typeName:'Bon de Caisse Comptoir', date:s.date, customerName:s.customerName, total:s.total, raw:s }));
    return list.sort((a,b)=>new Date(b.date).getTime()-new Date(a.date).getTime());
  }, [orders, invoices, quickSales, payments]);

  const filteredDocs = useMemo(() => allDocuments.filter(d => {
    if (docTypeFilter !== 'all' && d.type !== docTypeFilter) return false;
    if (searchQuery.trim()) { const q=searchQuery.toLowerCase().trim(); return d.number.toLowerCase().includes(q) || d.customerName.toLowerCase().includes(q); }
    return true;
  }), [allDocuments, docTypeFilter, searchQuery]);

  const handleDownload = (doc:any) => {
    let docData: DocumentData;
    if (doc.type === 'invoice') {
      const inv=doc.raw;
      docData={ type:'invoice', documentNumber:inv.invoiceNumber, date:inv.date, customerName:inv.customerName, items:inv.items.map((i:any)=>({designation:i.productName,quantity:i.quantity,unit:i.unit,unitPrice:i.unitPrice,total:i.subtotal})), subtotal:inv.subtotal, tax:inv.tax, total:inv.total, paidAmount:inv.paidAmount, balanceRemaining:inv.balanceRemaining, notes:inv.notes };
    } else if (doc.type === 'delivery') {
      const ord=doc.raw;
      docData={ type:'delivery', documentNumber:doc.number, date:ord.deliveredAt || ord.createdAt, customerName:ord.customerName, items:ord.items.map((i:any)=>({designation:i.productName,quantity:i.deliveredQuantity || i.quantity,unit:i.unit,unitPrice:i.unitPrice,total:(i.deliveredQuantity || i.quantity)*i.unitPrice})), subtotal:ord.total, total:ord.total, paidAmount:ord.paidAmount, balanceRemaining:ord.total-ord.paidAmount };
    } else {
      const ord=doc.raw;
      docData={ type:doc.type, documentNumber:doc.number, date:ord.createdAt || ord.date, customerName:ord.customerName, items:ord.items.map((i:any)=>({designation:i.productName,quantity:i.quantity,unit:i.unit,unitPrice:i.unitPrice,total:i.subtotal})), subtotal:ord.total, total:ord.total, paidAmount:ord.paidAmount || ord.total, balanceRemaining:ord.total-(ord.paidAmount || ord.total) };
    }
    downloadDocumentPDF(docData, settings);
  };

  return <div className="space-y-6 pb-12 animate-fade-in">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2"><FileText className="w-6 h-6 text-emerald-700 dark:text-emerald-400" /><span>Documents Commerciaux & Facturation</span></h1><p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">Bons de commande (BC), Bons de livraison (BL), Factures (FAC) et Reçus téléchargeables en PDF</p></div></div>
    <div className="flex flex-col sm:flex-row gap-3"><div className="relative flex-1"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="text" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Rechercher par n° de document ou nom du destinataire..." className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white" /></div><div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">{[{key:'all',label:'Tous les documents'},{key:'order',label:'Bons de Commande (BC)'},{key:'delivery',label:'Bons de Livraison (BL)'},{key:'invoice',label:'Factures (FAC)'},{key:'receipt',label:'Reçus de Caisse'}].map(f=><button key={f.key} type="button" onClick={()=>setDocTypeFilter(f.key as any)} className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${docTypeFilter===f.key?'bg-emerald-800 text-white shadow-sm':'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}>{f.label}</button>)}</div></div>
    {filteredDocs.length===0?<EmptyState icon={FileText} title="Aucun document correspondant" description="Les documents commerciaux se génèrent au fur et à mesure des commandes et livraisons." />:<div className="grid grid-cols-1 gap-2.5">{filteredDocs.map(doc=><div key={doc.id+'_'+doc.number} className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"><div className="flex items-center gap-3.5"><div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300"><FileText className="w-5 h-5 text-emerald-700 dark:text-emerald-400" /></div><div><div className="flex items-center gap-2"><strong className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">{doc.number}</strong><span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">{doc.typeName}</span></div><span className="text-slate-500 block mt-0.5">Destinataire : <strong className="text-slate-800 dark:text-slate-200">{doc.customerName}</strong> · Émis le {formatDate(doc.date)}</span></div></div><div className="flex items-center justify-between sm:justify-end gap-4 shrink-0"><span className="text-base sm:text-lg font-black text-slate-900 dark:text-white">{formatDZD(doc.total)}</span><button type="button" onClick={()=>handleDownload(doc)} className="px-3.5 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-800 dark:text-slate-200 hover:text-emerald-800 rounded-xl font-bold flex items-center gap-1.5 transition" title="Télécharger le PDF A4 officiel"><Download className="w-3.5 h-3.5" /><span>Télécharger PDF</span></button></div></div>)}</div>}
  </div>;
};
