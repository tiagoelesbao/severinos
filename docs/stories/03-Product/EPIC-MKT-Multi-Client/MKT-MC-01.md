# MKT-MC-01: Infra de clientes (registry + YAMLs por marca)

## Status
Done

## Story
**Como** Marketing Chief
**Eu quero** uma estrutura de pastas `data/clients/<slug>/` com `_registry.yaml` listando clientes ativos e seus YAMLs de identidade
**Para que** o pipeline `*design-creative` consiga resolver dinamicamente a brand-identity e brand-config por cliente.

## Contexto
Hoje os YAMLs de identidade da Virals vivem soltos em `squads/virals-marketing-squad/data/` (`virals-brand-identity.yaml` e `casey-brand-config.yaml`) e são consumidos por paths hardcoded nos scripts. Para suportar múltiplos clientes (Virals, Tiago Elesbão, futuros), precisamos uma estrutura canonical onde cada cliente é uma pasta com seus 2 YAMLs.

O cliente **Tiago Elesbão** é introduzido aqui com identidade calibrada pela entrevista do dono (2026-05-22): arquétipo Herói, tom direto e cru, paleta preto + âmbar dourado, pilares de backstage/lessons/mindset/análise, bordões próprios e proibições éticas.

## Tarefas (Checklist)
- [ ] Criar diretório `squads/virals-marketing-squad/data/clients/`.
- [ ] Criar `clients/_registry.yaml` com slugs `virals` e `tiago-elesbao` (versão, paths e metadados).
- [ ] Criar `clients/virals/brand-identity.yaml` (cópia de `virals-brand-identity.yaml`).
- [ ] Criar `clients/virals/brand-config.yaml` (cópia de `casey-brand-config.yaml`).
- [ ] Criar `clients/tiago-elesbao/brand-identity.yaml` com tom de voz Herói + direto, pilares (backstage, lessons+cases, mindset, análise), bordões, proibições e identidade visual definidos na entrevista.
- [ ] Criar `clients/tiago-elesbao/brand-config.yaml` com paleta preto + âmbar dourado, tipografia Outfit (compartilhada), logo placeholder.
- [ ] Manter os YAMLs originais (`virals-brand-identity.yaml`, `casey-brand-config.yaml`) intactos até a Fase 5 (cleanup).

## Critérios de Aceite
- [ ] `clients/_registry.yaml` lista 2 clientes (`virals`, `tiago-elesbao`) com paths corretos.
- [ ] `clients/virals/brand-identity.yaml` é idêntico em conteúdo ao `virals-brand-identity.yaml`.
- [ ] `clients/virals/brand-config.yaml` é idêntico em conteúdo ao `casey-brand-config.yaml`.
- [ ] `clients/tiago-elesbao/brand-identity.yaml` reflete fielmente as escolhas da entrevista (arquétipo, tom, pilares, bordões, proibições, avatar mix D2C+early-stage).
- [ ] `clients/tiago-elesbao/brand-config.yaml` define paleta `#0B0B0F` + `#FFB800` + `#FF4D2E` e tipografia Outfit.

## Out of Scope
- Refactor de scripts (Fase 2 / MKT-MC-02).
- Deleção dos YAMLs antigos (Fase 5 / MKT-MC-05).

## Referências
- `squads/virals-marketing-squad/data/virals-brand-identity.yaml`
- `squads/virals-marketing-squad/data/casey-brand-config.yaml`
- Entrevista de calibração — sessão 2026-05-22
