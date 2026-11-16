/**
 * POST /api/booking — clique em "Marcar Reunião".
 *
 * Esta é a primeira etapa que vira card no ClickUp, de propósito: é aqui que
 * dá para recuperar quem demonstrou intenção e não concluiu no Calendly.
 * O card nasce em OPORTUNIDADE e só sai de lá pelo webhook do Calendly.
 *
 * O tracking_id vem do cliente já gerado. Motivo: o navegador precisa abrir a
 * aba do Calendly no mesmo gesto do clique (senão o bloqueador de pop-up
 * derruba), então a URL tem que existir antes desta chamada terminar.
 */
import {
  json,
  dbInsert,
  dbSelect,
  dbUpdate,
  createClickUpTask,
  CLICKUP_STATUS,
  CLICKUP_FIELD,
  CLICKUP_OPTION,
  empresaOptionId,
  setClickUpField,
  toE164BR,
  isPhone,
  isUuid,
  phoneDigits,
} from './_shared.js';

// Runtime Edge: a assinatura do handler é Web-standard (Request → Response),
// que é o que este arquivo implementa. No runtime Node o Vercel invoca com
// (req, res) e o Response retornado é ignorado — a requisição pendura até
// o timeout. O webhook também depende do Edge para ler o corpo cru
// (request.text()) e validar o HMAC byte a byte.
export const config = { runtime: 'edge' };

interface BookingPayload {
  trackingId?: string;
  name?: string;
  phone?: string;
  businessType?: string;
}

interface LeadRow {
  id: string;
  email?: string;
}

/** Busca o e-mail do lead ligado, para o campo E-mail já nascer preenchido. */
async function emailDoLead(leadId: string): Promise<string | null> {
  try {
    const rows = await dbSelect<LeadRow>('leads', `select=email&id=eq.${leadId}&limit=1`);
    return rows[0]?.email ?? null;
  } catch {
    return null;
  }
}

interface BookingRow {
  id: string;
}

export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return json({ error: 'Método não permitido' }, 405);
  }

  let payload: BookingPayload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'Corpo inválido' }, 400);
  }

  const trackingId = (payload.trackingId ?? '').trim();
  const name = (payload.name ?? '').trim();
  const phone = (payload.phone ?? '').trim();
  const businessType = (payload.businessType ?? '').trim();

  if (!isUuid(trackingId)) return json({ error: 'Rastreio inválido' }, 400);
  if (name.length < 3) return json({ error: 'Nome incompleto' }, 400);
  if (!isPhone(phone)) return json({ error: 'Telefone inválido' }, 400);
  if (!businessType) return json({ error: 'Segmento obrigatório' }, 400);

  try {
    // Liga ao cadastro do cofre quando o telefone bate — assim a mesma pessoa
    // não vira dois registros desconectados na base.
    let leadId: string | null = null;
    const digits = phoneDigits(phone);
    if (digits.length >= 10) {
      const matches = await dbSelect<LeadRow>(
        'leads',
        `select=id&phone=ilike.*${digits.slice(-8)}*&limit=1`,
      );
      leadId = matches[0]?.id ?? null;
    }

    const [booking] = await dbInsert<BookingRow>('bookings', {
      tracking_id: trackingId,
      full_name: name,
      phone,
      business_type: businessType,
      lead_id: leadId,
      status: 'clicked',
    });

    // O e-mail só existe se o telefone casou com alguém do cofre — o modal
    // de agendamento não pede e-mail. Quando não casa, o campo fica vazio
    // até o Calendly informar na sincronização.
    const leadEmail = leadId ? await emailDoLead(leadId) : null;

    const description = [
      `**Contato:** ${phone}`,
      `**Segmento:** ${businessType}`,
      `**Origem:** site — clicou em Marcar Reunião`,
      `**Já estava na lista do cofre:** ${leadId ? 'sim' : 'não'}`,
      '',
      `_Aguardando conclusão no Calendly. O status muda sozinho quando concluir._`,
      `\`rastreio: ${trackingId}\``,
    ].join('\n');

    // Os dropdowns vão no payload de criação: valor é ID de opção, não tem
    // como o ClickUp recusar. Telefone e e-mail vão DEPOIS, um a um, porque
    // são texto validado pelo ClickUp — um formato recusado no payload de
    // criação derruba o card inteiro, e perder o card é muito pior que
    // perder um campo.
    const task = await createClickUpTask({
      name: `${name} — ${businessType}`,
      description,
      status: CLICKUP_STATUS.oportunidade,
      customFields: [
        { id: CLICKUP_FIELD.status, value: CLICKUP_OPTION.statusAtivo },
        { id: CLICKUP_FIELD.empresa, value: empresaOptionId() },
      ],
    });

    await dbUpdate('bookings', `id=eq.${booking.id}`, { clickup_task_id: task.id });

    // setClickUpField engole a falha e segue: campo vazio é incômodo,
    // card ausente é lead perdido.
    const e164 = toE164BR(phone);
    if (e164) await setClickUpField(task.id, CLICKUP_FIELD.whatsapp, e164);
    if (leadEmail) await setClickUpField(task.id, CLICKUP_FIELD.email, leadEmail);

    return json({ ok: true, taskUrl: task.url });
  } catch (error) {
    // A aba do Calendly já abriu no cliente. Falha aqui custa o card, não a reunião.
    console.error('Falha ao registrar pré-agendamento:', error);
    return json({ error: 'Falha ao registrar' }, 500);
  }
}
