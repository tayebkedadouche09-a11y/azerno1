import { jsPDF } from 'jspdf';
import { BusinessSettings } from '../types';
import { formatDZD, formatDate, formatUnit } from './utils';

export interface DocumentItemRow {
  designation: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

export interface DocumentData {
  type: 'order' | 'delivery' | 'invoice' | 'receipt' | 'statement';
  documentNumber: string;
  date: string;
  dueDate?: string;
  deliveryDate?: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  items: DocumentItemRow[];
  subtotal: number;
  discount?: number;
  tax?: number;
  total: number;
  paidAmount?: number;
  balanceRemaining?: number;
  paymentMethod?: string;
  notes?: string;
  deliveryPerson?: string;
}

export function generatePDF(docData: DocumentData, settings: BusinessSettings): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = 18;

  // --- Top Header: Company Banner ---
  doc.setFillColor(6, 78, 59); // Emerald 900
  doc.rect(margin, y, contentWidth, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(settings.name.toUpperCase(), margin + 6, y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(settings.slogan, margin + 6, y + 15);
  doc.text(`Tél: ${settings.phone} | ${settings.wilaya}`, margin + 6, y + 20);

  // Document Type Header
  let docTitle = 'DOCUMENT COMMERCIAL';
  let badgeColor: [number, number, number] = [16, 185, 129]; // emerald
  if (docData.type === 'order') {
    docTitle = 'BON DE COMMANDE';
    badgeColor = [14, 165, 233]; // sky
  } else if (docData.type === 'delivery') {
    docTitle = 'BON DE LIVRAISON';
    badgeColor = [16, 185, 129]; // emerald
  } else if (docData.type === 'invoice') {
    docTitle = 'FACTURE DE VENTE';
    badgeColor = [99, 102, 241]; // indigo
  } else if (docData.type === 'receipt') {
    docTitle = 'REÇU DE RÈGLEMENT';
    badgeColor = [245, 158, 11]; // amber
  } else if (docData.type === 'statement') {
    docTitle = 'RELEVÉ DE COMPTE CLIENT';
    badgeColor = [168, 85, 247]; // purple
  }

  y += 30;

  // --- Document Number & Dates (Left) + Customer Block (Right) ---
  // Left Box: Document Meta
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, 85, 34, 2, 2, 'FD');

  doc.setTextColor(badgeColor[0], badgeColor[1], badgeColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(docTitle, margin + 5, y + 8);

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.text(`N° : ${docData.documentNumber}`, margin + 5, y + 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Date d'émission : ${formatDate(docData.date)}`, margin + 5, y + 21);
  if (docData.deliveryDate) {
    doc.text(`Date livraison : ${formatDate(docData.deliveryDate)}`, margin + 5, y + 27);
  } else if (docData.dueDate) {
    doc.text(`Échéance : ${formatDate(docData.dueDate)}`, margin + 5, y + 27);
  }

  // Right Box: Customer Details
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin + 92, y, 88, 34, 2, 2, 'FD');

  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('CLIENT / DESTINATAIRE', margin + 97, y + 7);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.text(docData.customerName, margin + 97, y + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  if (docData.customerPhone) {
    doc.text(`Tél: ${docData.customerPhone}`, margin + 97, y + 21);
  }
  if (docData.customerAddress) {
    const addressLines = doc.splitTextToSize(docData.customerAddress, 80);
    doc.text(addressLines, margin + 97, y + 27);
  }

  y += 40;

  // --- Items Table Header ---
  doc.setFillColor(30, 41, 59);
  doc.rect(margin, y, contentWidth, 8, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);

  doc.text('DÉSIGNATION / PRODUIT', margin + 4, y + 5.5);
  doc.text('QTÉ', margin + 100, y + 5.5);
  doc.text('UNITÉ', margin + 118, y + 5.5);
  doc.text('P.U. (DA)', margin + 138, y + 5.5);
  doc.text('TOTAL (DA)', margin + 160, y + 5.5);

  y += 8;

  // --- Items Rows ---
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);

  docData.items.forEach((item, index) => {
    // Zebra row background
    if (index % 2 === 0) {
      doc.setFillColor(255, 255, 255);
    } else {
      doc.setFillColor(248, 250, 252);
    }
    doc.rect(margin, y, contentWidth, 7.5, 'F');

    // Designation
    const nameTruncated = item.designation.length > 45 ? item.designation.substring(0, 42) + '...' : item.designation;
    doc.text(nameTruncated, margin + 4, y + 5);

    // Quantity
    doc.text(String(item.quantity), margin + 100, y + 5);

    // Unit
    doc.text(item.unit, margin + 118, y + 5);

    // Unit Price
    doc.text(item.unitPrice > 0 ? String(item.unitPrice) : '—', margin + 138, y + 5);

    // Subtotal
    doc.text(formatDZD(item.total).replace(' DA', ''), margin + 160, y + 5);

    y += 7.5;
  });

  // Table bottom border
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y, margin + contentWidth, y);

  y += 5;

  // --- Notes & Totals Area ---
  const totalsY = y;

  // Notes left box
  if (docData.notes || docData.deliveryPerson) {
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, totalsY, 95, 28, 1.5, 1.5, 'FD');
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('NOTES & OBSERVATIONS', margin + 4, totalsY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    let noteText = docData.notes || '';
    if (docData.deliveryPerson) {
      noteText += (noteText ? '\n' : '') + `Livreur: ${docData.deliveryPerson}`;
    }
    const splitNotes = doc.splitTextToSize(noteText, 88);
    doc.text(splitNotes, margin + 4, totalsY + 12);
  }

  // Totals Right Box
  const totalsX = margin + 105;
  const totalsW = 75;

  doc.setFillColor(241, 245, 249);
  doc.roundedRect(totalsX, totalsY, totalsW, 36, 1.5, 1.5, 'FD');

  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);

  doc.text('Total Brut :', totalsX + 4, totalsY + 8);
  doc.text(formatDZD(docData.subtotal), totalsX + totalsW - 5, totalsY + 8, { align: 'right' });

  if (docData.discount && docData.discount > 0) {
    doc.text('Remise accordée :', totalsX + 4, totalsY + 14);
    doc.text(`-${formatDZD(docData.discount)}`, totalsX + totalsW - 5, totalsY + 14, { align: 'right' });
  }

  // Net à Payer Banner
  doc.setFillColor(6, 78, 59);
  doc.rect(totalsX, totalsY + 16, totalsW, 9, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('NET À PAYER :', totalsX + 4, totalsY + 22);
  doc.text(formatDZD(docData.total), totalsX + totalsW - 5, totalsY + 22, { align: 'right' });

  // Payment balance
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);

  if (docData.paidAmount !== undefined) {
    doc.text(`Montant réglé : ${formatDZD(docData.paidAmount)}`, totalsX + 4, totalsY + 29);
  }
  if (docData.balanceRemaining !== undefined && docData.balanceRemaining > 0) {
    doc.setTextColor(220, 38, 38); // Red
    doc.setFont('helvetica', 'bold');
    doc.text(`Reste dû : ${formatDZD(docData.balanceRemaining)}`, totalsX + 4, totalsY + 34);
  }

  y = totalsY + 44;

  // --- Signatures & Stamp Zone ---
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, 85, 26, 1.5, 1.5, 'D');
  doc.roundedRect(margin + 95, y, 85, 26, 1.5, 1.5, 'D');

  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('SIGNATURE / BON POUR ACCORD CLIENT', margin + 4, y + 6);
  doc.text('CACHET & SIGNATURE DE L\'ÉTABLISSEMENT', margin + 99, y + 6);

  // --- Footer Fiscal Details ---
  const footerY = 282;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, footerY - 4, margin + contentWidth, footerY - 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);

  const fiscalInfo = `RC: ${settings.rc || '15/00-1284920B21'} | NIF: ${settings.nif || '099815024891234'} | NIS: ${settings.nis || '1988150200123'} | RIB: ${settings.rib || '002 00015 1520001234 45'}`;
  doc.text(fiscalInfo, pageWidth / 2, footerY, { align: 'center' });
  doc.text(settings.defaultTerms, pageWidth / 2, footerY + 4, { align: 'center' });

  return doc;
}

export function downloadDocumentPDF(docData: DocumentData, settings: BusinessSettings): void {
  const doc = generatePDF(docData, settings);
  doc.save(`${docData.documentNumber}_${docData.customerName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
}

export interface FinancialReportExpenseCategory {
  category: string;
  label: string;
  amount: number;
  percentage: number;
}

export interface FinancialReportData {
  periodMonth: string;
  generationDate: string;
  // Revenue
  quickSalesRevenue: number;
  ordersRevenue: number;
  totalRevenue: number;
  // Costs
  quickSalesCOGS: number;
  ordersCOGS: number;
  totalCOGS: number;
  // Gross Margins
  quickSalesGrossMargin: number;
  ordersGrossMargin: number;
  grossMargin: number;
  grossMarginPercent: number;
  // Expenses
  totalExpenses: number;
  expensesByCategory: FinancialReportExpenseCategory[];
  // Net Profit
  netProfit: number;
  netMarginPercent: number;
  // Treasury
  cashBalance: number;
  bankBalance: number;
  totalTreasury: number;
}

export function generateFinancialReportPDF(data: FinancialReportData, settings: BusinessSettings): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = 14;

  // --- 1. Top Header: Company Banner ---
  doc.setFillColor(6, 78, 59); // Emerald 900
  doc.rect(margin, y, contentWidth, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(settings.name.toUpperCase(), margin + 6, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`${settings.slogan} — ${settings.wilaya}`, margin + 6, y + 14);
  doc.text(`Tél : ${settings.phone} | Email : contact@azrnou.dz`, margin + 6, y + 19);

  // Document Title Header Badge (Right side of banner)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('RAPPORT FINANCIER MENSUEL', margin + contentWidth - 6, y + 9, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Période : ${data.periodMonth}`, margin + contentWidth - 6, y + 15, { align: 'right' });
  doc.text(`Arrêté au : ${formatDate(data.generationDate)}`, margin + contentWidth - 6, y + 19, { align: 'right' });

  y += 26;

  // --- 2. Executive KPI Overview Boxes (4 Cards) ---
  const kpiWidth = (contentWidth - 9) / 4;
  const kpiHeight = 18;

  // Card 1: Chiffre d'Affaires
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, kpiWidth, kpiHeight, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('CHIFFRE D\'AFFAIRES BRUT', margin + 3, y + 5);
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(formatDZD(data.totalRevenue), margin + 3, y + 12);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Comptoir + Commandes', margin + 3, y + 16);

  // Card 2: Marge Brute
  const kpi2X = margin + kpiWidth + 3;
  doc.setFillColor(236, 253, 245);
  doc.setDrawColor(167, 243, 208);
  doc.roundedRect(kpi2X, y, kpiWidth, kpiHeight, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(5, 150, 105);
  doc.text('MARGE BRUTE GLOBALE', kpi2X + 3, y + 5);
  doc.setFontSize(9.5);
  doc.setTextColor(6, 78, 59);
  doc.text(formatDZD(data.grossMargin), kpi2X + 3, y + 12);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Taux de marge : ${data.grossMarginPercent}%`, kpi2X + 3, y + 16);

  // Card 3: Dépenses Exploitation
  const kpi3X = kpi2X + kpiWidth + 3;
  doc.setFillColor(254, 243, 199);
  doc.setDrawColor(251, 191, 36);
  doc.roundedRect(kpi3X, y, kpiWidth, kpiHeight, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(180, 83, 9);
  doc.text('CHARGES EXPLOITATION', kpi3X + 3, y + 5);
  doc.setFontSize(9.5);
  doc.setTextColor(146, 64, 14);
  doc.text(formatDZD(data.totalExpenses), kpi3X + 3, y + 12);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.expensesByCategory.length} catégories de charge`, kpi3X + 3, y + 16);

  // Card 4: Résultat Net
  const kpi4X = kpi3X + kpiWidth + 3;
  const isNetPositive = data.netProfit >= 0;
  if (isNetPositive) {
    doc.setFillColor(236, 253, 245);
    doc.setDrawColor(167, 243, 208);
  } else {
    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(254, 202, 202);
  }
  doc.roundedRect(kpi4X, y, kpiWidth, kpiHeight, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  if (isNetPositive) {
    doc.setTextColor(5, 150, 105);
  } else {
    doc.setTextColor(220, 38, 38);
  }
  doc.text('RÉSULTAT NET ESTIMÉ', kpi4X + 3, y + 5);
  doc.setFontSize(9.5);
  if (isNetPositive) {
    doc.setTextColor(6, 78, 59);
  } else {
    doc.setTextColor(185, 28, 28);
  }
  doc.text(formatDZD(data.netProfit), kpi4X + 3, y + 12);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Marge nette : ${data.netMarginPercent}%`, kpi4X + 3, y + 16);

  y += 24;

  // --- 3. Section: Revenus et Marges Brutes par Canal ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('1. REVENUS D\'ACTIVITÉ & MARGES BRUTES', margin, y);
  y += 4;

  // Table header
  doc.setFillColor(30, 41, 59);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.text('CANAL / SOURCE DE VENTES', margin + 3, y + 4.8);
  doc.text('REVENUS (CA)', margin + 70, y + 4.8);
  doc.text('COÛT DE REVIENT (COGS)', margin + 105, y + 4.8);
  doc.text('MARGE BRUTE', margin + 148, y + 4.8);
  doc.text('TAUX MARGE', margin + 181, y + 4.8, { align: 'right' });
  y += 7;

  // Row 1: Quick Sales
  const qsMarginPercent = data.quickSalesRevenue > 0 ? Math.round((data.quickSalesGrossMargin / data.quickSalesRevenue) * 100) : 0;
  doc.setFillColor(255, 255, 255);
  doc.rect(margin, y, contentWidth, 6.5, 'F');
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Ventes Directes Comptoir (Caisse Magasin POS)', margin + 3, y + 4.5);
  doc.text(formatDZD(data.quickSalesRevenue), margin + 70, y + 4.5);
  doc.text(formatDZD(data.quickSalesCOGS), margin + 105, y + 4.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(5, 150, 105);
  doc.text(formatDZD(data.quickSalesGrossMargin), margin + 148, y + 4.5);
  doc.text(`${qsMarginPercent}%`, margin + 181, y + 4.5, { align: 'right' });
  y += 6.5;

  // Row 2: Orders
  const ordMarginPercent = data.ordersRevenue > 0 ? Math.round((data.ordersGrossMargin / data.ordersRevenue) * 100) : 0;
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, y, contentWidth, 6.5, 'F');
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'normal');
  doc.text('Commandes Clients & Grossistes (B2B / CHR)', margin + 3, y + 4.5);
  doc.text(formatDZD(data.ordersRevenue), margin + 70, y + 4.5);
  doc.text(formatDZD(data.ordersCOGS), margin + 105, y + 4.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(5, 150, 105);
  doc.text(formatDZD(data.ordersGrossMargin), margin + 148, y + 4.5);
  doc.text(`${ordMarginPercent}%`, margin + 181, y + 4.5, { align: 'right' });
  y += 6.5;

  // Total Row
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('TOTAL CONSOLIDÉ DES VENTES', margin + 3, y + 4.8);
  doc.text(formatDZD(data.totalRevenue), margin + 70, y + 4.8);
  doc.text(formatDZD(data.totalCOGS), margin + 105, y + 4.8);
  doc.setTextColor(6, 78, 59);
  doc.text(formatDZD(data.grossMargin), margin + 148, y + 4.8);
  doc.text(`${data.grossMarginPercent}%`, margin + 181, y + 4.8, { align: 'right' });
  y += 12;

  // --- 4. Section: Dépenses d'Exploitation par Catégorie ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('2. STRUCTURE DES DÉPENSES D\'EXPLOITATION', margin, y);
  y += 4;

  // Table header
  doc.setFillColor(30, 41, 59);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.text('POSTE DE CHARGE', margin + 3, y + 4.8);
  doc.text('INTITULÉ / NATURE', margin + 60, y + 4.8);
  doc.text('MONTANT ENGAGÉ', margin + 130, y + 4.8);
  doc.text('% DU TOTAL', margin + 181, y + 4.8, { align: 'right' });
  y += 7;

  // Categories Rows
  data.expensesByCategory.forEach((cat, idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(255, 255, 255);
    } else {
      doc.setFillColor(248, 250, 252);
    }
    doc.rect(margin, y, contentWidth, 6, 'F');
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(cat.category.toUpperCase(), margin + 3, y + 4.2);
    doc.text(cat.label, margin + 60, y + 4.2);
    doc.setFont('helvetica', 'bold');
    doc.text(formatDZD(cat.amount), margin + 130, y + 4.2);
    doc.setFont('helvetica', 'normal');
    doc.text(`${cat.percentage}%`, margin + 181, y + 4.2, { align: 'right' });
    y += 6;
  });

  // Total Expenses Row
  doc.setFillColor(254, 243, 199);
  doc.rect(margin, y, contentWidth, 6.5, 'F');
  doc.setTextColor(146, 64, 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('TOTAL CHARGES D\'EXPLOITATION', margin + 3, y + 4.5);
  doc.text(formatDZD(data.totalExpenses), margin + 130, y + 4.5);
  doc.text('100.0%', margin + 181, y + 4.5, { align: 'right' });
  y += 12;

  // --- 5. Section: Compte de Résultat Simplifié (P&L) & Trésorerie ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('3. SYNTHÈSE DE RENTABILITÉ (P&L) & ÉTAT DE TRÉSORERIE', margin, y);
  y += 4;

  const halfWidth = (contentWidth - 6) / 2;

  // Left Box: P&L Statement
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, halfWidth, 42, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('COMPTE DE RÉSULTAT SYNTHÉTIQUE', margin + 4, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);

  // Line 1: CA
  doc.text('Chiffre d\'Affaires Total :', margin + 4, y + 13);
  doc.text(`+ ${formatDZD(data.totalRevenue)}`, margin + halfWidth - 4, y + 13, { align: 'right' });

  // Line 2: COGS
  doc.text('Coût des Matières & Produits Vendus :', margin + 4, y + 19);
  doc.text(`- ${formatDZD(data.totalCOGS)}`, margin + halfWidth - 4, y + 19, { align: 'right' });

  // Line 3: Marge Brute
  doc.setDrawColor(203, 213, 225);
  doc.line(margin + 4, y + 22, margin + halfWidth - 4, y + 22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(5, 150, 105);
  doc.text('MARGE BRUTE :', margin + 4, y + 26);
  doc.text(`${formatDZD(data.grossMargin)} (${data.grossMarginPercent}%)`, margin + halfWidth - 4, y + 26, { align: 'right' });

  // Line 4: Expenses
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 83, 9);
  doc.text('Charges d\'Exploitation (Dépenses) :', margin + 4, y + 32);
  doc.text(`- ${formatDZD(data.totalExpenses)}`, margin + halfWidth - 4, y + 32, { align: 'right' });

  // Line 5: Net Profit
  doc.line(margin + 4, y + 35, margin + halfWidth - 4, y + 35);
  doc.setFont('helvetica', 'bold');
  if (isNetPositive) {
    doc.setTextColor(6, 78, 59);
  } else {
    doc.setTextColor(185, 28, 28);
  }
  doc.text('RÉSULTAT NET D\'EXPLOITATION :', margin + 4, y + 39);
  doc.text(formatDZD(data.netProfit), margin + halfWidth - 4, y + 39, { align: 'right' });

  // Right Box: Cash & Bank Treasury
  const rightBoxX = margin + halfWidth + 6;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(rightBoxX, y, halfWidth, 42, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('POSITION DE TRÉSORERIE DISPONIBLE', rightBoxX + 4, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);

  // Cash
  doc.text('Solde Caisse Espèces (Tiroir) :', rightBoxX + 4, y + 14);
  doc.setFont('helvetica', 'bold');
  doc.text(formatDZD(data.cashBalance), rightBoxX + halfWidth - 4, y + 14, { align: 'right' });

  // Bank
  doc.setFont('helvetica', 'normal');
  doc.text('Compte Bancaire (Virements / Chèques) :', rightBoxX + 4, y + 22);
  doc.setFont('helvetica', 'bold');
  doc.text(formatDZD(data.bankBalance), rightBoxX + halfWidth - 4, y + 22, { align: 'right' });

  // Treasury Total
  doc.setDrawColor(203, 213, 225);
  doc.line(rightBoxX + 4, y + 28, rightBoxX + halfWidth - 4, y + 28);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(6, 78, 59);
  doc.text('TRÉSORERIE GLOBALE LIQUIDE :', rightBoxX + 4, y + 35);
  doc.text(formatDZD(data.totalTreasury), rightBoxX + halfWidth - 4, y + 35, { align: 'right' });

  y += 47;

  // --- 6. Signatures Zone ---
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, 86, 22, 1.5, 1.5, 'D');
  doc.roundedRect(margin + 96, y, 86, 22, 1.5, 1.5, 'D');

  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('VISA DIRECTION / GÉRANCE', margin + 4, y + 5.5);
  doc.text('VISA COMPTABILITÉ / CONTRÔLE DE GESTION', margin + 100, y + 5.5);

  // --- 7. Footer Fiscal Details ---
  const footerY = 284;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, footerY - 4, margin + contentWidth, footerY - 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);

  const fiscalInfo = `Fromagerie Artisanale AZRNOU | RC: ${settings.rc || '15/00-1284920B21'} | NIF: ${settings.nif || '099815024891234'} | NIS: ${settings.nis || '1988150200123'} | RIB: ${settings.rib || '002 00015 1520001234 45'}`;
  doc.text(fiscalInfo, pageWidth / 2, footerY, { align: 'center' });
  doc.text('Document interne d\'aide à la décision et de contrôle budgétaire de la fromagerie.', pageWidth / 2, footerY + 3.5, { align: 'center' });

  return doc;
}

export function downloadFinancialReportPDF(data: FinancialReportData, settings: BusinessSettings): void {
  const doc = generateFinancialReportPDF(data, settings);
  const cleanPeriod = data.periodMonth.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Rapport_Financier_AZRNOU_${cleanPeriod}.pdf`);
}
