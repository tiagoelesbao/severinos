# EPIC-MKT-MC: Multi-Client Design Pipeline

## Visão Geral
Transformar o comando `*design-creative` em um pipeline **multi-cliente**, eliminando o acoplamento hardcoded entre o motor de produção (deep_modeler, plan_creative, recast_engine, render) e a identidade da marca Virals. Cada cliente passa a ter seu próprio `brand-identity.yaml` (tom de voz, avatar, léxico, restrições) e `brand-config.yaml` (paleta, tipografia, logo), resolvidos dinamicamente via `--client=<slug>` em todas as etapas do fluxo.

O primeiro novo cliente introduzido pelo epic é **Tiago Elesbão** (perfil pessoal do dono — backstage dos negócios), com identidade própria calibrada para o arquétipo Herói + tom direto, diferenciada visualmente da Virals (preto + âmbar dourado vs navy + coral).

## Status: ✅ COMPLETE
**Epic ID:** MKT-MC
**Owner:** @marketing-chief (orchestration), @dev (implementation)
**Priority:** High
**Inicio:** 2026-05-22
**Conclusão:** 2026-05-23

## Problema
- Hoje o `*design-creative` é hardcoded em `virals-brand-identity.yaml` e `casey-brand-config.yaml`.
- Não existe conceito de "cliente" — todo criativo produzido é tratado como Virals.
- Adicionar um novo cliente (ex.: Tiago Elesbão) exigia fork manual de scripts ou sobrescrita destrutiva dos YAMLs.
- Outputs misturam-se em `outputs/carousels/{slug}/` sem separação por marca.

## Objetivo
Criar uma arquitetura de **identidades por cliente** (`data/clients/<slug>/`) com:
1. Resolução dinâmica de `brand-identity` + `brand-config` via `--client`.
2. Outputs segregados em `outputs/<client>/carousels/` e `outputs/<client>/posts/`.
3. Step 0 no protocolo do `@marketing-chief` perguntando qual cliente antes de qualquer outra escolha.
4. Backward compat total: `--client=virals` (default) preserva o comportamento atual.

## KPIs de Sucesso
- [ ] Pipeline `*design-creative` aceita `--client=<slug>` em todas as 6 etapas.
- [ ] Cliente `virals` continua produzindo criativos idênticos aos atuais (regressão zero).
- [ ] Cliente `tiago-elesbao` produz criativos com tom de voz e visual próprios a partir do mesmo benchmark.
- [ ] Outputs ficam separados: `outputs/virals/...` e `outputs/tiago-elesbao/...`.
- [ ] Adicionar um 3º cliente futuro exige apenas criar `clients/<slug>/{brand-identity,brand-config}.yaml` + entrada no `_registry.yaml` — zero alteração de código.
- [ ] Step 0 do `*design-creative` lista clientes ativos automaticamente a partir do `_registry.yaml`.

## Roadmap
- [x] **MKT-MC-01**: Infra de clientes (`data/clients/` + registry + YAMLs) 🏗️
- [x] **MKT-MC-02**: Refactor de scripts para `--client` (resolver + 4 scripts) 🔧
- [x] **MKT-MC-03**: Outputs segregados por cliente 📦
- [x] **MKT-MC-04**: Step 0 cliente no `@marketing-chief` 👑
- [x] **MKT-MC-05**: Cleanup + sync de referências legadas 🧹

## Dependências
- Epic anterior **EPIC-MKT-Design-System (VVS)** — completo. Os templates React (`ModeledCarouselSlide`, `QuoteSlide`, `SinglePostSlide`) continuam consumindo `brand-config.yaml` via brief — sem mudança no React.

## Riscos
- **Migração destrutiva** dos YAMLs antigos pode quebrar refs externas (briefs em `data/brief-v*-*.yaml` apontam para o config Casey). Mitigação: Fase 5 faz varredura completa e migra todas as refs.
- **Backward compat**: scripts sem `--client` devem continuar funcionando. Mitigação: default = `virals` em todos os resolvers.

## Referências
- Pipeline atual: `squads/virals-marketing-squad/scripts/design_creative.py`
- Identidade Virals: `squads/virals-marketing-squad/data/virals-brand-identity.yaml` + `casey-brand-config.yaml`
- Agent canonical: `.claude/commands/VIRALS/agents/marketing-chief.md`

---
*Uma máquina de viralidade que serve múltiplas marcas com a mesma fidelidade.*
