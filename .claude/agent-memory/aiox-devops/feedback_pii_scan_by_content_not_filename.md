---
name: pii-scan-by-content-not-filename
description: Varredura de PII antes de push deve ser por conteúdo (E.164, CPF, e-mail), nunca só por nome de arquivo — relatório .md carrega dado de cliente
metadata:
  type: feedback
---

Antes de qualquer push neste repo, varrer **conteúdo**, não nome de arquivo. Os padrões que pegam:
`\+55[0-9]{10,11}`, `\([1-9][0-9]\) ?9[0-9]{4}-?[0-9]{4}`, `[0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2}`,
e-mail de domínio de consumidor. Ferramenta certa: `git grep -InE <padrão> HEAD -- <paths>` (rápido
e opera na árvore do commit); o laço `git show` arquivo a arquivo estoura o tempo em ~4 mil arquivos.

**Why:** em 2026-11-12 a limpeza bloqueou corretamente os CSV de audiência por nome
(`audiencia*.csv`, `dados_brutos_completos*`). A varredura por nome deu **zero**. A varredura por
conteúdo achou 4 telefones reais de clientes do Império Prêmios em tabela markdown dentro de
`squads/virals-marketing-squad/data/clients/imperio-premios/meta-ads/auditoria-tracking-bi-*.md` —
num commit chamado, ironicamente, "bloqueia dado pessoal de cliente". Relatório em prosa não tem
"audiência" nem ".csv" no nome, e a política do `.gitignore` manda relatório **entrar** no git.
Isso é a lição 2 do próprio `docs/ESTADO-ATUAL.md` ("varrer por conteúdo, não por nome") aplicada
ao formato que ela mesma não cobriu.

**How to apply:** rodar a varredura de conteúdo em todo `git push`/merge de consolidação. Separar
três classes no relatório: (1) dado real de terceiro → **bloqueia**; (2) amostra marcada "real" em
comentário de código → bloqueia até o founder decidir; (3) placeholder óbvio (`99999999999`,
`998765432`), e-mail do próprio founder, telefone de terceiro visível em footage de acervo →
documenta e segue. Filtrar falso positivo: hash sha256 e ID de CDN do Facebook casam com regex de
telefone solto — por isso exigir o `+55` ou o formato com DDD entre parênteses.
