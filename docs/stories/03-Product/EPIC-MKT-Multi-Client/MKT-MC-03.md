# MKT-MC-03: Outputs segregados por cliente

## Status
Done

## Story
**Como** Marketing Chief
**Eu quero** que os criativos renderizados sejam salvos em `outputs/<client>/carousels/<slug>/` e `outputs/<client>/posts/<slug>/`
**Para que** os assets da Virals e do Tiago Elesbão fiquem fisicamente separados, facilitando publicação, auditoria e versionamento.

## Contexto
Hoje os orquestradores escrevem em `outputs/carousels/<slug>/` e `outputs/posts/<slug>/` (definido em `casey-brand-config.yaml`). Sem segregação, os criativos de clientes distintos se misturam.

## Tarefas (Checklist)
- [ ] Ajustar `orchestrate_carousel.py` para receber `client_slug` (do brief) e escrever em `outputs/<client_slug>/carousels/<slug>/`.
- [ ] Ajustar `orchestrate_post_single.py` para receber `client_slug` (do brief) e escrever em `outputs/<client_slug>/posts/<slug>/`.
- [ ] Atualizar mensagens de log para refletir o novo path.
- [ ] Validar que os manifests/relatórios gerados referenciam o path correto.

## Critérios de Aceite
- [ ] Carrossel Virals → `outputs/virals/carousels/<slug>/`.
- [ ] Carrossel Tiago → `outputs/tiago-elesbao/carousels/<slug>/`.
- [ ] Post único Virals → `outputs/virals/posts/<slug>/`.
- [ ] Post único Tiago → `outputs/tiago-elesbao/posts/<slug>/`.
- [ ] Sem `client_slug` no brief (briefs legados) → fallback `virals` (backward compat).

## Dependências
- **MKT-MC-02** — `client_slug` precisa estar no brief.

## Out of Scope
- Reorganização de outputs históricos já produzidos (manual; fora do escopo).

## Referências
- `squads/virals-marketing-squad/scripts/orchestrate_carousel.py`
- `squads/virals-marketing-squad/scripts/orchestrate_post_single.py`
