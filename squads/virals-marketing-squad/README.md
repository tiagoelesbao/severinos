# Virals Marketing Squad 🎯

> **Audiência, atenção e conversão — em escala.**

O **virals-marketing-squad** é a máquina de aquisição da Virals. Responsável por conteúdo viral, copy de alta conversão, SEO e a gestão dual de tráfego pago (Direct Response + Brand/Funnel).

## 🏗️ Estrutura do Squad

- **CONTEÚDO & VIRALIDADE:** @mrbeast-mk (Viral), @garyvee-mk (Brand/Social)
- **COPY & CONVERSÃO:** @ladeira (Copy BR), @georgi (VSL/Scripts)
- **ORGÂNICO & SEO:** @fishkin-mk (SEO/Orgânico)
- **TRÁFEGO PAGO (DUAL):** @perry-marshall (Direct Response), @ezra-firestone (Brand/Funnel)

## ⚡ Princípio de Operação: Tráfego Dual

Diferente de operações tradicionais, separamos o tráfego em dois especialistas:
1. **Direct Response (@perry-marshall):** Sniper do ROI. Foco em conversão imediata, CPA baixo e ROAS positivo. Opera em janelas de lançamento e ofertas ativas.
2. **Brand & Funnel (@ezra-firestone):** Arquiteto de Audiência. Foco em construção de base, aquecimento de leads e brand awareness em escala.

Os dois trabalham de forma coordenada: Ezra constrói o pipeline, Perry ativa a conversão.

## 🤖 Autonomia Plena (Nível 3)

@perry-marshall e @ezra-firestone operam com **Autonomia Plena**. Eles executam otimizações diárias, escalam budgets e pausam campanhas de forma autônoma dentro dos parâmetros aprovados no ClickUp.

## 📂 Estrutura de Diretórios

- `agents/`: Definições de persona e comportamento dos agentes.
- `tasks/`: Tarefas atômicas e organismos de execução.
- `workflows/`: Fluxos multi-agente e processos contínuos.
- `checklists/`: Critérios de validação para lançamentos e saúde de tráfego.
- `templates/`: Modelos de scripts, emails, briefs e manifestos de templates de criativo.
- `scripts/`: Executores Python/JS — pipelines de benchmark e motor de criativos.
- `tools/`: Serviços auxiliares (`pexels_service`, `vvs_render_service`, etc.).
- `services/`: Serviços externos integrados (ex.: `creative-design-service` = app Next.js).
- `data/`: Briefs versionados + identidades por cliente em `data/clients/<slug>/` (`brand-identity.yaml`, `brand-config.yaml`). Registry canonical: `data/clients/_registry.yaml`.

## 🎨 Pipeline Creative Intelligence (`*design-creative`)

A partir da migração AIOX (epic `EPIC-MKT-Creative-AIOX-Alignment`), o motor de criativos é um pipeline AIOX-formal de 6 etapas:

| # | Task | Executor | Modo |
|---|---|---|---|
| 1 | `tasks/creative-modeling.md` | `scripts/deep_modeler.py` | fatal |
| 2 | `tasks/creative-analysis.md` | `scripts/analyze_benchmark.py` | não-fatal |
| 3 | `tasks/creative-planning.md` | `scripts/plan_creative.py` | não-fatal |
| 4 | `tasks/creative-recast.md` | `scripts/recast_engine.py` | não-fatal |
| 5 | `tasks/creative-quality-gate.md` | `scripts/quality_gate.py` | não-fatal |
| 6 | `tasks/creative-render.md` | `scripts/orchestrate_carousel.py` | fatal |

Workflow: `workflows/design-creative.workflow.md`. Render: 1080×1350 (4:5 — grade do Instagram).

## 🚀 Como Iniciar

1. **Validar Squad:** `@squad-creator *validate-squad virals-marketing-squad`
2. **Planejar Lançamento:** Executar workflow `launch-traffic-coordination.yaml`
3. **Auditoria de SEO:** Executar task `fishkin-seo-audit.md`
4. **Criar Copy:** Chamar @ladeira com task `ladeira-copy-create.md`

— Craft, sempre estruturando 🏗️
