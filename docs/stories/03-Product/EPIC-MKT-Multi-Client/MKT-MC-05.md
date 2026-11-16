# MKT-MC-05: Cleanup + sync de referências legadas

## Status
Done

## Story
**Como** Marketing Chief
**Eu quero** que todas as referências aos YAMLs antigos (`virals-brand-identity.yaml`, `casey-brand-config.yaml`) sejam migradas para a nova estrutura de clientes
**Para que** não existam duas fontes de verdade competindo, e o repositório fique consistente.

## Contexto
Após as fases 1-4, os YAMLs antigos em `squads/virals-marketing-squad/data/` ficam órfãos. Há referências em ~30 arquivos (briefs, README, squad.yaml, tasks, workflows, outros agentes como `casey-neistat-img.md`). Esta story varre, atualiza e finalmente deleta os originais.

## Tarefas (Checklist)
- [ ] Listar todos os arquivos que referenciam `virals-brand-identity.yaml` ou `casey-brand-config.yaml` (exceto `.git/`).
- [ ] Atualizar `squads/virals-marketing-squad/README.md` para apontar para a nova estrutura.
- [ ] Atualizar `squads/virals-marketing-squad/squad.yaml`.
- [ ] Atualizar `squads/virals-marketing-squad/agents/casey-neistat-img.md` (referências em `dependencies.data`).
- [ ] Atualizar tasks/workflows que mencionam os paths antigos:
  - `tasks/creative-recast.md`
  - `tasks/casey-image-brand.md`
  - `tasks/casey-carousel-create.md`
  - `tasks/casey-post-single-create.md`
  - `tasks/sam-motion-title.md`
  - `tasks/casey-template-create.md`
  - `workflows/design-creative.workflow.md`
  - `tools/casey-pillow-composer.md`
  - `templates/casey-carousel-brief-tmpl.md`
  - `templates/casey-post-brief-tmpl.md`
- [ ] Atualizar referências em briefs `data/brief-*.yaml` ou marcar como legacy.
- [ ] Após confirmar zero refs vivas, **deletar** `data/virals-brand-identity.yaml` e `data/casey-brand-config.yaml`.
- [ ] Atualizar `marketing-chief.md` `dependencies.data` para apontar para `data/clients/`.

## Critérios de Aceite
- [ ] `grep -rn "virals-brand-identity\|casey-brand-config" .` (excluindo `.git` e arquivos de doc histórico) retorna apenas referências documentais (stories, epics, CLAUDE.md).
- [ ] Os arquivos `virals-brand-identity.yaml` e `casey-brand-config.yaml` não existem mais em `data/`.
- [ ] Pipeline `*design-creative` continua funcionando (regressão de ponta-a-ponta com `--client=virals`).

## Dependências
- **MKT-MC-01, MKT-MC-02, MKT-MC-03, MKT-MC-04** (toda a infra precisa estar no ar).

## Riscos
- Deletar YAMLs antigos pode quebrar refs externas em briefs históricos. Mitigação: rodar o teste de regressão antes da deleção.

## Referências
- Resultado prévio do grep: 30 arquivos referenciam os YAMLs antigos.
