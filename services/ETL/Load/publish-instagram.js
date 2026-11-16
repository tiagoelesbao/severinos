#!/usr/bin/env node
/**
 * Publish Instagram — motor de publicação da IG-02 (EPIC-MKT-Instagram-Publishing).
 * Publica de verdade um criativo aprovado (task de Agendamento, Publicações &
 * Disparos) no Instagram via Graph API oficial — NUNCA Playwright, decisão de
 * arquitetura do founder 2026-08-18 (ToS-risk de automação de browser numa
 * conta de produção).
 *
 * Fonte de mídia: as URLs já subidas pro campo "Pack de Criativos Aprovados"
 * (ver PACK_CRIATIVOS_APROVADOS_FIELD_ID) — a API do Instagram exige URL
 * pública mesmo (ela cURLa a mídia no momento da publicação), e essas URLs do
 * ClickUp já são públicas e não expiram (`signed:false`, confirmado
 * 2026-08-18). Não existe hospedagem própria neste módulo de propósito.
 *
 * GOTCHA (IG-01): esta conta usa o caminho Instagram Login, não Facebook
 * Login — a API fica em `graph.instagram.com`, NÃO `graph.facebook.com`
 * (token IGAA... só funciona no host certo; testado e confirmado).
 *
 * Legenda: vem do campo "Descrição & Hashtags" (CAPTION_FIELD_ID) já
 * existente na task — não inventa outro lugar pra isso.
 *
 * SEGURANÇA: `publishToInstagram` é a ÚNICA função que escreve de verdade
 * (media_publish). Todo o resto (montar plano, criar containers) é
 * inspecionável antes de chegar lá — o CLI `publish` exige confirmação
 * explícita digitada antes de chamar `publishToInstagram`.
 *
 * Uso:
 *   node publish-instagram.js list <client>
 *   node publish-instagram.js preview <client> --task=<taskId>
 *   node publish-instagram.js publish <client> --task=<taskId>
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { spawnSync } = require('child_process');
const client = require('../../clickup/client');
const {
    AGENDAMENTO_LIST, EMPRESA_FIELD_ID, EMPRESA_OPTION,
    PACK_CRIATIVOS_APROVADOS_FIELD_ID, CAPTION_FIELD_ID,
    LINK_PUBLICACAO_FIELD_ID, DATA_PUBLICACAO_FIELD_ID,
} = require('./_clickup_config');

// Por clientSlug, mesmo padrão de CLIENT_DRIVE_FOLDER/EMPRESA_OPTION — só
// Oraclum configurada por ora (IG-01), generaliza quando houver 2º cliente.
// Dois modos de credencial (IG-04): `interactive` é o token do Instagram
// Login usado no publish manual (curto prazo, validade não confirmada);
// `scheduled` é o token de System User (não expira, `debug_token`
// confirmou `expires_at:0` — ver IG-01) usado pelo processo em background
// que dispara sozinho, sem founder no terminal pra renovar nada. Hosts
// diferentes: Instagram Login fala com graph.instagram.com, System User
// fala com graph.facebook.com — mesmo IG_BUSINESS_ACCOUNT_ID nos dois.
const IG_CREDENTIALS = {
    oraclum: {
        interactive: { accessToken: process.env.IG_ACCESS_TOKEN, apiBase: 'https://graph.instagram.com/v21.0' },
        scheduled: { accessToken: process.env.IG_ACCESS_TOKEN_SYSTEM_USER, apiBase: 'https://graph.facebook.com/v21.0' },
        businessAccountId: process.env.IG_BUSINESS_ACCOUNT_ID,
    },
};

function credentialsFor(clientSlug, mode = 'interactive') {
    const entry = IG_CREDENTIALS[clientSlug];
    const modeCreds = entry && entry[mode];
    if (!entry || !modeCreds || !modeCreds.accessToken || !entry.businessAccountId) {
        throw new Error(`sem credenciais do Instagram (modo "${mode}") configuradas pra "${clientSlug}" (ver IG-01, .env)`);
    }
    return { accessToken: modeCreds.accessToken, apiBase: modeCreds.apiBase, businessAccountId: entry.businessAccountId };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Retry em rate limit (429) e erro transitório do servidor (5xx) — mesmo
 * padrão adotado no resto do pipeline (services/clickup/client.js,
 * sync-creatives.js) depois do 429/500 real visto em produção 2026-08-18. */
async function igFetch(reqPath, { method = 'GET', params = {}, accessToken, apiBase = 'https://graph.instagram.com/v21.0' }, maxRetries = 3) {
    const url = new URL(`${apiBase}${reqPath}`);

    for (let attempt = 0; ; attempt++) {
        // BUG REAL DE PRODUÇÃO (2026-08-18, reproduzido 3x): reusar a MESMA
        // instância de URLSearchParams como body em mais de um fetch()
        // (ex.: numa retentativa) manda o corpo VAZIO na 2ª chamada — o
        // stream interno já foi consumido na 1ª. Sintoma enganoso: a API
        // devolve "The parameter image_url is required" mesmo com os
        // params corretos (confirmado com log de debug antes do fetch),
        // porque o body que efetivamente saiu na rede estava vazio.
        // Reconstruir a cada tentativa resolve — só acontecia quando a 1ª
        // tentativa batia 429/5xx e caía pra retry, por isso não aparecia
        // nos testes manuais (sempre passavam de primeira).
        const body = new URLSearchParams({ ...params, access_token: accessToken });
        const res = method === 'GET'
            ? await fetch(`${url}?${body}`)
            : await fetch(url, { method, body, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });

        const json = await res.json().catch(() => ({}));
        if (res.ok) return json;

        const retryable = res.status === 429 || (res.status >= 500 && res.status < 600);
        if (!retryable || attempt >= maxRetries) {
            const msg = (json.error && json.error.message) || res.statusText;
            throw new Error(`Instagram API (${reqPath}) falhou (${res.status}): ${msg}`);
        }
        await sleep(800 * 3 ** attempt);
    }
}

function isVideo(mimetype) {
    return /^video\//.test(mimetype || '');
}

/** Monta o plano de publicação a partir da task — pura o bastante pra testar
 * sem rede (recebe o objeto de custom_fields já buscado). */
function buildPublishPlan(customFields) {
    const packField = customFields.find((f) => f.id === PACK_CRIATIVOS_APROVADOS_FIELD_ID);
    const captionField = customFields.find((f) => f.id === CAPTION_FIELD_ID);

    const assets = (Array.isArray(packField && packField.value) ? packField.value : []).map((att) => ({
        url: att.url,
        title: att.title,
        type: isVideo(att.mimetype) ? 'video' : 'image',
    }));

    return {
        assets,
        caption: (captionField && captionField.value) || '',
        kind: assets.length === 0 ? 'none' : assets.length === 1 ? 'single' : 'carousel',
    };
}

async function fetchPublishPlan(taskId) {
    const res = await client.get(`/task/${taskId}`);
    return { task: res.data, plan: buildPublishPlan(res.data.custom_fields || []) };
}

function belongsToClient(task, clientSlug) {
    if (!clientSlug) return true;
    const empresaOptionId = EMPRESA_OPTION[clientSlug];
    if (!empresaOptionId) return true;
    const field = (task.custom_fields || []).find((cf) => cf.id === EMPRESA_FIELD_ID);
    if (!field || field.value == null) return false;
    const options = (field.type_config && field.type_config.options) || [];
    const selected = options.find((o) => o.orderindex === field.value);
    return !!selected && selected.id === empresaOptionId;
}

async function fetchAllTasks(listId) {
    let page = 0, tasks = [];
    while (true) {
        const res = await client.get(`/list/${listId}/task`, {
            params: { include_closed: true, subtasks: true, page },
        });
        tasks = tasks.concat(res.data.tasks);
        if (res.data.last_page || res.data.tasks.length === 0) break;
        page++;
    }
    return tasks;
}

/** Tasks prontas pra publicar: "para agendar" ou "agendado", com pack não
 * vazio (sem pack não há o que publicar — listar mesmo assim seria ruído). */
async function listPublishable(clientSlug) {
    const all = await fetchAllTasks(AGENDAMENTO_LIST);
    const candidates = all.filter((t) => ['para agendar', 'agendado'].includes(t.status.status) && belongsToClient(t, clientSlug));
    return candidates.map((t) => {
        const plan = buildPublishPlan(t.custom_fields || []);
        return {
            taskId: t.id, name: t.name, status: t.status.status,
            kind: plan.kind, assetCount: plan.assets.length, hasCaption: !!plan.caption,
        };
    });
}

/** Container de 1 item de imagem. `isCarouselItem` omite caption (só o
 * container PAI leva legenda).
 *
 * GOTCHA (visto em produção 2026-08-18): a doc oficial só menciona polling
 * de status pra VÍDEO, mas `media_publish` numa imagem logo após criar o
 * container falhou com "Media ID is not available" — o container de imagem
 * também precisa de um instante pra ficar pronto. Poll aqui também, mesmo
 * pra imagem, e desativa a "isenção" que a doc sugere. */
async function createImageContainer({ imageUrl, caption, isCarouselItem }, creds) {
    const params = { image_url: imageUrl };
    if (isCarouselItem) params.is_carousel_item = 'true';
    else if (caption) params.caption = caption;
    const res = await igFetch(`/${creds.businessAccountId}/media`, { method: 'POST', params, accessToken: creds.accessToken, apiBase: creds.apiBase });
    await pollContainerStatus(res.id, creds, { timeoutMs: 60000, intervalMs: 3000 });
    return res.id;
}

/** Container de vídeo — single vira Reels (media_type=REELS); item de
 * carrossel usa media_type=VIDEO.
 *
 * BUG REAL DE PRODUÇÃO (2026-08-18, reproduzido de forma 100%
 * determinística — não era flakiness): a doc resumida dizia "item de
 * carrossel não leva media_type", o que é verdade só pra IMAGEM. Vídeo
 * dentro de carrossel SEM media_type faz a Meta assumir imagem por padrão
 * e devolver o erro enganoso `"The parameter image_url is required"` —
 * mesmo com `video_url` presente e correto no payload (confirmado com log
 * de debug do body enviado). Sem `media_type=VIDEO` explícito, não tem
 * como funcionar. Debug de 30min gasto até isolar isso — os testes
 * manuais anteriores só cobriam o container de IMAGEM isoladamente, nunca
 * o de vídeo DENTRO de carrossel.
 *
 * Nos dois casos precisa de poll até status_code=FINISHED antes de
 * publicar/referenciar (docs oficiais: vídeo não fica pronto
 * instantaneamente). */
async function createVideoContainer({ videoUrl, caption, isCarouselItem }, creds) {
    const params = { video_url: videoUrl, media_type: isCarouselItem ? 'VIDEO' : 'REELS' };
    if (isCarouselItem) params.is_carousel_item = 'true';
    else if (caption) params.caption = caption;
    const res = await igFetch(`/${creds.businessAccountId}/media`, { method: 'POST', params, accessToken: creds.accessToken, apiBase: creds.apiBase });
    await pollContainerStatus(res.id, creds);
    return res.id;
}

async function pollContainerStatus(containerId, creds, { timeoutMs = 300000, intervalMs = 5000 } = {}) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const res = await igFetch(`/${containerId}`, { params: { fields: 'status_code' }, accessToken: creds.accessToken, apiBase: creds.apiBase });
        if (res.status_code === 'FINISHED') return;
        if (res.status_code === 'ERROR' || res.status_code === 'EXPIRED') {
            throw new Error(`container de vídeo ${containerId} falhou no processamento: ${res.status_code}`);
        }
        await sleep(intervalMs);
    }
    throw new Error(`container de vídeo ${containerId} não ficou pronto em ${timeoutMs / 1000}s (timeout)`);
}

async function createCarouselContainer({ childIds, caption }, creds) {
    const params = { media_type: 'CAROUSEL', children: childIds.join(',') };
    if (caption) params.caption = caption;
    const res = await igFetch(`/${creds.businessAccountId}/media`, { method: 'POST', params, accessToken: creds.accessToken, apiBase: creds.apiBase });
    // Mesmo gotcha do container de imagem/vídeo: o container PAI do
    // carrossel também passa por IN_PROGRESS antes de FINISHED. Sem isso,
    // media_publish falha com "Media ID is not available" (visto agora em
    // produção, mesmo erro que já tínhamos corrigido pro container simples).
    await pollContainerStatus(res.id, creds, { timeoutMs: 60000, intervalMs: 3000 });
    return res.id;
}

async function publishContainer(creationId, creds) {
    const res = await igFetch(`/${creds.businessAccountId}/media_publish`, {
        method: 'POST', params: { creation_id: creationId }, accessToken: creds.accessToken, apiBase: creds.apiBase,
    });
    return res.id;
}

async function getPermalink(mediaId, creds) {
    const res = await igFetch(`/${mediaId}`, { params: { fields: 'permalink' }, accessToken: creds.accessToken, apiBase: creds.apiBase });
    return res.permalink;
}

async function checkPublishingLimit(clientSlug, mode = 'interactive') {
    const creds = credentialsFor(clientSlug, mode);
    const res = await igFetch(`/${creds.businessAccountId}/content_publishing_limit`, {
        params: { fields: 'config,quota_usage' }, accessToken: creds.accessToken, apiBase: creds.apiBase,
    });
    return res.data[0];
}

/** ÚNICA função que de fato publica (media_publish real). Assume que a
 * confirmação já aconteceu antes de chamar isto — não pede confirmação
 * internamente, quem chama (o CLI) é responsável por isso. `mode` escolhe
 * a credencial: "interactive" (token curto, publish manual, founder no
 * terminal) ou "scheduled" (System User que não expira, usado pelo
 * processo em background da IG-04, sem ninguém pra renovar token). */
async function publishToInstagram(clientSlug, plan, mode = 'interactive') {
    const creds = credentialsFor(clientSlug, mode);
    if (plan.assets.length === 0) throw new Error('plano sem nenhum asset — nada pra publicar');

    let creationId;
    if (plan.kind === 'single') {
        const [asset] = plan.assets;
        creationId = asset.type === 'video'
            ? await createVideoContainer({ videoUrl: asset.url, caption: plan.caption, isCarouselItem: false }, creds)
            : await createImageContainer({ imageUrl: asset.url, caption: plan.caption, isCarouselItem: false }, creds);
    } else {
        const childIds = [];
        for (const asset of plan.assets) {
            const id = asset.type === 'video'
                ? await createVideoContainer({ videoUrl: asset.url, isCarouselItem: true }, creds)
                : await createImageContainer({ imageUrl: asset.url, isCarouselItem: true }, creds);
            childIds.push(id);
        }
        creationId = await createCarouselContainer({ childIds, caption: plan.caption }, creds);
    }

    const mediaId = await publishContainer(creationId, creds);
    const permalink = await getPermalink(mediaId, creds);
    return { mediaId, permalink };
}

/** IG-03: registra o resultado de um publish bem-sucedido na própria task —
 * status "publicado", link no campo novo, e comentário datado (mesmo padrão
 * de timeline usado no resto do pipeline). Chamado tanto pelo publish manual
 * quanto pelo disparo agendado (IG-04) — um só lugar escreve esse estado. */
async function recordPublished(taskId, { permalink }) {
    await client.put(`/task/${taskId}`, { status: 'publicado' });
    await client.post(`/task/${taskId}/field/${LINK_PUBLICACAO_FIELD_ID}`, { value: permalink });
    await client.post(`/task/${taskId}/comment`, {
        comment: [
            { text: '✅ Publicado no Instagram', attributes: { bold: true } },
            { text: ` — ${new Date().toISOString()}\n`, attributes: {} },
            { text: permalink, attributes: { link: permalink } },
        ],
        notify_all: false,
    });
}

/** Lê "Data da Publicação" (epoch ms em string, como todo campo date do
 * ClickUp) direto da task. */
function readScheduledDate(task) {
    const field = (task.custom_fields || []).find((f) => f.id === DATA_PUBLICACAO_FIELD_ID);
    if (!field || field.value == null) return null;
    return new Date(Number(field.value));
}

/** IG-04 v2: agenda via **Windows Task Scheduler** em vez de processo Node
 * dormindo — 2 motivos concretos pra essa troca (não é só "mais robusto" em
 * abstrato):
 *   1. `setTimeout` do Node usa inteiro de 32 bits pro delay — acima de
 *      ~24,8 dias (2147483647ms) o valor estoura e o timer dispara NA HORA
 *      em vez de esperar. Um processo dormindo nunca funcionaria pra
 *      agendamento "daqui a mais de 1 dia" pedido pelo founder (o caso de
 *      24,8 dias é o limite teórico, mas o risco começa bem antes disso
 *      dependendo de quanto o founder programar à frente).
 *   2. Processo destacado morre com o reboot da máquina — o SO nunca sabe
 *      que existia um compromisso pendente. O Task Scheduler é o SO
 *      guardando o compromisso, não o Node.
 *
 * `StartWhenAvailable=true` no XML cobre o caso de reboot/PC desligado na
 * hora exata: se o Windows perdeu o disparo, roda assim que a máquina
 * volta a ficar disponível, em vez de simplesmente pular pra sempre.
 * `LogonType=InteractiveToken` roda só quando o founder está com sessão
 * aberta — não guarda senha nenhuma (não seria aceitável automatizar isso).
 */
/** Escapa os 5 caracteres especiais de XML — sem isso qualquer path com "&"
 * (ou pior, o operador de redirect de shell que eu tentei usar na 1ª versão)
 * quebra o parser com "XML mal construído", erro visto em produção
 * 2026-08-18. Corrigido em 2 frentes: escapar tudo que entra no XML E não
 * depender de redirect de shell no Arguments (Exec do Task Scheduler roda
 * o Command direto via CreateProcess, não interpreta `>>`/`2>&1` — isso
 * nunca funcionaria mesmo com o XML bem formado). O log agora é escrito
 * pelo próprio processo Node via --log=, não por redirect externo. */
function escapeXml(str) {
    return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function buildTaskXml({ description, startBoundaryLocalIso, command, args, workingDirectory }) {
    return `<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo>
    <Description>${escapeXml(description)}</Description>
  </RegistrationInfo>
  <Triggers>
    <TimeTrigger>
      <StartBoundary>${escapeXml(startBoundaryLocalIso)}</StartBoundary>
      <Enabled>true</Enabled>
    </TimeTrigger>
  </Triggers>
  <Principals>
    <Principal id="Author">
      <LogonType>InteractiveToken</LogonType>
      <RunLevel>LeastPrivilege</RunLevel>
    </Principal>
  </Principals>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <StartWhenAvailable>true</StartWhenAvailable>
    <RunOnlyIfNetworkAvailable>true</RunOnlyIfNetworkAvailable>
    <AllowStartOnDemand>true</AllowStartOnDemand>
    <Enabled>true</Enabled>
    <ExecutionTimeLimit>PT1H</ExecutionTimeLimit>
  </Settings>
  <Actions Context="Author">
    <Exec>
      <Command>${escapeXml(command)}</Command>
      <Arguments>${escapeXml(args)}</Arguments>
      <WorkingDirectory>${escapeXml(workingDirectory)}</WorkingDirectory>
    </Exec>
  </Actions>
</Task>`;
}

/** Formato exigido pelo StartBoundary: local, sem timezone (o Task
 * Scheduler assume horário local da máquina quando não há offset). */
function toLocalIsoNoTz(date) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function scheduledTaskName(taskId, targetDate) {
    return `IGPublish_${taskId}_${targetDate.getTime()}`;
}

/** Registra a tarefa agendada no Windows via schtasks /create /xml — não
 * pede confirmação, quem chama já obteve ("AGENDAR" digitado). */
function registerScheduledPublish(clientSlug, taskId, targetDate) {
    const logDir = path.join(__dirname, '../../../.aiox/ig-schedule-logs');
    fs.mkdirSync(logDir, { recursive: true });
    const logPath = path.join(logDir, `${taskId}-${targetDate.getTime()}.log`);
    const taskName = scheduledTaskName(taskId, targetDate);

    const args = [__filename, 'run-scheduled', clientSlug, `--task=${taskId}`, `--taskname=${taskName}`, `--log=${logPath}`]
        .map((a) => `"${a}"`).join(' ');
    const xml = buildTaskXml({
        description: `Publicação Instagram agendada — ClickUp task ${taskId}`,
        startBoundaryLocalIso: toLocalIsoNoTz(targetDate),
        command: process.execPath,
        args,
        workingDirectory: __dirname,
    });

    const xmlPath = path.join(logDir, `${taskName}.xml`);
    fs.writeFileSync(xmlPath, '﻿' + xml, 'utf16le'); // BOM obrigatório pro schtasks aceitar UTF-16

    const res = spawnSync('schtasks', ['/create', '/tn', taskName, '/xml', xmlPath, '/f'], { encoding: 'utf8' });
    if (res.status !== 0) throw new Error(`schtasks /create falhou: ${res.stderr || res.stdout}`);

    return { taskName, xmlPath, logPath };
}

function unregisterScheduledPublish(taskName) {
    spawnSync('schtasks', ['/delete', '/tn', taskName, '/f'], { encoding: 'utf8' });
}

function askConfirmation(question) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => rl.question(question, (answer) => { rl.close(); resolve(answer); }));
}

function printPlanPreview(task, plan) {
    console.log(`\nTask: ${task.name} (${task.id})`);
    console.log(`Formato: ${plan.kind} (${plan.assets.length} arquivo(s))`);
    plan.assets.forEach((a, i) => console.log(`  ${i + 1}. [${a.type}] ${a.title} -> ${a.url}`));
    console.log(`Legenda:\n---\n${plan.caption || '(vazia)'}\n---`);
}

if (require.main === module) {
    require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });
    const [, , cmd, clientSlug, ...rest] = process.argv;

    (async () => {
        if (cmd === 'list') {
            console.log(JSON.stringify(await listPublishable(clientSlug), null, 2));
        } else if (cmd === 'preview' || cmd === 'publish') {
            const taskArg = rest.find((a) => a.startsWith('--task='));
            const taskId = taskArg && taskArg.replace('--task=', '');
            if (!taskId) { console.error(`Uso: node publish-instagram.js ${cmd} <client> --task=<taskId>`); process.exit(1); }

            const { task, plan } = await fetchPublishPlan(taskId);
            printPlanPreview(task, plan);
            if (plan.assets.length === 0) { console.log('\nSem pack aprovado nesta task — nada a publicar.'); return; }

            if (cmd === 'preview') return;

            const answer = await askConfirmation('\nDigite PUBLICAR (maiúsculo) pra confirmar a publicação real no Instagram: ');
            if (answer !== 'PUBLICAR') { console.log('Cancelado — nenhuma chamada de publicação foi feita.'); return; }

            const result = await publishToInstagram(clientSlug, plan, 'interactive');
            await recordPublished(taskId, result);
            console.log(JSON.stringify({ ok: true, ...result }, null, 2));
        } else if (cmd === 'schedule') {
            const taskArg = rest.find((a) => a.startsWith('--task='));
            const taskId = taskArg && taskArg.replace('--task=', '');
            if (!taskId) { console.error('Uso: node publish-instagram.js schedule <client> --task=<taskId>'); process.exit(1); }

            const { task, plan } = await fetchPublishPlan(taskId);
            printPlanPreview(task, plan);
            if (plan.assets.length === 0) { console.log('\nSem pack aprovado nesta task — nada a agendar.'); return; }

            const targetDate = readScheduledDate(task);
            if (!targetDate) { console.log('\nSem "Data da Publicação" preenchida nesta task — defina no ClickUp antes de agendar.'); return; }
            if (targetDate.getTime() <= Date.now()) { console.log(`\nData da Publicação (${targetDate.toLocaleString('pt-BR')}) já passou — publique manualmente com "publish" em vez de agendar.`); return; }

            console.log(`\nData da Publicação: ${targetDate.toLocaleString('pt-BR')} (em ${Math.round((targetDate - Date.now()) / 60000)} min)`);
            const answer = await askConfirmation('Digite AGENDAR (maiúsculo) pra confirmar o agendamento — vai publicar SOZINHO nessa hora, sem pedir confirmação de novo: ');
            if (answer !== 'AGENDAR') { console.log('Cancelado — nada foi agendado.'); return; }

            await client.put(`/task/${taskId}`, { status: 'agendado' });
            const { taskName, logPath } = registerScheduledPublish(clientSlug, taskId, targetDate);
            console.log(`\n✅ Agendado via Windows Task Scheduler ("${taskName}") — vai publicar às ${targetDate.toLocaleString('pt-BR')}.`);
            console.log(`Log: ${logPath}`);
            console.log('Sobrevive a fechar o terminal E a reboot da máquina (StartWhenAvailable) — se o PC estiver desligado na hora exata, publica assim que voltar a ligar/logar. Não tem limite de dias de antecedência.');
        } else if (cmd === 'run-scheduled') {
            // Comando INTERNO — disparado pelo Windows Task Scheduler na hora
            // exata (registerScheduledPublish), não pra uso manual direto. Sem
            // sleep aqui: quem controla o horário agora é o próprio Windows.
            const taskArg = rest.find((a) => a.startsWith('--task='));
            const nameArg = rest.find((a) => a.startsWith('--taskname='));
            const logArg = rest.find((a) => a.startsWith('--log='));
            const taskId = taskArg && taskArg.replace('--task=', '');
            const taskName = nameArg && nameArg.replace('--taskname=', '');
            const logFilePath = logArg && logArg.replace('--log=', '');
            if (!taskId) { console.error('run-scheduled exige --task= (uso interno)'); process.exit(1); }

            // Disparado pelo Task Scheduler, sem terminal visível pra ninguém
            // ler console.log — escreve em arquivo também quando --log= vier.
            const log = (...msg) => {
                const line = `[${new Date().toISOString()}] ${msg.join(' ')}`;
                console.log(line);
                if (logFilePath) fs.appendFileSync(logFilePath, line + '\n');
            };

            log('run-scheduled disparado pelo Task Scheduler: task', taskId);
            try {
                const { plan } = await fetchPublishPlan(taskId);
                if (plan.assets.length === 0) { log('sem pack — abortando, task não publicada.'); return; }

                const result = await publishToInstagram(clientSlug, plan, 'scheduled');
                await recordPublished(taskId, result);
                log('publicado com sucesso:', JSON.stringify(result));
            } catch (e) {
                // AC da IG-04: falha automática não pode ser silenciosa — sem
                // founder no terminal pra ver o log, o único lugar visível é a
                // própria task.
                log('FALHOU:', e.message);
                await client.post(`/task/${taskId}/comment`, {
                    comment: [
                        { text: '❌ Publicação automática FALHOU', attributes: { bold: true } },
                        { text: ` — ${new Date().toISOString()}\n${e.message}`, attributes: {} },
                    ],
                    notify_all: true,
                }).catch(() => {});
                throw e;
            } finally {
                // Tarefa de disparo único — não deixa lixo acumulando no
                // Agendador de Tarefas depois de executar (sucesso ou falha).
                if (taskName) unregisterScheduledPublish(taskName);
            }
        } else {
            console.error('Uso: node publish-instagram.js list <client>');
            console.error('     node publish-instagram.js preview <client> --task=<taskId>');
            console.error('     node publish-instagram.js publish <client> --task=<taskId>');
            console.error('     node publish-instagram.js schedule <client> --task=<taskId>');
            process.exit(1);
        }
    })().catch((e) => {
        console.error('ERRO:', e.message);
        process.exitCode = 1;
    });
}

module.exports = {
    buildPublishPlan, fetchPublishPlan, listPublishable, checkPublishingLimit,
    createImageContainer, createVideoContainer, createCarouselContainer,
    publishContainer, getPermalink, pollContainerStatus, publishToInstagram,
    recordPublished, readScheduledDate, registerScheduledPublish, unregisterScheduledPublish,
    buildTaskXml, toLocalIsoNoTz, scheduledTaskName,
};
