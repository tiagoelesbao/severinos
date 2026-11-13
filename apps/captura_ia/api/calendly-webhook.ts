/**
 * POST /api/calendly-webhook — eventos do Calendly.
 *
 * invitee.created  → card vai para REUNIÃO AGENDADA, com data e link no comentário
 * invitee.canceled → card volta para FOLLOWUPS
 *
 * A assinatura é verificada antes de qualquer coisa: este endpoint é público e
 * sem verificação qualquer um moveria cards no seu pipeline.
 *
 * ATENÇÃO — assinatura de webhook no Calendly exige plano pago. Se o seu plano
 * não tiver, este arquivo fica inerte e os cards param em OPORTUNIDADE.
 */
import {
  json,
  dbSelect,
  dbUpdate,
  setClickUpStatus,
  commentOnClickUpTask,
  CLICKUP_STATUS,
  isUuid,
} from './_shared.js';

// Runtime Edge: a assinatura do handler é Web-standard (Request → Response),
// que é o que este arquivo implementa. No runtime Node o Vercel invoca com
// (req, res) e o Response retornado é ignorado — a requisição pendura até
// o timeout. O webhook também depende do Edge para ler o corpo cru
// (request.text()) e validar o HMAC byte a byte.
export const config = { runtime: 'edge' };

const SIGNING_KEY = process.env.CALENDLY_WEBHOOK_SIGNING_KEY ?? '';

interface BookingRow {
  id: string;
  clickup_task_id: string | null;
  status: string;
}

/**
 * Cabeçalho: `Calendly-Webhook-Signature: t=<timestamp>,v1=<hmac>`
 * A base assinada é `<timestamp>.<corpo cru>` com HMAC-SHA256.
 */
async function signatureIsValid(rawBody: string, header: string | null): Promise<boolean> {
  if (!SIGNING_KEY || !header) return false;

  const parts = Object.fromEntries(
    header.split(',').map((piece) => {
      const [key, ...rest] = piece.trim().split('=');
      return [key, rest.join('=')];
    }),
  );

  const timestamp = parts.t;
  const received = parts.v1;
  if (!timestamp || !received) return false;

  // Janela de 5 minutos contra reenvio de requisição capturada.
  const ageSeconds = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(ageSeconds) || ageSeconds > 300) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(SIGNING_KEY),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${rawBody}`));
  const expected = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

  // Comparação de tempo constante.
  if (expected.length !== received.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) {
    diff |= expected.charCodeAt(i) ^ received.charCodeAt(i);
  }
  return diff === 0;
}

function formatDateTime(iso: string | undefined): string {
  if (!iso) return 'horário não informado';
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'full',
      timeStyle: 'short',
      timeZone: 'America/Sao_Paulo',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return json({ error: 'Método não permitido' }, 405);
  }

  const rawBody = await request.text();

  if (!(await signatureIsValid(rawBody, request.headers.get('calendly-webhook-signature')))) {
    return json({ error: 'Assinatura inválida' }, 401);
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return json({ error: 'Corpo inválido' }, 400);
  }

  const kind: string = event?.event ?? '';
  const p = event?.payload ?? {};

  // O rastreio volta no bloco de tracking do Calendly. Aceitamos os dois campos
  // que o Calendly repassa, porque qual deles está livre depende do formulário.
  const trackingId: string = (p?.tracking?.salesforce_uuid || p?.tracking?.utm_content || '').trim();

  if (!isUuid(trackingId)) {
    // Agendamento que não veio do nosso modal (link direto, indicação).
    // Não é erro: respondemos 200 para o Calendly não ficar reenviando.
    return json({ ok: true, ignored: 'sem rastreio' });
  }

  const [booking] = await dbSelect<BookingRow>(
    'bookings',
    `select=id,clickup_task_id,status&tracking_id=eq.${trackingId}&limit=1`,
  );

  if (!booking) {
    return json({ ok: true, ignored: 'rastreio desconhecido' });
  }

  try {
    if (kind === 'invitee.created') {
      const startsAt: string | undefined = p?.scheduled_event?.start_time;
      const meetUrl: string | undefined = p?.scheduled_event?.location?.join_url;

      await dbUpdate('bookings', `id=eq.${booking.id}`, {
        status: 'scheduled',
        scheduled_at: startsAt ?? new Date().toISOString(),
        calendly_event_uri: p?.scheduled_event?.uri ?? null,
        canceled_at: null,
      });

      if (booking.clickup_task_id) {
        await setClickUpStatus(booking.clickup_task_id, CLICKUP_STATUS.reuniaoAgendada);
        await commentOnClickUpTask(
          booking.clickup_task_id,
          [
            `✅ Reunião confirmada no Calendly.`,
            `**Quando:** ${formatDateTime(startsAt)}`,
            meetUrl ? `**Link:** ${meetUrl}` : `**Link:** enviado por e-mail pelo Calendly`,
            p?.email ? `**E-mail informado:** ${p.email}` : '',
          ]
            .filter(Boolean)
            .join('\n'),
        );
      }

      return json({ ok: true, moved: CLICKUP_STATUS.reuniaoAgendada });
    }

    if (kind === 'invitee.canceled') {
      await dbUpdate('bookings', `id=eq.${booking.id}`, {
        status: 'canceled',
        canceled_at: new Date().toISOString(),
      });

      if (booking.clickup_task_id) {
        await setClickUpStatus(booking.clickup_task_id, CLICKUP_STATUS.followups);
        await commentOnClickUpTask(
          booking.clickup_task_id,
          [
            `⚠️ Reunião cancelada no Calendly.`,
            p?.cancellation?.reason ? `**Motivo:** ${p.cancellation.reason}` : '',
            `Movido para FOLLOWUPS — vale uma retomada.`,
          ]
            .filter(Boolean)
            .join('\n'),
        );
      }

      return json({ ok: true, moved: CLICKUP_STATUS.followups });
    }

    return json({ ok: true, ignored: `evento não tratado: ${kind}` });
  } catch (error) {
    console.error('Falha ao processar webhook do Calendly:', error);
    // 500 faz o Calendly reenviar — é o que queremos numa falha transitória.
    return json({ error: 'Falha ao processar' }, 500);
  }
}
