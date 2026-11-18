---
name: contrato-existente-antes-de-inventar
description: Antes de especificar um formato novo, procurar quem já consome o formato antigo — o contrato normalmente já está definido pelos consumidores em produção
metadata:
  type: feedback
---

Quando uma story precisa definir um formato de dado (payload, endpoint, schema de export),
**procurar primeiro quem já consome aquilo em produção** e amarrar a story nesse contrato, em vez de
desenhar um formato novo.

**Why:** o founder/lead corrigiu isso na LTM-04 (2026-11-16). Eu tinha achado
`apps/webhook-imperio-capi/api/order-paid.js` e `apps/utm-capture-imperio/api/capture.js` durante a
investigação e reportado como contexto; o lead apontou que esses dois **já definem** o formato que o
lotemania precisa emitir — "a story fica mais barata e mais precisa se amarrar nesse contrato
existente em vez de inventar um novo". Resultado: os critérios de aceite passaram a ser testes de
contrato derivados do código dos consumidores (com arquivo e linha citados), e o critério de sucesso
virou "o ETL migra trocando só a URL base".

**How to apply:**

- Vale para toda story de integração: API de leitura, webhook de saída, formato de export, schema de
  evento. Antes de escrever o campo, procurar o leitor.
- O teste de contrato deve **citar arquivo e linha da origem**. Assim, mudança no consumidor quebra o
  teste em vez de quebrar o pipeline em silêncio.
- Consequência de escopo: se a implementação exigir alterar o consumidor, **o contrato está errado e
  é a API nova que se ajusta** — não o contrário.

Relacionado: [[lotemania-imperio-migration]], [[sorteamos-nunca-gravou-utm]]
