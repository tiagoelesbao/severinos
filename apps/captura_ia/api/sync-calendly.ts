/**
 * POST|GET /api/sync-calendly — reconcilia agendamentos do Calendly.
 *
 * Substitui o webhook. O webhook do Calendly exige plano Standard; a LEITURA
 * de eventos funciona no plano gratuito, então em vez de esperar o Calendly
 * nos avisar, a gente vai perguntar.
 *
 * O que faz:
 *   1. Lista os eventos agendados da organização na janela de interesse.
 *   2. Para cada evento, lê os convidados e pega o rastreio que mandamos na
 *      URL da agenda (tracking.salesforce_uuid / utm_content).
 *   3. Casa com a linha de bookings e move o card no ClickUp.
 *
 * Protegido por CRON_SECRET: o endpoint é público e sem isso qualquer um
 * dispararia a sincronização.
 */
import {
  json,
  dbSelect,
  dbUpdate,
  setClickUpStatus,
  setClickUpDescription,
  setClickUpField,
  setClickUpDate,
  commentOnClickUpTask,
  CLICKUP_STATUS,
  CLICKUP_FIELD,
  isUuid,
} from './_shared.js';

export const config = { runtime: 'edge' };

const CALENDLY_API_TOKEN = process.env.CALENDLY_API_TOKEN ?? '';
const CRON_SECRET = process.env.CRON_SECRET ?? '';

/**
 * Limites pensados para rodar de 5 em 5 minutos.
 *
 * O custo real desta rotina não é o nosso banco — é a API do Calendly: cada
 * evento na janela exige uma chamada extra para ler os convidados. Então a
 * janela é a menor possível e a rotina desiste de quem clicou e nunca agendou.
 */
const DAYS_AHEAD = 120;
/** Depois disso, quem clicou e não agendou é lista de recuperação, não de sync. */
const PENDING_TTL_DAYS = 7;
/** Teto por execução, para uma fila anormal não estourar o limite do Calendly. */
const MAX_EVENTS_PER_RUN = 60;

interface BookingRow {
  id: string;
  tracking_id: string;
  full_name: string;
  phone: string;
  business_type: string;
  clickup_task_id: string | null;
  status: string;
  created_at: string;
}

/**
 * Reescreve a descrição do card. Sem isso ela continua dizendo "aguardando
 * conclusão no Calendly" enquanto o status já diz "reunião agendada" — a
 * contradição na tela confunde mais do que a informação ajuda.
 */
function descricaoConfirmada(b: BookingRow, quando: string, meet: string | null, email: string | null) {
  return [
    `**Contato:** ${b.phone}`,
    `**Segmento:** ${b.business_type}`,
    email ? `**E-mail:** ${email}` : '',
    `**Origem:** site — clicou em Marcar Reunião`,
    '',
    `**Reunião confirmada para:** ${quando}`,
    meet ? `**Link:** ${meet}` : '',
    '',
    `\`rastreio: ${b.tracking_id}\``,
  ]
    .filter(Boolean)
    .join('\n');
}

async function calendly(path: string) {
  const response = await fetch(path.startsWith('http') ? path : `https://api.calendly.com${path}`, {
    headers: { authorization: `Bearer ${CALENDLY_API_TOKEN}` },
  });

  if (!response.ok) {
    throw new Error(`Calendly ${response.status}: ${(await response.text()).slice(0, 200)}`);
  }

  return response.json();
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
  // Aceita o header do Vercel Cron ou Authorization: Bearer <CRON_SECRET>.
  const auth = request.headers.get('authorization') ?? '';
  if (!CRON_SECRET || auth !== `Bearer ${CRON_SECRET}`) {
    return json({ error: 'Não autorizado' }, 401);
  }

  if (!CALENDLY_API_TOKEN) {
    return json({ error: 'CALENDLY_API_TOKEN ausente' }, 500);
  }

  try {
    // Só quem clicou em agendar, ainda não foi movido, e clicou há pouco tempo.
    // O corte por idade é o que impede a rotina de varrer o Calendly para
    // sempre por causa de um lead que clicou uma vez em março e sumiu.
    const cutoff = new Date(Date.now() - PENDING_TTL_DAYS * 86400_000).toISOString();
    const pending = await dbSelect<BookingRow>(
      'bookings',
      'select=id,tracking_id,full_name,phone,business_type,clickup_task_id,status,created_at' +
        `&status=eq.clicked&created_at=gte.${cutoff}&order=created_at.asc&limit=200`,
    );

    // Caminho barato: sem ninguém pendente, uma consulta ao nosso banco e acabou.
    // Nenhuma chamada ao Calendly, nenhuma ao ClickUp. É o caso da maior parte
    // das execuções quando se roda de 5 em 5 minutos.
    if (!pending.length) {
      return json({ ok: true, pendentes: 0, movidos: 0, cancelados: 0, chamadasCalendly: 0 });
    }

    const byTracking = new Map(pending.map((b) => [b.tracking_id, b]));

    let chamadasCalendly = 1;
    const me = await calendly('/users/me');
    const organization: string = me.resource.current_organization;

    // Ninguém agenda para o passado: o piso da janela é o clique mais antigo
    // que ainda está pendente, não uma quantidade fixa de dias.
    const minStart = pending[0].created_at;
    const maxStart = new Date(Date.now() + DAYS_AHEAD * 86400_000).toISOString();

    let movidos = 0;
    let cancelados = 0;
    let eventosLidos = 0;
    let next: string | null =
      `/scheduled_events?organization=${encodeURIComponent(organization)}` +
      `&min_start_time=${encodeURIComponent(minStart)}` +
      `&max_start_time=${encodeURIComponent(maxStart)}&count=100`;

    while (next && byTracking.size > 0 && eventosLidos < MAX_EVENTS_PER_RUN) {
      const page = await calendly(next);
      chamadasCalendly += 1;

      for (const event of page.collection ?? []) {
        // Já casou tudo que estava pendente — para de gastar chamada.
        if (byTracking.size === 0 || eventosLidos >= MAX_EVENTS_PER_RUN) break;
        eventosLidos += 1;
        chamadasCalendly += 1;
        // O rastreio vive no convidado, não no evento.
        const invitees = await calendly(`${event.uri}/invitees`);

        for (const invitee of invitees.collection ?? []) {
          const trackingId: string = (
            invitee?.tracking?.salesforce_uuid ||
            invitee?.tracking?.utm_content ||
            ''
          ).trim();

          if (!isUuid(trackingId)) continue;

          const booking = byTracking.get(trackingId);
          if (!booking) continue;

          const canceled = event.status === 'canceled' || invitee.status === 'canceled';

          if (canceled) {
            await dbUpdate('bookings', `id=eq.${booking.id}`, {
              status: 'canceled',
              canceled_at: new Date().toISOString(),
              calendly_event_uri: event.uri,
            });

            if (booking.clickup_task_id) {
              await setClickUpStatus(booking.clickup_task_id, CLICKUP_STATUS.followups);
              await commentOnClickUpTask(
                booking.clickup_task_id,
                `⚠️ Agendamento cancelado no Calendly. Movido para FOLLOWUPS — vale uma retomada.`,
              );
            }

            cancelados += 1;
          } else {
            await dbUpdate('bookings', `id=eq.${booking.id}`, {
              status: 'scheduled',
              scheduled_at: event.start_time ?? new Date().toISOString(),
              calendly_event_uri: event.uri,
              canceled_at: null,
            });

            if (booking.clickup_task_id) {
              const meetUrl: string | null = event?.location?.join_url ?? null;
              const inviteeEmail: string | null = invitee?.email ?? null;
              const quando = formatDateTime(event.start_time);

              await setClickUpStatus(booking.clickup_task_id, CLICKUP_STATUS.reuniaoAgendada);

              if (event.start_time) {
                await setClickUpDate(
                  booking.clickup_task_id,
                  CLICKUP_FIELD.agendamento,
                  event.start_time,
                );
              }
              if (meetUrl) {
                await setClickUpField(booking.clickup_task_id, CLICKUP_FIELD.meeting, meetUrl);
              }
              if (inviteeEmail) {
                await setClickUpField(booking.clickup_task_id, CLICKUP_FIELD.email, inviteeEmail);
              }

              await setClickUpDescription(
                booking.clickup_task_id,
                descricaoConfirmada(booking, quando, meetUrl, inviteeEmail),
              );

              await commentOnClickUpTask(
                booking.clickup_task_id,
                [
                  `✅ Reunião confirmada no Calendly.`,
                  `**Quando:** ${formatDateTime(event.start_time)}`,
                  event?.location?.join_url
                    ? `**Link:** ${event.location.join_url}`
                    : `**Link:** enviado por e-mail pelo Calendly`,
                  invitee?.email ? `**E-mail informado:** ${invitee.email}` : '',
                ]
                  .filter(Boolean)
                  .join('\n'),
              );
            }

            movidos += 1;
          }

          byTracking.delete(trackingId);
        }
      }

      next = page.pagination?.next_page ?? null;
    }

    return json({
      ok: true,
      pendentes: pending.length,
      movidos,
      cancelados,
      aindaPendentes: byTracking.size,
      eventosLidos,
      chamadasCalendly,
    });
  } catch (error) {
    console.error('Falha na sincronização com o Calendly:', error);
    return json({ error: String(error).slice(0, 300) }, 500);
  }
}
