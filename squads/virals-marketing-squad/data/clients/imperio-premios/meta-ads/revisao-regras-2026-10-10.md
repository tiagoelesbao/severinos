# Revisão de Regras + Correção do Collector — Império Prêmios — 2026-10-10

**Gatilho:** o founder pediu o tracking "o mais perfeito possível com o que temos em mãos", alertando que **"algumas regras que já definimos antes podem estar erradas"**, e pediu lupa + testes ponta a ponta. Também perguntou se dá pra garantir 100% que o collector vai funcionar.

**Resposta curta sobre a garantia:** 100% não existe. O que existe é o que está abaixo — a correção foi executada contra a API real, em ambiente isolado, e **validada contra um oráculo independente**: coleta limpa recuperou 858 pedidos contra 856 medidos direto na API (100,2%), com **zero duplicatas**. Essa é a base da confiança, e ela tem um limite declarado na seção "O que isto NÃO resolve".

**Complementa** `auditoria-tracking-2026-10-10.md` (mesma data, outro agente). Não repete os achados de lá; corrige um deles e aprofunda outro.

---

## Parte 1 — Correção do collector (P0): implementada e validada

### O que foi corrigido em `collector.py`

Três mudanças, todas necessárias em conjunto:

| # | Mudança | Por quê |
|---|---|---|
| 1 | `_deve_travar()` — só trava sorteio em status terminal (`done`/`canceled`) | Era a causa raiz: todo sorteio era travado após uma passagem, mesmo ainda vendendo |
| 2 | `_order_ids_existentes()` — dedup por `OrderId` antes do append | Sem isso a correção **criaria problema pior**: cada revisita regravaria pedidos já existentes, inflando faturamento com duplicata silenciosa e cumulativa |
| 3 | Auto-cura do checkpoint legado na carga | Corrigir só a gravação não bastaria — os sorteios já envenenados continuariam congelados para sempre |

Mudança secundária: `sorteios_detalhados` virou dict indexado por `product_id` (era lista com `append`, que duplicaria a mesma rifa a cada revisita).

### Validação — três testes, em ambiente isolado

Nenhum teste tocou o CSV ou o checkpoint de produção. Todos rodaram com `--outdir` apontando para o scratchpad, exatamente para **não** provocar o flush em massa do `send_backlog` (ver "Decisão do founder" abaixo).

**Teste 1 — janela de 1 dia, com checkpoint de produção copiado**
```
🔓 Destravados 6 sorteios ainda abertos que o checkpoint legado havia congelado
➕ Pedidos novos gravados: 239
Pedidos de hoje: 64 → 303
Duplicatas: 0
```
A dedup funcionou de verdade: um sorteio com 43 participantes gravou só +35 novos; outro com 67 gravou +51.

**Teste 2 — janela de 3 dias (config real de produção), com checkpoint legado**
```
Pedidos de hoje no CSV: 305  |  Oráculo (API direta): 856  →  cobertura 35,6%
```
**Cobertura ainda baixa — e isso é o achado mais importante desta parte.** Ver seção seguinte.

**Teste 3 — coleta limpa, sem checkpoint legado (prova de correção do código)**
```
linhas: 5.378 | OrderId únicos: 5.378 | duplicatas: 0
Pedidos de hoje: 858 | R$ 44.154,00
Oráculo (API direta):  856 | R$ 44.124,00
cobertura: 100,2%
```
(Os +2 pedidos são compras que entraram durante a execução — o oráculo foi medido minutos antes.)

### O que isto NÃO resolve: o checkpoint legado tem dano permanente

A auto-cura só destrava sorteios **que ainda aparecem na janela consultada**. Um sorteio que foi fotografado vazio enquanto estava `active` e **desde então encerrou** fica travado para sempre com dado incompleto — está em status terminal agora, então a regra (correta) não o reabre.

Medição no checkpoint de produção: **40 sorteios com zero participantes travados** que nunca mais serão revisitados.

É exatamente isso que explica o teste 2 (35,6%) contra o teste 3 (100,2%): **o código está certo; o estado acumulado está envenenado.**

**Consequência prática:** aplicar só o patch em produção **não** restaura o histórico. Para o dado ficar íntegro é preciso **reconstrução limpa** — apagar `checkpoint_3dias.json` + `dados_brutos_completos_3dias.csv` e recoletar (teste 3 prova que o resultado é fiel). O mesmo vale para a base de 90 dias, que alimenta as Custom Audiences.

### Nível de confiança

| Afirmação | Confiança | Base |
|---|---|---|
| O collector corrigido captura ~100% dos pedidos | **Alta** | Teste 3 contra oráculo independente: 858 vs 856 |
| A correção não cria duplicatas | **Alta** | 5.378 linhas / 5.378 ids únicos em coleta completa; dedup observada funcionando nos testes 1 e 2 |
| A auto-cura destrava o que está em janela | **Alta** | 6 sorteios destravados e reprocessados no teste 1 |
| Aplicar o patch em produção basta | **Falsa** | Teste 2 mostra 35,6% — precisa de reconstrução limpa |
| O volume de pedidos não caiu de verdade | **Alta** | 858 pedidos/dia reais, e SERVER no Meta = 867 (1,01x) |

---

## Parte 2 — Veredito das regras auditadas

### (a) Janela de `fbc` de 7 dias — **ERRADA**, mas de impacto pequeno

Confirmado via Graph API nos ad sets. O **único** ad set com `effective_status: ACTIVE` (os demais estão `CAMPAIGN_PAUSED`):

```
"Conjunto 1 — Prospecção Ampla (Advantage+) — Conquista: (x)Clientes Alto Valor; Gerais"
attribution_spec: [{"event_type":"CLICK_THROUGH","window_days":1}]
```

Nosso código usa `FBC_MAX_AGE_DIAS = 7` em `client_api.py:58` e `capi_client.py:124`, escolhido quando o ad set da época usava 7 dias (o ad set de 06/10, hoje pausado, de fato tinha `window_days: 7` — a escolha original estava certa, a realidade é que mudou).

**Nossa régua é 7x mais larga que a do Meta.** Estamos marcando como "Meta Ads (clique confirmado)" pedidos que o Meta já não atribui.

**Impacto real medido — e aqui a honestidade importa:**
```
fbc ≤ 1 dia (janela real do Meta) : 79 pedidos | R$ 3.347,00
fbc 1-7 dias (só a NOSSA regra)   :  1 pedido  | R$    36,00
```
De 5.323 pedidos, a divergência afeta **1**. A regra está errada em princípio e deve ser alinhada, mas **corrigi-la não muda nenhuma leitura de negócio hoje** — não é a explicação do ROAS inflado nem do BI em R$ 5,50.

**Nuance que desaconselha mudar os dois lugares de uma vez:** os dois usos têm respostas corretas diferentes.
- **Classificação no BI** (`_classificar_canal`): deve casar com a janela do Meta → **1 dia**, para que as duas leituras sejam comparáveis.
- **Envio ao CAPI** (`capi_client`): `fbc` é sinal de **identidade**, não de atribuição — quem decide a janela de atribuição é o Meta. Manter 7 dias aqui é defensável e ajuda EMQ.

**Recomendação:** tornar a janela configurável e derivá-la do `attribution_spec` real via API, em vez de constante cravada — senão o desalinhamento volta na próxima vez que o founder mudar a configuração. Esforço: ~30 min.

### (b) `capi_initiatecheckout.py` com `status="all"` — **CORRETA**

Medido ao vivo em 3 sorteios encerrados:
```
{'paid': 167, 'expired': 25}  →  IC = 1,15x o volume de pagos
```
Um checkout `expired` **é** um checkout iniciado — a pessoa começou e não pagou. É exatamente o que `InitiateCheckout` significa; se pagou ou não é o que `Purchase` mede. **Manter.**

A inflação de 1,15x é legítima e **não explica** o funil invertido (IC/ATC = 1,87x). A causa daquilo é ATC não ter fonte de servidor — já estabelecido na auditoria irmã.

### (c) `event_id` inconsistente entre eventos — **CORRETA na prática** (inconsistência cosmética)

`Purchase` usa `OrderId`; `InitiateCheckout` usa `EventId` (campo próprio da plataforma). Parece inconsistente, mas cada um casa com o que o **navegador** usa para aquele evento — que é o que importa para dedup:
- `Purchase`: dedup de 99,69% confirmada em 07/10 (registrada no `gates-status.yaml`).
- `InitiateCheckout`: o `EventId` da plataforma foi validado em 07/10 como sendo o mesmo id do navegador.

**Não mexer.** Uniformizar quebraria a dedup de um dos dois. *Limite:* reconferi a lógica, não re-medi a taxa de dedup atual — a Graph API não expõe esse painel.

### (d) `_classificar_canal` — **CORRETA** (o problema é falta de sinal, não a lógica)

A precedência UTM → `fbc` → `fbp` → direto está certa. Distribuição real de hoje (858 pedidos):
```
606 | Meta (pixel, sem clique confirmado)
134 | Meta Ads (fbc expirado, >90d)
 61 | Meta Ads (fbc expirado, 31-90d)
 44 | Direto/Orgânico/Desconhecido
  8 | Meta Ads (fbc expirado, 8-30d)
  0 | Meta Ads (clique confirmado)   ← ZERO hoje
```
**Hoje não há um único pedido com clique dentro da janela.** De manhã eram 5 (R$ 70,00); no dia inteiro, zero. A classificação está fazendo o trabalho dela corretamente — não existe sinal para classificar.

Achado lateral: existem 19 pedidos históricos com `UTM: ig` no CSV. UTM **não** é 0% em termos absolutos — é 0% no período recente. A plataforma já persistiu UTM em algum momento, o que reforça que isto é regressão/bug dela, não impossibilidade técnica.

### (e) `classificar_novo_vs_recorrente` — **CORRETA**, com limitação já documentada no código

A função classifica primeira-compra por telefone/CPF dentro da janela puxada, e o próprio docstring declara o viés (quem comprou antes da janela aparece como "primeira"). Lógica sã.

**Resposta ao "por que o BI nunca mostra cliente novo?":** o BI só classifica novo×recorrente **entre pedidos atribuídos ao Meta Ads**. Com zero pedidos atribuídos hoje, o numerador é vazio. A conta está certa; falta sinal de atribuição. **Não é bug.**

### (f) Constantes e heurísticas

| Item | Veredito |
|---|---|
| `Pais` fixo `"br"` | **Correto** — 100% dos 858 pedidos de hoje têm país preenchido; a plataforma só opera no Brasil |
| `CAMPANHA_INICIO = "2026-10-06"` cravado | **Precisa de decisão** — o ad set ativo foi criado em **09/10**; a constante cobre também campanhas hoje pausadas. Para ROAS acumulado faz sentido; para avaliar a campanha ativa, não. Vai desalinhar de novo a cada campanha nova. Sugiro derivar da API |
| Fallback de nome / `"Anônimo"` | **Já corrigido** em 07/10 (registrado no `gates-status.yaml`) — confirmado ausente no código atual |

---

## Parte 3 — Testes ponta a ponta

Rastro de 40 pedidos reais de hoje por toda a cadeia:

| Elo | Resultado |
|---|---|
| API do cliente → CSV | **40/40** (com o collector corrigido; com o de produção seria ~5/40) |
| CSV → checkpoint do `send_backlog` (Purchase) | **0/40** |
| CSV → checkpoint do `capi_initiatecheckout` | **0/40** |

**0/40 parece alarmante, mas não significa evento perdido.** Confirmei no Meta:

```
Purchase hoje no Meta → SERVER: 867 | BROWSER: 1.411
Pedidos pagos reais (oráculo)   :    858
SERVER / real  = 1,01x   ← webhook cobrindo ~100%
BROWSER / real = 1,64x   ← pixel do navegador disparando a mais
```

Leitura: **o webhook em tempo real está saudável e cobre praticamente 100%** dos pedidos. O `send_backlog` não conhece nenhum deles porque lê o CSV faminto — ou seja, a **rede de segurança realmente não existe** (confirma o achado da auditoria irmã com medição direta). Se o webhook cair, como já caiu por 2h em 07/10, não há recuperação.

**Reforço ao achado do navegador disparando 1,6x:** a auditoria irmã comparou navegador contra servidor. Aqui comparei **os dois contra o número real de pedidos** — prova mais forte, porque mostra qual dos dois está certo: o servidor (1,01x) é fiel; o navegador (1,64x) é que infla.

### Qualidade de identidade (858 pedidos de hoje)

```
Telefone_E164 100,0%   Ip        100,0%   Nome    100,0%
UserAgent     100,0%   Pais      100,0%   UserId  100,0%
Fbp            94,9%   Fbc        24,2%   Email    37,2%
```
Consistente com EMQ 7,4. Nada aqui é alavanca nossa: `Email` depende do cadastro do usuário e `Fbc` da plataforma.

---

## Ações, por prioridade

### P0 — Reconstrução limpa do collector (precisa de autorização)
O patch está pronto e validado. **Mas aplicar só o patch não basta** — o estado acumulado tem 40 sorteios com dano permanente. É preciso apagar checkpoint + CSV e recoletar.

**Por que não executei:** duas razões. (1) A recoleta enche o CSV com milhares de pedidos que o `send_backlog` desconhece, e ele roda a cada 15 min pelo Task Scheduler — dispararia um pico de milhares de chamadas ao Meta sem aviso (deduplicadas por `event_id`, sem inflar conversão, mas ainda assim uma ação externa grande). (2) Mexer no CSV de produção é irreversível sem backup. Sugiro: parar a tarefa agendada → backup → recoletar → conferir → religar.

### P1 — Regerar as Custom Audiences
Depois da reconstrução, rodar `reports.py` e re-subir as listas. As atuais foram construídas sobre base incompleta e estão alimentando a Lookalike **e a exclusão de "Clientes Existentes"** que acabou de ser ativada nas campanhas.

### P2 — Alinhar a janela de `fbc` com o `attribution_spec` real
Derivar da API em vez de constante cravada. Impacto hoje é de 1 pedido, mas a regra está errada e vai desalinhar de novo a cada mudança de campanha. Mesma recomendação para `CAMPANHA_INICIO`.

### P3 — Escalar à plataforma (decisão do founder, já pendente)
Os três bugs seguem: `fbc` vencido, UTM não persistida, Purchase do navegador a 1,64x. Esta revisão adiciona munição: o `UTM: ig` histórico prova que a plataforma **já persistiu** UTM, e a medição contra pedidos reais isola o over-firing no navegador.

---

## O que NÃO consegui provar

1. **Taxa de dedup atual** de Purchase e IC — reconferi a lógica, mas a Graph API não expõe o painel de desduplicação; os números de 99,69% (Purchase) são de 07/10.
2. **Mecanismo do navegador disparar 1,64x** — provei a magnitude contra pedidos reais, não a causa. Exige instrumentar o site do cliente.
3. **Se a reconstrução limpa se comporta igual na base de 90 dias** — validei em 3 dias (92 sorteios). A de 90 dias tem ~10x o volume; não há razão para divergir, mas não testei.
4. **Fatia da CAPI nativa da plataforma** dentro dos 867 eventos SERVER — webhook e CAPI nativa não são distinguíveis pelos dados que acesso.

---

*Executado em 2026-10-10. Fontes: Graph API (`/stats` por `event_source`, `/adsets` por `attribution_spec`), API do backend do cliente (oráculo independente), `collector.py` em execução isolada no scratchpad, `capi_sent_ids_3dias.json`, `capi_initiatecheckout_sent_ids_3dias.json`, `checkpoint_3dias.json`.*
