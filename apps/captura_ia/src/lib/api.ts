/**
 * Cliente das funções serverless.
 *
 * Princípio: nenhuma dessas chamadas pode travar o visitante. O acesso ao
 * cofre e a abertura da agenda acontecem no cliente de qualquer jeito; se o
 * backend cair, perdemos o registro, não a conversão.
 */
import { UserLead } from '../types';

export const CALENDLY_URL =
  import.meta.env.VITE_CALENDLY_URL || 'https://calendly.com/oraclumtech/reuniao-pre-contratacao';

/** Parâmetros de campanha da URL atual, para saber de onde o lead veio. */
function currentUtm(): Record<string, string> | undefined {
  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};

  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
    const value = params.get(key);
    if (value) utm[key] = value;
  }

  const referrer = document.referrer;
  if (referrer && !referrer.startsWith(window.location.origin)) {
    utm.referrer = referrer;
  }

  return Object.keys(utm).length ? utm : undefined;
}

/** Cadastro que libera o cofre. Não bloqueia a liberação se falhar. */
export async function registerLead(lead: UserLead): Promise<void> {
  try {
    await fetch('/api/lead', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        fullName: lead.fullName,
        email: lead.email,
        phone: lead.phone,
        agreedToTerms: lead.agreedToTerms,
        utm: currentUtm(),
      }),
      keepalive: true,
    });
  } catch (error) {
    console.warn('Lead não registrado no servidor:', error);
  }
}

/**
 * URL da agenda com o rastreio anexado.
 *
 * O valor é um UUID aleatório — não é dado pessoal, então pode viajar na query
 * string sem expor ninguém em log de servidor, histórico ou referrer. É por ele
 * que o webhook do Calendly reencontra o card no ClickUp.
 */
export function calendlyUrlWithTracking(trackingId: string): string {
  const url = new URL(CALENDLY_URL);
  url.searchParams.set('salesforce_uuid', trackingId);
  url.searchParams.set('utm_content', trackingId);
  url.searchParams.set('utm_source', 'site');
  return url.toString();
}

export interface BookingContact {
  trackingId: string;
  name: string;
  phone: string;
  businessType: string;
}

/** Pré-agendamento: grava o contato e cria o card no ClickUp. */
export async function registerBooking(contact: BookingContact): Promise<void> {
  try {
    await fetch('/api/booking', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(contact),
      keepalive: true,
    });
  } catch (error) {
    console.warn('Pré-agendamento não registrado no servidor:', error);
  }
}

/** UUID v4 com fallback para navegadores sem crypto.randomUUID. */
export function newTrackingId(): string {
  if (typeof crypto === 'undefined') {
    throw new Error('Web Crypto indisponível — não é possível gerar o rastreio.');
  }

  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
