/**
 * POST /api/lead — cadastro que libera o cofre.
 *
 * Grava na lista e NÃO cria card no ClickUp: nesta etapa a pessoa só baixou
 * material gratuito. O pipeline comercial começa no /api/booking.
 */
import { json, dbUpsert, isEmail, isPhone } from './_shared.js';

// Runtime Edge: a assinatura do handler é Web-standard (Request → Response),
// que é o que este arquivo implementa. No runtime Node o Vercel invoca com
// (req, res) e o Response retornado é ignorado — a requisição pendura até
// o timeout. O webhook também depende do Edge para ler o corpo cru
// (request.text()) e validar o HMAC byte a byte.
export const config = { runtime: 'edge' };

interface LeadPayload {
  fullName?: string;
  email?: string;
  phone?: string;
  agreedToTerms?: boolean;
  utm?: Record<string, string>;
}

export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return json({ error: 'Método não permitido' }, 405);
  }

  let payload: LeadPayload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'Corpo inválido' }, 400);
  }

  const fullName = (payload.fullName ?? '').trim();
  const email = (payload.email ?? '').trim().toLowerCase();
  const phone = (payload.phone ?? '').trim();

  if (fullName.length < 3) return json({ error: 'Nome incompleto' }, 400);
  if (!isEmail(email)) return json({ error: 'E-mail inválido' }, 400);
  if (phone && !isPhone(phone)) return json({ error: 'Telefone inválido' }, 400);
  if (payload.agreedToTerms !== true) return json({ error: 'Consentimento obrigatório' }, 400);

  try {
    await dbUpsert(
      'leads',
      {
        full_name: fullName,
        email,
        phone: phone || null,
        agreed_to_terms: true,
        source: 'vault_gate',
        utm: payload.utm ?? null,
        updated_at: new Date().toISOString(),
      },
      'email',
    );

    return json({ ok: true });
  } catch (error) {
    // O visitante não pode ser bloqueado por falha nossa de infraestrutura:
    // o acesso ao cofre já foi liberado no cliente. Só registramos.
    console.error('Falha ao gravar lead:', error);
    return json({ error: 'Falha ao registrar' }, 500);
  }
}
