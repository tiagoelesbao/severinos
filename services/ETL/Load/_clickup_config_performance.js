/**
 * Config compartilhada do espaço "Performance & Growth" (Meta Ads) no
 * workspace Oraclum — mesmo workspace de _clickup_config.js (90131882266),
 * Space "Marketing" (901312175004), folder "Performance & Growth" diferente
 * da "Produção de Conteúdo". IDs descobertos via leitura direta da API em
 * 2026-10-04 (GET /team, /space/{id}/folder, /list/{id}/field).
 *
 * Usado por sync-meta-kickoff-to-clickup.js.
 */

const WORKSPACE_ID = '90131882266'; // mesmo workspace de _clickup_config.js
const PERFORMANCE_GROWTH_FOLDER = '901317466678';

const GESTAO_DE_CAMPANHAS_LIST = '901325936644';
const PROCESSO_DE_OTIMIZACAO_LIST = '901325936638';
const GESTAO_DE_INVESTIMENTOS_LIST = '901325936642';
const TRACKEAMENTO_DASHBOARDS_LIST = '901325936637';
const LABORATORIO_DE_CRIATIVOS_LIST = '901325936634';

// Campo pré-existente em Gestão de Campanhas (criado pelo founder antes
// deste trabalho) — opções genéricas de conta de anúncio de outros
// clientes (CA01/CA02/ASV01-05/INIT01). A API do ClickUp não expõe edição
// de opções de um dropdown já existente (PUT/POST em /field/{id} -> 405) —
// adicionar "Império Prêmios" aqui é AÇÃO MANUAL do founder na UI (1 clique:
// campo Conta de Anúncio > editar > nova opção). Até lá, deixar sem valor.
const CONTA_DE_ANUNCIO_FIELD_ID = '2032379f-6a9c-4cbc-a89a-b7158a8eb220';
const CONTA_DE_ANUNCIO_OPTION = {
    'imperio-premios': null, // pendente — ver nota acima
};

// "Cliente" (dropdown) — campo NOVO criado em Gestão de Campanhas em
// 2026-10-04 (tentativa de reanexar o campo já existente em Laboratório de
// Criativos falhou: a API cria um campo novo mesmo com name+type
// idênticos, diferente do comportamento documentado para campos tipo url
// em _clickup_config.js — gotcha específico de dropdown, ECODE FIELD_022).
// Resultado é funcionalmente equivalente: campo próprio desta lista, já
// com as mesmas opções (incluindo "Império Prêmios").
const CLIENTE_FIELD_ID = '1a9cd0f7-438d-4341-9ab3-e94305abb330';
const CLIENTE_OPTION = {
    'imperio-premios': '81b333d5-2c4f-4cd4-b79e-114cfe392d5a', // "Império Prêmios"
};

// "Gate Status" (dropdown) — campo NOVO, criado em Gestão de Campanhas em
// 2026-10-04 especificamente para refletir o resumo de gates-status.yaml.
const GATE_STATUS_FIELD_ID = '35c7e09f-d94d-48d1-92f0-db3fd2cccd50';
const GATE_STATUS_OPTION = {
    bloqueado: '922e7def-2d19-4d09-a0a5-57524c5bde02',
    pendente: 'c7cb0e04-9602-4776-9da2-d956bf5bda0c',
    liberado_com_ressalvas: '6bef7d6d-d9cb-404e-8898-73bd8b17a27e',
    liberado: 'd80cc83c-b5d5-4bff-b86b-8c094ca47bde',
};

// "Link Brief" (url) — campo NOVO, aponta pro brief.yaml do cliente (via
// link do repositório ou caminho local, conforme preferência do founder).
const LINK_BRIEF_FIELD_ID = 'cc13e925-e60f-403c-944e-a0b2d61f1b8c';

module.exports = {
    WORKSPACE_ID,
    PERFORMANCE_GROWTH_FOLDER,
    GESTAO_DE_CAMPANHAS_LIST,
    PROCESSO_DE_OTIMIZACAO_LIST,
    GESTAO_DE_INVESTIMENTOS_LIST,
    TRACKEAMENTO_DASHBOARDS_LIST,
    LABORATORIO_DE_CRIATIVOS_LIST,
    CONTA_DE_ANUNCIO_FIELD_ID,
    CONTA_DE_ANUNCIO_OPTION,
    CLIENTE_FIELD_ID,
    CLIENTE_OPTION,
    GATE_STATUS_FIELD_ID,
    GATE_STATUS_OPTION,
    LINK_BRIEF_FIELD_ID,
};
