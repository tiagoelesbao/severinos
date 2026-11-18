---
name: feedback-po-conferir-contrato-no-codigo
description: Ao validar story que declara "o contrato já existe, só emitir", abrir o consumidor e ler linha por linha — enumerar campo não basta, a chamada inteira precisa ser conferida
metadata:
  type: feedback
---

Quando uma story afirma que um contrato de integração "já está definido pelos consumidores que
existem", a validação tem que **abrir o consumidor e ler a chamada inteira** — URL base, caminho
do endpoint, autenticação, nomes dos parâmetros, envelope da resposta e **vocabulário dos
valores** —, não só conferir a lista de campos que a story enumera.

**Why:** eu dei 9/10 à `LTM-04` em 2026-11-16 chamando-a "a mais bem ancorada do epic", porque o
contrato era lido e não inventado. Em 2026-11-17, lendo `client_api.py` linha por linha, o AC
central ("apontar o ETL para o lotemania trocando só a URL base") era **impossível**: a base é um
literal dentro do arquivo (`:74`), o endpoint de pedidos é `product` singular e não `products`, a
autenticação é incompatível em três pontos (campo `email` × `username`, token no corpo × cookie,
`Bearer` × sessão), e os parâmetros são **dez** `filterX` planos (contados no código em 2026-11-17; eu havia escrito "onze") e não o `filters` JSON que eu mesmo
havia generalizado de outro endpoint. Nenhum desses defeitos aparece numa conferência de lista de
campos; todos aparecem na primeira chamada real.

**How to apply:** em story de integração, contrato ou API de leitura, antes de pontuar — ler o
consumidor de ponta a ponta e perguntar: onde mora a URL base? como ele autentica e onde espera o
token? os caminhos batem letra por letra? o envelope da resposta tem nome? e os **valores**
(vocabulário de status, formato de data, `"null"` literal) batem? Divergência de valor é a pior,
porque não quebra nada — reclassifica em silêncio a métrica de quem paga.
