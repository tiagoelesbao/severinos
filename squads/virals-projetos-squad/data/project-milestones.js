/**
 * Dados de marcos (milestones) dos projetos internos "Starter & Growth".
 * Fonte de dados para scripts/create_milestones.js — substitui o antigo
 * parsing de Google Doc (Termo de Abertura), que era só-Virals e não
 * tinha equivalente para a Oraclum.
 *
 * Cada marco vira 1 Epic no ClickUp com 3 subtasks padrão (Setup/Execução/
 * QA & Entrega), a menos que `stories` customize esse conjunto.
 *
 * Conteúdo já refletido manualmente no ClickUp em 2026-08-16 — este arquivo
 * apenas codifica esse estado como dado versionado, para que o script seja
 * replayable (idempotente) e reutilizável caso o ciclo seja resetado de novo.
 */

const VIRALS_MILESTONES = {
  company: 'virals',
  projectTaskId: '86ag692nm', // task "Virals Starter & Growth" em Projetos Internos
  folderId: '901316668857', // folder "Virals Starter & Growth"
  listMapping: {
    'Fase 1': '901324798948', // Planejamento & Preparação
    'Fase 2': '901324798949', // Execução & Monitoramento
    'Fase 3': '901324798947', // Finalização & Encerramento
    'Fase 4': '901324798947',
    'Rotinas Operacionais': '901324798949'
  },
  phases: [
    {
      name: 'Fase 1',
      milestones: [
        {
          name: 'Brand Bible completa',
          dept: 'Marketing', owner: 'Tiago Elesbão', kpi: 'Documento aprovado com voz, tom e paleta',
          stories: [
            { name: '[Epic] Identidade Visual & Tom de Voz' },
            { name: '[Epic] Estruturação de Guidelines' }
          ]
        },
        {
          name: 'Banco de 50 hooks', dept: 'Marketing', owner: 'Squad Marketing', kpi: '50 hooks escritos e categorizados',
          stories: [
            { name: '[Epic] Research & Analysis' },
            { name: '[Epic] Copywriting Batch' }
          ]
        },
        {
          name: 'Setup YouTube + LinkedIn', dept: 'Marketing', owner: 'Tiago Elesbão', kpi: 'Perfis otimizados com SEO e visual',
          stories: [
            { name: '[Epic] Otimização de Perfis (SEO)' },
            { name: '[Epic] Ferramental & Automação' }
          ]
        },
        {
          name: 'POPs de produção', dept: 'Operações', owner: 'Squad Ops', kpi: '3 POPs documentados (gravação, edição, publicação)'
        },
        {
          name: 'Landing page de indicações', dept: 'Produto', owner: 'Squad Produto', kpi: 'Página live com tracking ativo'
        }
      ]
    },
    {
      name: 'Fase 2',
      milestones: [
        { name: 'Primeiro batch de 4 vídeos YouTube', dept: 'Marketing', owner: 'Tiago Elesbão', kpi: '4 vídeos publicados com CTR > 5%' },
        { name: 'Rotina diária LinkedIn ativa', dept: 'Marketing', owner: 'Tiago Elesbão', kpi: '20 posts publicados, 200+ conexões' },
        { name: 'Sistema de indicações v1 operacional', dept: 'Vendas', owner: 'Squad Vendas', kpi: '10 indicações recebidas' },
        { name: 'Dashboard de métricas configurado', dept: 'Operações', owner: 'Squad Ops', kpi: 'Dashboard com PQL, CTR, Leads' }
      ]
    },
    {
      name: 'Fase 3',
      milestones: [
        { name: 'Análise de resultados orgânicos', dept: 'Operações', owner: 'Squad Ops', kpi: 'Relatório com PQL, CAC orgânico, CTR médio' },
        { name: 'Decisão: escalar ou pivotar', dept: 'Projetos', owner: 'Tiago Elesbão', kpi: 'Go/No-Go para Ciclo 2 (Tráfego Pago)' },
        { name: 'Retrospectiva e ajustes', dept: 'Projetos', owner: 'Squad Projetos', kpi: 'Documento de lessons learned' }
      ]
    }
  ]
};

const ORACLUM_MILESTONES = {
  company: 'oraclum',
  projectTaskId: '86ak1bp6a', // task "Oraclum Starter & Growth" em Projetos Internos
  folderId: '901318772105', // folder "Oraclum Starter & Growth"
  listMapping: {
    'Fase 1': '901328197609', // Planejamento & Preparação
    'Fase 2': '901328197610', // Execução & Monitoramento
    'Fase 3': '901328197611', // Finalização & Encerramento
    'Fase 4': '901328197611',
    'Rotinas Operacionais': '901328197610'
  },
  phases: [
    {
      name: 'Fase 1',
      milestones: [
        {
          name: 'Guia de Marca Oraclum completo', dept: 'Marketing', owner: 'Tiago Elesbão',
          kpi: 'Documento aprovado com voz, tom e paleta (formalização do que já está em brand-identity.yaml / brand-config.yaml)',
          stories: [
            { name: '[Epic] Identidade Visual & Tom de Voz' },
            { name: '[Epic] Estruturação de Guidelines' }
          ]
        },
        {
          name: 'Banco de 50 hooks (conteúdo Oraclum)', dept: 'Marketing', owner: 'Squad Marketing',
          kpi: '50 hooks escritos e categorizados, ancorados nos 5 pilares de conteúdo',
          stories: [
            { name: '[Epic] Research & Analysis' },
            { name: '[Epic] Copywriting Batch' }
          ]
        },
        {
          name: 'Setup YouTube + LinkedIn (Oraclum)', dept: 'Marketing', owner: 'Tiago Elesbão',
          kpi: 'Perfis Oraclum otimizados com SEO e identidade visual (Obsidian + Purple)',
          stories: [
            { name: '[Epic] Otimização de Perfis (SEO)' },
            { name: '[Epic] Ferramental & Automação' }
          ]
        },
        {
          name: 'SOPs de entrega dos serviços Oraclum', dept: 'Operações', owner: 'Squad Ops',
          kpi: '5 SOPs documentados, um por core service (Oraclum X, AI Gen, AI Dev, Sales, Ops)'
        },
        {
          name: 'Sistema de indicação Oraclum (LP)', dept: 'Produto', owner: 'Squad Produto',
          kpi: 'Página live com tracking ativo'
        }
      ]
    },
    {
      name: 'Fase 2',
      milestones: [
        { name: 'Primeiro batch de 4 vídeos-tutorial de IA', dept: 'Marketing', owner: 'Tiago Elesbão', kpi: '4 vídeos-tutorial (pilar Tutoriais & Ferramentas Práticas) publicados com CTR > 5%' },
        { name: 'Rotina diária LinkedIn ativa', dept: 'Marketing', owner: 'Tiago Elesbão', kpi: '20 posts publicados (conteúdo Oraclum), 200+ conexões qualificadas' },
        { name: 'Sistema de indicações v1 operacional', dept: 'Vendas', owner: 'Squad Vendas', kpi: '10 indicações recebidas' },
        { name: 'Dashboard de métricas configurado', dept: 'Operações', owner: 'Squad Ops', kpi: 'Dashboard com PQL, CTR, Leads (mídia própria da Oraclum)' }
      ]
    },
    {
      name: 'Fase 3',
      milestones: [
        { name: 'Análise de resultados orgânicos', dept: 'Operações', owner: 'Squad Ops', kpi: 'Relatório com PQL, CTR médio e custo de aquisição orgânica' },
        { name: 'Decisão: escalar ou pivotar', dept: 'Projetos', owner: 'Tiago Elesbão', kpi: 'Go/No-Go para Ciclo 2 (expansão de serviços além do beta inicial)' },
        { name: 'Retrospectiva e ajustes', dept: 'Projetos', owner: 'Squad Projetos', kpi: 'Documento de lessons learned' }
      ]
    }
  ]
};

module.exports = { VIRALS_MILESTONES, ORACLUM_MILESTONES };
