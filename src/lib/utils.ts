import { UnitType } from '../types';

/**
 * Formats an amount into Algerian Dinar (DA) with thousands separator.
 * E.g., 85000 -> "85 000 DA"
 */
export function formatDZD(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '0 DA';
  }
  const rounded = Math.round(amount);
  const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${formatted} DA`;
}

/**
 * Formats standard ISO or date string to localized human date.
 */
export function formatDate(dateString?: string, includeTime: boolean = false): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;

    const day = String(d.getDate()).padStart(2, '0');
    const months = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();

    if (includeTime) {
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      return `${day} ${month} ${year} à ${hours}:${mins}`;
    }
    return `${day} ${month} ${year}`;
  } catch {
    return dateString;
  }
}

/**
 * Human friendly labels for units
 */
export function formatUnit(unit: UnitType, qty: number = 1): string {
  switch (unit) {
    case 'piece':
      return qty > 1 ? 'pièces' : 'pièce';
    case 'kg':
      return 'kg';
    case 'g':
      return 'g';
    case 'litre':
      return qty > 1 ? 'litres' : 'litre';
    case 'pot':
      return qty > 1 ? 'pots' : 'pot';
    case 'pack5':
      return 'pack 5';
    case 'pack10':
      return 'pack 10';
    case 'carton':
      return qty > 1 ? 'cartons' : 'carton';
    default:
      return unit;
  }
}

/**
 * Generates WhatsApp click-to-chat URL with prefilled message
 */
export function generateWhatsAppLink(phone: string, text: string): string {
  // Normalize phone number (strip spaces, dashes, ensure country code)
  let clean = phone.replace(/[^0-9+]/g, '');
  if (clean.startsWith('0')) {
    clean = '+213' + clean.substring(1);
  }
  if (!clean.startsWith('+')) {
    clean = '+' + clean;
  }
  const encodedText = encodeURIComponent(text);
  return `https://wa.me/${clean.replace('+', '')}?text=${encodedText}`;
}

/**
 * Mobile haptic vibration if supported
 */
export function triggerHaptic() {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(12);
    } catch {
      // ignore
    }
  }
}

/**
 * Helper to match multi-word search queries
 */
export function searchMatches(target: string, query: string): boolean {
  if (!query || !query.trim()) return true;
  const q = query.toLowerCase().trim();
  const t = (target || '').toLowerCase();
  return t.includes(q);
}
