# Bug Report — fbc obsoleto na API de Conversões (api.imperiopremioss.com)

**Pra quem mantém o backend/checkout da plataforma.** Achado e confirmado
em 2026-10-05/07 durante auditoria de tracking do Meta Ads. Fora do escopo
técnico da Virals/Oraclum — requer mudança de código no lado do cliente.

## O problema

O evento `Purchase` enviado à Conversions API da Meta inclui o parâmetro
`fbc` com valores de até **349 dias** de idade (confirmado com dado real:
pedidos de outubro/2026 enviando `fbc` de abril/2026). O Meta Events
Manager já sinaliza isso desde **28/jul/2026** ("O servidor está enviando
um valor fbclid expirado no parâmetro fbc" — Alta prioridade, 60 conjuntos
de anúncios afetados, 36% dos eventos de InitiateCheckout).

## Causa provável

O backend provavelmente lê o `fbc` de um campo persistido no
cadastro/perfil do usuário (gravado uma única vez, no primeiro
clique/cadastro) e reutiliza esse mesmo valor em **todo pedido futuro**
desse usuário — mesmo quando a compra atual não tem relação nenhuma com
aquele clique antigo.

## Por que isso importa

- O parâmetro `fbc` deve refletir o clique em anúncio **mais recente** da
  sessão de compra atual — não um valor fixo do passado.
- Isso distorce a atribuição: o Meta corretamente ignora cliques velhos
  demais pra creditar a campanhas atuais, então o ROAS reportado no Ads
  Manager fica artificialmente baixo comparado ao que os nossos próprios
  dados mostram via `fbc` (confundindo qualquer leitura de performance).
- Mais grave: se esse `fbc` velho eventualmente for considerado válido por
  algum motivo, ele credita vendas de clientes recorrentes/orgânicos a
  campanhas de prospecção erradas — isso JÁ aconteceu uma vez no nosso
  teste com o dropdown "Enviar sempre" (ver `funil-conversao.md`).

## Correção recomendada

1. **Capturar o `fbc` fresco a cada sessão**, não ler de um campo salvo no
   cadastro do usuário. Usar o [Configurador de Parâmetros da API de
   Conversões](https://developers.facebook.com/docs/marketing-api/conversions-api/parameter-builder-feature-library)
   da própria Meta — resolve isso de forma padronizada (captura o cookie
   `_fbc` do navegador, ou reconstrói a partir do `fbclid` da URL quando o
   cookie ainda não existe).
2. **No checkout**, enviar o valor capturado NA SESSÃO ATUAL junto com o
   pedido — não buscar de volta no perfil salvo do usuário.
3. **Se não houver `_fbc` válido na sessão atual** (usuário entrou direto,
   sem vir de clique em anúncio), **omitir** o parâmetro `fbc` desse
   evento — nunca reenviar um valor antigo só porque existe um salvo.
4. Validar o payload final com o [Payload
   Helper](https://developers.facebook.com/docs/marketing-api/conversions-api/payload-helper)
   da Meta antes de subir pra produção.

## Achado secundário (menor prioridade)

**Atualidade dos dados:** Events Manager mostra que a API de Conversões
envia eventos **"por hora"** (lote agendado), não em tempo real — a Meta
recomenda o mais próximo possível do tempo real (idealmente síncrono, no
momento exato da compra). Isso não tem o mesmo impacto do bug do fbc, mas
vale corrigir junto já que estarão mexendo nesse fluxo.

## O que NÃO precisa mexer

Deduplicação (99,69% via `event_id`), cobertura de eventos (100%),
qualidade de correspondência (9,3/10) e envio de parâmetros (email,
telefone, fbp, nome, país, IP, user agent — todos 100%) já estão
saudáveis. Não reconfigurar essas partes.
