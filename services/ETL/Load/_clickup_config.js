/**
 * Config compartilhada do pipeline Marketing ↔ ClickUp — IDs fixos do
 * workspace (90131882266) usados por create-lote-de-conteudos.js,
 * sync-benchmark-to-clickup.js, approve-lote.js e run-planning-modeling.js.
 * Único lugar pra atualizar se um field/list/option mudar no ClickUp.
 */

const WORKSPACE_ID = '90131882266';
const MAQUINA_DE_IDEIAS_LIST = '901323880800';
const PLANEJAMENTOS_LIST = '901323880825';
const COPYWRITING_LIST = '901323880831';
const DESIGN_CRIACAO_LIST = '901323855100';
const AGENDAMENTO_LIST = '901323880843';

const EMPRESA_FIELD_ID = '4b05a41b-423f-46c4-8a43-87c039eca0e7'; // mesmo field/id nas duas lists
const EMPRESA_OPTION = {
    virals: '3166c944-6ac1-4041-b2c8-2b7afebfad35',        // VIRALS
    oraclum: 'e377fd4d-37cf-45ca-8399-cd8b9d125331',       // Oraclum (genérico)
    'tiago-elesbao': 'fea99c82-83c5-4b82-b2f9-38d306475a89', // "Pessoal" — não há opção dedicada
};

// "Pack de Análise" — criado em Máquina de Idéias, DEPOIS também anexado a
// Planejamento & Cronogramas via POST /list/{id}/field com mesmo name+type.
// ClickUp devolveu o MESMO id/date_created nos dois — confirma que o campo é
// da Space (Marketing), não da List: "criar" num 2º list só ANEXA o campo já
// existente, e os valores dos tasks que migraram voltam a aparecer sozinhos
// (não tinham sumido, só ficavam ocultos por o campo não estar habilitado
// naquela list). Gotcha bom: pra herdar um custom field entre lists de uma
// mesma Space, não precisa recuperar/copiar valor manualmente — só reanexar.
const PACK_FIELD_ID = 'f173f128-44dd-41f2-8eff-fcb46c4e7475'; // "Pack de Análise" (url) — Máquina de Idéias + Planejamento & Cronogramas
const PLANO_MODELAGEM_FIELD_ID = '74a4f42a-c81d-43eb-bc40-86f22a8e0328'; // "Plano de Modelagem" (url) — Planejamento & Cronogramas
const COPY_FIELD_ID = 'aa913124-190c-44d6-a50b-6cb705fd61bc'; // "Copy & Direcionamento" (url) — Processo de Copywriting + Design e Criação + Agendamento
const CAPTION_FIELD_ID = '3f4f264d-f638-43e6-9107-4312cec79251'; // "Descrição & Hashtags" (text) — Design e Criação + Agendamento

// "Copywriter" (users) em Planejamento & Cronogramas — GATILHO da automação
// nativa do ClickUp que decide o próximo destino ao mudar status pra
// "planejamento finalizado": se preenchido (= TE) → Automation #1 → move pra
// Processo de Copywriting; se vazio → Automation #2 → PULA copy e vai direto
// pra Processo de Design e Criação. Confirmado 2026-08-17 (founder viu o
// Lote 03 seguir escondido sem passar por copy corretamente porque o campo
// não estava setado antes do status mudar). Tem que setar ANTES/JUNTO da
// mudança de status, não depois — a automação lê o valor no momento do
// trigger.
const COPYWRITER_FIELD_ID = '7b4764aa-b62e-4b3c-bf0c-404ce9f93786';
const FOUNDER_USER_ID = 61023009; // Tiago Elesbão

// "Designer" (users) em Processo de Copywriting — MESMO padrão do
// COPYWRITER_FIELD_ID acima, um gatilho a mais na cadeia: status ->
// "copy finalizada" tem 2 automações concorrentes — Designer preenchido →
// Processo de Design e Criação (certo); vazio → PULA design e vai direto
// pra Agendamento, Publicações & Disparos. Confirmado 2026-08-17.
const DESIGNER_FIELD_ID = '3dd10fad-f8b6-47a6-80ab-597d850f6888';

// "Gestor de Tráfego" (users) em Processo de Design e Criação — MESMO padrão
// de novo, mas aqui o founder decidiu deixar sempre vazio: confirmado
// 2026-08-18, sem tráfego pago ativo no momento, então Automation #1 (campo
// "Não está configurado") é o único caminho usado — move direto pra
// Agendamento, Publicações & Disparos, status "para agendar". Automation #2
// (campo = TE) manda pra uma lista privada de teste de tráfego pago,
// caminho que não se aplica hoje. approve-design-creative.js NÃO seta esse
// campo de propósito — deixar vazio É o comportamento certo aqui.
const GESTOR_TRAFEGO_FIELD_ID = '52fda770-6de2-48ca-afd8-723fc5202b85';

// "Pack de Criativos Aprovados" (attachment) — criado 2026-08-18 em Processo
// de Design e Criação, pra dar visualização de relance (thumbnail inline +
// galeria nativa) do pack final na list de Agendamento. Testado com vídeo
// misturado com imagem no mesmo pack (slide trocado por vídeo manualmente em
// outputs/): ordem do array é preservada, vídeo abre com player funcional.
// GOTCHA: subir vídeo pra esse campo via API v3 (/custom_fields/{id}/attachments)
// EXIGE Content-Type explícito no Blob (ex.: "video/mp4") — sem isso a API
// devolve 500 pra vídeo (imagem sobe igual sem MIME, então o bug passa
// despercebido até alguém tentar um pack com vídeo de verdade).
const PACK_CRIATIVOS_APROVADOS_FIELD_ID = 'f4241de8-4f9a-4057-b6f1-9ffbc63717fd';

// "Link da Publicação" (url) — criado 2026-08-18 em Agendamento, Publicações
// & Disparos (IG-03). Populado automaticamente pelo publish-instagram.js
// depois de um publish bem-sucedido.
const LINK_PUBLICACAO_FIELD_ID = '547241fb-a7e7-4698-86f7-54f4363b2715';
// "Data da Publicação" (date) — já existia na list antes deste épico; usado
// pela IG-04 pra saber QUANDO disparar o publish agendado.
const DATA_PUBLICACAO_FIELD_ID = '930b2a09-ee06-4a2a-be99-e70a29526be2';

const TASK_TYPE_NAMES = {
    0: '(sem tipo)', 1005: 'Vídeo Curto', 1006: 'Vídeo Longo', 1007: 'Planejamento',
    1020: 'Carrocel', 1021: 'Post', 1022: 'Post de Texto',
};

// Pasta {Cliente}/Marketing/Produção de Conteúdo/ no Drive — onde as
// subpastas de Lote/planejamento são criadas. Calibração 2026-08-17: raiz do
// cliente sozinha ia virar bagunça com Lotes subsequentes; criado 1 nível de
// organização (Marketing → Produção de Conteúdo) dentro da pasta raiz de cada
// cliente (que continua existindo, só não é mais o destino direto dos Lotes).
const CLIENT_DRIVE_FOLDER = {
    oraclum: '1QCcuLNXIi_8eb4mz87L8-C9wILv_aE4t',        // Oraclum/Marketing/Produção de Conteúdo
    virals: '195yhogpqv72Rj0ljpFG3-NKXIkly6jFW',         // Virals/Marketing/Produção de Conteúdo
    'tiago-elesbao': '10BCTXiqKavqwatHUDpnRGYHelkdj6RR3', // Tiago Elesbão/Marketing/Produção de Conteúdo
};

module.exports = {
    WORKSPACE_ID, MAQUINA_DE_IDEIAS_LIST, PLANEJAMENTOS_LIST, COPYWRITING_LIST, DESIGN_CRIACAO_LIST, AGENDAMENTO_LIST,
    EMPRESA_FIELD_ID, EMPRESA_OPTION, PACK_FIELD_ID, PLANO_MODELAGEM_FIELD_ID, COPY_FIELD_ID, CAPTION_FIELD_ID,
    COPYWRITER_FIELD_ID, DESIGNER_FIELD_ID, GESTOR_TRAFEGO_FIELD_ID, PACK_CRIATIVOS_APROVADOS_FIELD_ID, FOUNDER_USER_ID,
    LINK_PUBLICACAO_FIELD_ID, DATA_PUBLICACAO_FIELD_ID,
    TASK_TYPE_NAMES, CLIENT_DRIVE_FOLDER,
};
