# Funil de Conversão — Império (mapeamento completo)

Documento de referência pro BI: todo o trajeto do lead, da impressão do
anúncio até a compra, com as duas ramificações reais depois do clique. Serve
de espinha dorsal pro dashboard que vamos construir — cada caixa abaixo
corresponde a um evento/fonte de dado que já existe (ou que estamos
fechando agora).

## O funil completo

```
[1] Impressão do anúncio
     Fonte: Meta Ads Insights (impressions, reach)
     |
     v
[2] Clique no anúncio
     Fonte: Meta Ads Insights (clicks, link_click)
     Carrega: utm_source=meta&utm_medium=paid-social&utm_campaign={...}
              &utm_content={ad.id}&utm_term={adset.id}  [url_tags, já ok]
     |
     v
[3] Chegada na landing page (imperio.vercel.app)
     Fonte: Meta Pixel PageView (fbq PageView)
     UTM da URL de entrada agora é repassado pros 2 CTAs [corrigido 2026-10-07]
     |
     +---------------------------------+
     |                                 |
     v                                 v
[4A] Clique "Ver o que está          [4B] Clique "Entrar no grupo"
     disponível agora"                     Fonte: Pixel Lead (fbq Lead)
     Fonte: Pixel ClickSorteios             content_name=grupo_whatsapp
     (fbq trackCustom)                      |
     |                                      v
     v                                [5B] Grupo de WhatsApp
[5A] Site oficial                          (fora do nosso rastreio —
     (imperiopremioss.com)                  plataforma externa, sem
     UTM propagado da LP                    visibilidade por lead individual)
     |                                      |
     |                                      v
     |                                [6B] Link de compra postado
     |                                      DENTRO do grupo pelos admins
     |                                      PRECISA de UTM dedicado
     |                                      (ver seção abaixo) — hoje
     |                                      não tem, é o buraco do funil
     |                                      |
     |                                      v
     |                                [7B] Site oficial
     |                                      UTM: utm_source=whatsapp
     |                                      &utm_medium=community
     |                                      &utm_campaign=grupo-principal
     |                                      |
     v                                      v
[6A] ============ COMPRA (ponto único de conversão) ============
     Fonte: API do cliente (services/Meta/imperio-premios/)
     Canal_Atribuicao calculado por: UTM (se presente) > fbc com idade
     <=7 dias (client_api.py, corrigido 2026-10-07) > fbp > direto
```

## O que cada ramificação consegue (e não consegue) provar

**Ramo A (anúncio → LP → site direto):** atribuição de **lead individual**
possível — o pedido carrega UTM com `ad.id`/`adset.id` específicos (desde a
correção de hoje) e/ou `fbc` do clique original. Dá pra saber exatamente
qual criativo gerou qual venda.

**Ramo B (anúncio → LP → grupo → site, depois):** só atribuição **agregada**
é realista sem infraestrutura adicional. Uma vez que o lead entra no grupo
do WhatsApp, perdemos qualquer identificador individual (não há como saber
*qual* pessoa do grupo clicou em qual link depois, a não ser que ela informe
telefone/nome em algum ponto rastreável). O que **dá** pra medir:
- Quantas pessoas clicaram "Entrar no grupo" a partir da LP (evento `Lead`,
  já funcionando).
- Volume agregado de vendas atribuíveis ao grupo via UTM dedicado no link
  que os admins compartilham lá dentro (`utm_source=whatsapp`) — não por
  pessoa, mas por volume/período.

**Se no futuro quisermos atribuição por lead individual também no Ramo B**,
a única forma tecnicamente viável é uma ponte com banco de dados própria:
LP → página intermediária nossa que registra `(fbc/UTM, telefone)` antes de
redirecionar pro WhatsApp → cruzar esse telefone com o telefone do pedido
real depois. Factível, mas é uma Fase 2 — não faz sentido construir antes
de fechar o rastreio agregado básico primeiro.

## Link dedicado pro grupo (ação pendente)

**O que falta:** pedir pros admins do grupo (ou quem posta o link de compra
lá dentro) acrescentarem o MESMO sufixo de UTM em qualquer link que
mandarem — não precisa ser um link fixo, o grupo manda o link direto de
cada sorteio (muda a cada post), e o sufixo entra depois dele, sempre
igual:

```
?utm_source=whatsapp&utm_medium=community&utm_campaign=grupo-principal
```

Exemplo: `https://imperiopremioss.com/sorteio/{id-do-sorteio}?utm_source=whatsapp&utm_medium=community&utm_campaign=grupo-principal`

O UTM não precisa identificar QUAL sorteio — isso já vem do `ProductId` nos
nossos próprios dados (ver `bi_aggregator.py::montar_sorteios`). Ele só
precisa marcar "este pedido veio do grupo", então o sufixo é sempre
idêntico, independente do sorteio. Ponto de atenção operacional: como o
link muda a cada post, é manual — quem posta precisa lembrar de colar o
sufixo toda vez. Risco de esquecimento; se virar problema recorrente, dá
pra evoluir pra um redirecionador próprio que aponta pro sorteio vigente
já com UTM embutido.

Se o grupo também usa um encurtador (como o `sndflw.com` usado no link de
*entrada* do grupo), o ideal é criar um encurtador **separado** especificamente
pra esse link de saída (compra), pra não confundir com o link de entrada.
Não temos acesso ao painel do `sndflw.com` nem ao grupo em si — essa troca é
uma ação do founder/time de operação do cliente.

## Achado crítico 2026-10-07 — "Novo público" é a métrica que importa

O dropdown "Enviar sempre" (testado e revertido no mesmo dia) provou que
**reportar toda compra pro CAPI sem filtro contamina a leitura de
performance de prospecção com vendas de clientes existentes via grupo** —
o ROAS "bonito" do topo do painel (agregado) estava escondendo que o
público realmente novo (quem a campanha deveria estar testando) tinha ROAS
0,47 (prejuízo). Lição pro BI: **nunca olhar ROAS agregado de uma campanha
de prospecção sem quebrar por segmento "Novo público" vs "Clientes
existentes"/"Público engajado"** — o dashboard final precisa ter esse corte
como padrão, não como opção escondida.

## Pendência de fora do nosso escopo técnico

O bug de `fbc` congelado da plataforma (`gates-status.yaml` →
`test_events_validado`) contamina a precisão do Ramo A também, não só do B —
enquanto não for corrigido lá, a UTM é a fonte mais confiável pro BI, com
`fbc` (idade <=7d) como sinal secundário/validação, nunca o contrário.
