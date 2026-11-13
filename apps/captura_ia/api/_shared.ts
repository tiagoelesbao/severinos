/**
 * Helpers compartilhados pelas funções serverless.
 *
 * Sem dependência de npm de propósito: tudo é `fetch` contra a API REST do
 * Supabase (PostgREST) e a API do ClickUp. Menos superfície para manter.
 */

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
// Mesmo nome usado por services/clickup: uma credencial só no repositório.
const CLICKUP_API_KEY = process.env.CLICKUP_API_KEY ?? '';
const CLICKUP_LIST_ID = process.env.CLICKUP_LIST_ID ?? '';

/**
 * Status do pipeline "Aplicação Direta" (lista 901324135434).
 * Em minúsculas porque é assim que a API do ClickUp devolve e espera —
 * a interface mostra em caixa alta, mas o valor armazenado é este.
 */
export const CLICKUP_STATUS = {
  oportunidade: 'oportunidade',
  reuniaoAgendada: 'reunião agendada',
  followups: 'followups',
} as const;

/**
 * Campos personalizados da lista. Os IDs são fixos por lista — se a lista
 * mudar, é aqui que se atualiza.
 *
 * Só entram os que dá para preencher com dado que a gente realmente tem.
 * SDR, Closer, Produtos Ofertados, Oportunidade e Faturamento ficam vazios
 * de propósito: são decisão comercial, não dado do formulário. Preencher
 * com chute seria pior que deixar em branco.
 */
export const CLICKUP_FIELD = {
  agendamento: '05ef2356-ac79-42e3-9bab-b2e07081e7c7', // date
  status: '4897d270-fe13-4bbc-8208-c9031ea45751', // drop_down
  empresa: '4b05a41b-423f-46c4-8a43-87c039eca0e7', // drop_down
  email: '53e5b1d9-ff2e-4710-9340-353d98bf6ac0', // email
  meeting: '603fa970-8814-4d15-a689-37f610a374e7', // url
  whatsapp: 'f8dc2dcb-ba7f-42c5-bcb3-38b25739335e', // phone
} as const;

export const CLICKUP_OPTION = {
  statusAtivo: 'eda6d8dd-a50d-43e0-99b3-7edd502066c4',
  statusInativo: 'd110fadc-6569-4cce-9fdc-85def6454c11',
  empresa: {
    'Oraclum ADS': '2d468c2c-8122-43e5-982c-98674db280bc',
    'Oraclum WA': '42228db3-60db-4f87-a29c-33b7c39a2c96',
    'Oraclum X': '5c428d61-1166-452b-9aac-5100263096a7',
    'Oraclum AI': '9f0c6abc-7c28-4439-8345-ae5ba1eaeddc',
    VIRALS: '3166c944-6ac1-4041-b2c8-2b7afebfad35',
    Pessoal: 'fea99c82-83c5-4b82-b2f9-38d306475a89',
  } as Record<string, string>,
};

/**
 * Qual marca o site alimenta. Configurável por variável de ambiente para
 * trocar sem mexer no código — o padrão é a leitura mais provável, já que
 * o cofre vende automação de conteúdo, anúncios e CRM com IA.
 */
export function empresaOptionId(): string {
  const nome = process.env.CLICKUP_EMPRESA ?? 'Oraclum AI';
  return CLICKUP_OPTION.empresa[nome] ?? CLICKUP_OPTION.empresa['Oraclum AI'];
}

export function assertEnv(vars: Record<string, string>) {
  const missing = Object.entries(vars)
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length) {
    throw new Error(`Variáveis de ambiente ausentes: ${missing.join(', ')}`);
  }
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

// ---------------------------------------------------------------------------
// Supabase (PostgREST)
// ---------------------------------------------------------------------------

async function supabase(path: string, init: RequestInit & { prefer?: string } = {}) {
  assertEnv({ SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: SUPABASE_SERVICE_KEY });

  const { prefer, ...rest } = init;
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...rest,
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'content-type': 'application/json',
      ...(prefer ? { prefer } : {}),
      ...(rest.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase ${response.status}: ${await response.text()}`);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export function dbInsert<T>(table: string, row: Record<string, unknown>): Promise<T[]> {
  return supabase(table, {
    method: 'POST',
    body: JSON.stringify(row),
    prefer: 'return=representation',
  });
}

/** Insere ou atualiza pela coluna de conflito informada. */
export function dbUpsert<T>(table: string, row: Record<string, unknown>, onConflict: string): Promise<T[]> {
  return supabase(`${table}?on_conflict=${onConflict}`, {
    method: 'POST',
    body: JSON.stringify(row),
    prefer: 'resolution=merge-duplicates,return=representation',
  });
}

export function dbSelect<T>(table: string, query: string): Promise<T[]> {
  return supabase(`${table}?${query}`, { method: 'GET' });
}

export function dbUpdate<T>(table: string, query: string, patch: Record<string, unknown>): Promise<T[]> {
  return supabase(`${table}?${query}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
    prefer: 'return=representation',
  });
}

// ---------------------------------------------------------------------------
// ClickUp
// ---------------------------------------------------------------------------

async function clickup(path: string, init: RequestInit = {}) {
  assertEnv({ CLICKUP_API_KEY });

  const response = await fetch(`https://api.clickup.com/api/v2${path}`, {
    ...init,
    headers: {
      authorization: CLICKUP_API_KEY,
      'content-type': 'application/json',
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`ClickUp ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

interface ClickUpTask {
  id: string;
  url: string;
}

export interface ClickUpCustomField {
  id: string;
  value: string | number;
}

export async function createClickUpTask(params: {
  name: string;
  description: string;
  status: string;
  customFields?: ClickUpCustomField[];
}): Promise<ClickUpTask> {
  assertEnv({ CLICKUP_LIST_ID });

  return clickup(`/list/${CLICKUP_LIST_ID}/task`, {
    method: 'POST',
    body: JSON.stringify({
      name: params.name,
      description: params.description,
      status: params.status,
      custom_fields: params.customFields ?? [],
    }),
  });
}

export function setClickUpStatus(taskId: string, status: string) {
  return clickup(`/task/${taskId}`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

export function setClickUpDescription(taskId: string, description: string) {
  return clickup(`/task/${taskId}`, {
    method: 'PUT',
    body: JSON.stringify({ description }),
  });
}

/**
 * Preenche um campo personalizado. Falha aqui não pode derrubar a rotina:
 * campo não preenchido é incômodo, card não movido é perda de lead.
 */
export async function setClickUpField(
  taskId: string,
  fieldId: string,
  value: string | number,
  options?: Record<string, unknown>,
) {
  try {
    await clickup(`/task/${taskId}/field/${fieldId}`, {
      method: 'POST',
      body: JSON.stringify(options ? { value, value_options: options } : { value }),
    });
    return true;
  } catch (error) {
    console.warn(`Campo ${fieldId} não preenchido na task ${taskId}:`, error);
    return false;
  }
}

/**
 * Campo de data com hora exata.
 *
 * Sem `value_options.time`, o ClickUp trata o valor como data solta e
 * renormaliza pelo fuso do workspace — na prática o horário chegou 4 horas
 * atrasado. Com a flag, o instante é gravado como enviado.
 */
export function setClickUpDate(taskId: string, fieldId: string, iso: string) {
  return setClickUpField(taskId, fieldId, new Date(iso).getTime(), { time: true });
}

export function commentOnClickUpTask(taskId: string, comment: string) {
  return clickup(`/task/${taskId}/comment`, {
    method: 'POST',
    body: JSON.stringify({ comment_text: comment, notify_all: false }),
  });
}

// ---------------------------------------------------------------------------
// Validação
// ---------------------------------------------------------------------------

export const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());

export function phoneDigits(value: string) {
  return value.replace(/\D/g, '');
}

/**
 * Normaliza para E.164, que é o que o campo de telefone do ClickUp aceita.
 * "11*****1948" e "(11) 9****-1948" viram "+5511*****1948".
 * Devolve null quando não dá para afirmar o formato — melhor campo vazio
 * que campo errado.
 */
export function toE164BR(value: string): string | null {
  const d = phoneDigits(value);
  if (d.length === 10 || d.length === 11) return `+55${d}`;
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) return `+${d}`;
  if (d.length >= 11 && d.length <= 15) return `+${d}`;
  return null;
}

export const isPhone = (value: string) => {
  const digits = phoneDigits(value);
  return digits.length >= 10 && digits.length <= 13;
};

export const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
