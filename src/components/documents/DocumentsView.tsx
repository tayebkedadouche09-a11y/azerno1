import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FileText, Search, Download, RefreshCw, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';
import { db } from '../../lib/storage';
import { formatDZD, formatDate } from '../../lib/utils';
import { downloadDocumentPDF, DocumentData } from '../../lib/pdfGenerator';
import { EmptyState } from '../common/EmptyState';

type DocType = 'all' | 'order' | 'delivery' | 'invoice';
type Row = Record<string, any>;

type DocumentRow = {
  id: string;
  number: string;
  type: Exclude<DocType, 'all'>;
  typeName: string;
  date: string;
  customerName: string;
  total: number;
  raw: Row;
};

const num = (value: unknown) => Number(value ?? 0);

const mapItems = (items: any[] = [], fallbackPrice = 0) => items.map((item: any) => ({
  designation: item.designation ?? item.productName ?? item.description ?? 'Produit',
  quantity: num(item.quantity),
  unit: item.unit ?? 'u',
  unitPrice: num(item.unitPrice ?? item.unit_price ?? fallbackPrice),
  total: num(item.total ?? item.subtotal ?? (num(item.quantity) * num(item.unitPrice ?? item.unit_price ?? fallbackPrice)))
}));

export const DocumentsView: React.FC = () => {
  const [docTypeFilter, setDocTypeFilter] = useState<DocType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [orders, setOrders] = useState<Row[]>([]);
  const [deliveries, setDeliveries] = useState<Row[]>([]);
  const [invoices, setInvoices] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [orderResult, deliveryResult, invoiceResult] = await Promise.all([
        api.orders(),
        api.deliveries(),
        api.invoices()
      ]);
      setOrders(orderResult.items);
      setDeliveries(deliveryResult.items);
      setInvoices(invoiceResult.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible de charger les documents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const allDocuments = useMemo<DocumentRow[]>(() => {
    const list: DocumentRow[] = [];

    orders.forEach(order => {
      list.push({
        id: String(order.id),
        number: String(order.number ?? order.orderNumber ?? ''),
        type: 'order',
        typeName: 'Bon de Commande (BC)',
        date: String(order.created_at ?? order.createdAt ?? new Date().toISOString()),
        customerName: String(order.customer_name ?? order.customerName ?? 'Client comptoir'),
        total: num(order.total),
        raw: order
      });
    });

    deliveries.forEach(delivery => {
      list.push({
        id: String(delivery.id),
        number: String(delivery.number ?? ''),
        type: 'delivery',
        typeName: 'Bon de Livraison (BL)',
        date: String(delivery.delivery_date ?? delivery.created_at ?? new Date().toISOString()),
        customerName: String(delivery.customer_name ?? 'Client'),
        total: num(delivery.total ?? delivery.order_total),
        raw: delivery
      });
    });

    invoices.forEach(invoice => {
      list.push({
        id: String(invoice.id),
        number: String(invoice.number ?? invoice.invoiceNumber ?? ''),
        type: 'invoice',
        typeName: 'Facture (FAC)',
        date: String(invoice.invoice_date ?? invoice.date ?? invoice.created_at ?? new Date().toISOString()),
        customerName: String(invoice.customer_name ?? invoice.customerName ?? 'Client'),
        total: num(invoice.total),
        raw: invoice
      });
    });

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [orders, deliveries, invoices]);

  const filteredDocs = useMemo(() => allDocuments.filter(doc => {
    if (docTypeFilter !== 'all' && doc.type !== docTypeFilter) return false;
    const q = searchQuery.trim().toLowerCase();
    return !q || `${doc.number} ${doc.customerName}`.toLowerCase().includes(q);
  }), [allDocuments, docTypeFilter, searchQuery]);

  const handleDownload = (doc: DocumentRow) => {
    const raw = doc.raw;
    const items = mapItems(raw.items ?? []);
    const total = num(raw.total);
    const paid = num(raw.paid_total ?? raw.paidAmount);
    const data: DocumentData = {
      type: doc.type,
      documentNumber: doc.number,
      date: doc.date,
      customerName: doc.customerName,
      items,
      subtotal: num(raw.subtotal ?? total),
      discount: num(raw.discount),
      tax: num(raw.tax),
      total,
      paidAmount: paid,
      balanceRemaining: Math.max(0, total - paid),
      notes: raw.notes,
      deliveryPerson: raw.delivery_person
    };
    downloadDocumentPDF(data, db.getSettings());
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-emerald-700 dark:text-emerald-400" />
            <span>Documents Commerciaux & Facturation</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            BC, BL et factures alimentés directement depuis PostgreSQL via l'API.
          </p>
        </div>
        <button type="button" onClick={() => void refresh()} disabled={loading} className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualiser
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Rechercher par n° ou client..." className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm" />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {[
            { key: 'all', label: 'Tous' },
            { key: 'order', label: 'BC' },
            { key: 'delivery', label: 'BL' },
            { key: 'invoice', label: 'Factures' }
          ].map(filter => (
            <button key={filter.key} type="button" onClick={() => setDocTypeFilter(filter.key as DocType)} className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap ${docTypeFilter === filter.key ? 'bg-emerald-800 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}>
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-sm">{error}</div>}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-500"><Loader2 className="w-5 h-5 animate-spin mr-2" />Chargement des documents...</div>
      ) : filteredDocs.length === 0 ? (
        <EmptyState icon={FileText} title="Aucun document correspondant" description="Les documents apparaissent ici dès qu'ils existent dans PostgreSQL." />
      ) : (
        <div className="grid grid-cols-1 gap-2.5">
          {filteredDocs.map(doc => (
            <div key={`${doc.id}_${doc.number}`} className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/60 shrink-0"><FileText className="w-5 h-5 text-emerald-700 dark:text-emerald-400" /></div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <strong className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">{doc.number}</strong>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">{doc.typeName}</span>
                  </div>
                  <span className="text-xs text-slate-500 block mt-0.5">Client : <strong className="text-slate-800 dark:text-slate-200">{doc.customerName}</strong> · {formatDate(doc.date)}</span>
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white">{formatDZD(doc.total)}</span>
                <button type="button" onClick={() => handleDownload(doc)} className="px-3.5 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-800 dark:text-slate-200 hover:text-emerald-800 rounded-xl font-bold flex items-center gap-1.5 transition" title="Télécharger le PDF A4 officiel">
                  <Download className="w-3.5 h-3.5" /><span>PDF</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
