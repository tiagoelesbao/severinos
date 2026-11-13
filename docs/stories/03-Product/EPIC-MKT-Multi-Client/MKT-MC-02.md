# MKT-MC-02: Refactor de scripts para `--client`

## Status
Done

## Story
**Como** Desenvolvedor do pipeline de criativos
**Eu quero** que `design_creative.py`, `deep_modeler.py`, `plan_creative.py` e `recast_engine.py` resolvam dinamicamente os YAMLs de identidade via `--client=<slug>`
**Para que** o mesmo benchmark possa ser modelado e produzido como criativo Virals OU Tiago Elesbão sem alterar código.

## Contexto
Hoje os scripts têm constantes hardcoded:
- `deep_modeler.py:44` → `BRAND_CONFIG_PATH = "squads/virals-marketing-squad/data/casey-brand-config.yaml"`
- `plan_creative.py:36` → `IDENTITY_PATH = "squads/virals-marketing-squad/data/virals-brand-identity.yaml"`
- `recast_engine.py:49` → `IDENTITY_PATH = "squads/virals-marketing-squad/data/virals-brand-identity.yaml"`

Precisamos extrair essa resolução para um helper compartilhado e fazer cada script aceitar `--client`.

## Tarefas (Checklist)
- [ ] Criar `squads/virals-marketing-squad/scripts/_client_resolver.py` com a função `resolve_client(slug: str) -> {identity_path, config_path, output_dir, slug}`. Default = `virals`. Lê de `data/clients/_registry.yaml` e valida que o slug existe + os YAMLs existem.
- [ ] Refatorar `deep_modeler.py`:
  - Aceitar `--client=<slug>` no argv.
  - Substituir `BRAND_CONFIG_PATH` constante por chamada a `resolve_client(client_slug).config_path`.
  - Manter backward compat: ausência de `--client` → `virals`.
- [ ] Refatorar `plan_creative.py`: igual ao acima para `IDENTITY_PATH`.
- [ ] Refatorar `recast_engine.py`: igual ao acima para `IDENTITY_PATH`.
- [ ] Refatorar `design_creative.py`:
  - Aceitar `--client=<slug>` no argv.
  - Propagar `--client` para todas as etapas que aceitam o flag.
  - Persistir o `client_slug` no brief gerado (`brief-v5-*.yaml`) para auditoria e uso pelos orquestradores.
- [ ] Validar regressão: rodar `python design_creative.py <benchmark> carousel --image-mode=pexels` (sem `--client`) e confirmar que continua produzindo Virals idêntico.
- [ ] Validar novo caminho: rodar `python design_creative.py <benchmark> carousel --image-mode=pexels --client=tiago-elesbao` e confirmar leitura dos YAMLs do Tiago.

## Critérios de Aceite
- [ ] `_client_resolver.py` existe e expõe `resolve_client()` com validação adequada (slug inválido → erro claro com lista de slugs disponíveis).
- [ ] Os 4 scripts aceitam `--client=<slug>` e usam o resolver.
- [ ] Sem `--client`, default é `virals` em todos os scripts (backward compat).
- [ ] Brief gerado contém `client_slug` em metadados.
- [ ] Regressão Virals OK + caminho Tiago Elesbão OK.

## Dependências
- **MKT-MC-01** (infra de clientes) — precisa estar completa antes de iniciar.

## Out of Scope
- Outputs segregados por cliente (Fase 3 / MKT-MC-03).
- Step 0 no agent (Fase 4 / MKT-MC-04).

## Referências
- `squads/virals-marketing-squad/scripts/design_creative.py`
- `squads/virals-marketing-squad/scripts/deep_modeler.py`
- `squads/virals-marketing-squad/scripts/plan_creative.py`
- `squads/virals-marketing-squad/scripts/recast_engine.py`
