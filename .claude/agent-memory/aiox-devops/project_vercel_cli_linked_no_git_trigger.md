---
name: vercel-cli-linked-no-git-trigger
description: Os 8 projetos Vercel do severinos são vinculados por CLI, não por Git — push ao GitHub nunca dispara deploy
metadata:
  type: project
---

Os 8 apps Vercel do repo (`garantido-premios-lp`, `imperio-premios-lp`, `link-garantido`,
`link-imperio`, `utm-capture-imperio`, `webhook-garantido-pedidos`, `webhook-imperio-capi`,
`captura_ia` → projeto `oraclumtech-cofre`) têm `.vercel/project.json` local e **gitignorado**
(`.gitignore` de cada app, linha 1: `.vercel`). `vercel project inspect` em todos os 8 não mostra
repositório conectado.

**Why:** foram linkados por `vercel link` / `vercel --prod` da máquina, não pela integração GitHub
do dashboard. Como consequência, **o estado do git e o estado do que está no ar são independentes**:
publicar no `master` não republica nada, e um `git revert` não desfaz um deploy.

**How to apply:** ao avaliar risco de um push neste repo, não trate os apps Vercel como gatilho de
deploy — eles não são. O inverso também vale: se o founder quer que uma correção em LP ou webhook
chegue à produção, o push **não basta**; precisa de `vercel --prod` no diretório do app, que é
decisão dele, não minha. Confirmar com `vercel project inspect` antes de afirmar — a integração
pode ser ligada no dashboard a qualquer momento sem mudar nada no repo.
