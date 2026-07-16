import { Smartphone, Landmark, Bitcoin, CreditCard, Wallet, type LucideIcon } from 'lucide-react';

export type PaymentField = { key: string; label: string; placeholder: string; maxLength?: number; numericOnly?: boolean; required: boolean };
export type PaymentMethodConfig = { id: string; label: string; sub: string; Icon: LucideIcon; currency: 'BSV' | 'USD' | 'CRYPTO'; fields: PaymentField[] };

export const BANK_DATA = { bank: 'Banco de Venezuela', rif: 'J-12345678-9', phone: '0414-1234567', account: '0102-0123-45-6789012345' };
export const TRANSFER_DATA = { bank: 'Banco de Venezuela', rif: 'J-12345678-9', account: '0102-0123-45-6789012345', holder: 'El Salonazo Restaurant C.A.' };
export const BINANCE_DATA = { payId: 'salonazo@bnb', network: 'BEP20 (USDT)', holder: 'El Salonazo' };
export const PAYPAL_DATA = { email: 'pagos.salonazo@gmail.com', holder: 'El Salonazo Restaurant LLC' };
export const CARD_DATA = { processor: 'Stripe (próximamente)', note: 'Tu pago se procesará de forma segura.' };

export const PAYMENT_METHODS: PaymentMethodConfig[] = [
  { id: 'pago_movil', label: 'Pago Móvil', sub: 'Bs.', Icon: Smartphone, currency: 'BSV', fields: [
    { key: 'reference', label: 'Número de referencia', placeholder: 'Ej. 123456789', numericOnly: true, required: true },
    { key: 'bank', label: 'Banco emisor', placeholder: 'Ej. BDV', required: true },
  ]},
  { id: 'transferencia', label: 'Transferencia', sub: 'Bs.', Icon: Landmark, currency: 'BSV', fields: [
    { key: 'reference', label: 'Comprobante', placeholder: 'Ej. 001-2345', required: true },
    { key: 'bank', label: 'Banco emisor', placeholder: 'Ej. Banesco', required: true },
  ]},
  { id: 'binance', label: 'Binance', sub: 'USDT BEP20', Icon: Bitcoin, currency: 'CRYPTO', fields: [
    { key: 'txid', label: 'ID transacción', placeholder: 'Ej. 9876543210', required: true },
  ]},
  { id: 'tarjeta_internacional', label: 'Tarjeta Intl', sub: 'USD', Icon: CreditCard, currency: 'USD', fields: [
    { key: 'last4', label: 'Últimos 4 dígitos', placeholder: '4242', maxLength: 4, numericOnly: true, required: true },
    { key: 'auth_code', label: 'Código autorización', placeholder: 'ABC123', required: false },
  ]},
  { id: 'paypal', label: 'PayPal', sub: 'USD', Icon: Wallet, currency: 'USD', fields: [
    { key: 'txid', label: 'ID transacción PayPal', placeholder: 'PAYID-XXXX', required: true },
  ]},
];

export function getPaymentMethod(id: string) { return PAYMENT_METHODS.find(m => m.id === id); }
