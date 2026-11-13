# Balanço da Semana 1 e Plano de Escala — Império Prêmios

**Data da análise:** 2026-10-15 (documento nomeado 10-11 conforme solicitado; os dados vão até 15/10)
**Janela principal:** 08–14/10/2026 (a janela `last_7d` que o Meta reporta)
**Autor:** @marketing-chief, cruzando Graph API ao vivo + base de vendas reconstruída + MBA Meta

---

## 0. Conclusão em uma frase

**A campanha ainda não demonstrou aquisição incremental de cliente.** Os 95 clientes novos da semana estão dentro da faixa que o negócio já produzia com **zero** de verba (44–89/semana em setembro). Não é prova de fracasso — é ausência de prova de sucesso. **Recomendo NÃO subir para R$3k/dia agora**, e explico abaixo o que precisa acontecer antes.

---

## 1. O que de fato aconteceu na semana

### 1.1 Lado Meta (Graph API, conta `act_2076716696539325`)

| Métrica | Valor |
|---|---|
| Investimento 08–14/10 | **R$ 9.044,70** |
| Impressões | 213.928 |
| Cliques | 5.491 |
| Valor de conversão **reportado pelo Meta** | R$ 206.850,95 |
| ROAS **reportado** | **22,9x** |

Cinco campanhas ativas — e aqui vai uma **atualização relevante ao `setup-guide`**: as Campanhas 2 (CBO Teste) e 3 (Retargeting) **já foram criadas e estão gastando**, ao contrário do que o guia de 09/10 registrava como bloqueado.

| Campanha | Gasto | ROAS reportado |
|---|---|---|
| C1 — Advantage+ (original) | R$ 787,72 | 156,8x |
| C1 — v2 | R$ 621,94 | 19,7x |
| C1 — v3 | **R$ 5.499,06** | 6,1x |
| C2 — CBO Teste | R$ 1.309,01 | 26,3x |
| C3 — Retargeting | R$ 826,97 | 3,6x |

**Curva de gasto e decaimento do ROAS reportado** — este é o padrão mais informativo do período:

| Dia | Gasto | ROAS reportado |
|---|---|---|
| 06/10 | R$ 229 | 18,8x |
| 07/10 | R$ 1.084 | 56,7x |
| 08/10 | R$ 788 | 83,1x |
| 09/10 | R$ 921 | 43,0x |
| 10/10 | R$ 894 | 26,5x |
| 11/10 | R$ 741 | 7,2x |
| 12/10 | R$ 1.205 | 18,1x |
| 13/10 | R$ 2.118 | 12,8x |
| 14/10 | R$ 2.379 | **10,0x** |

O ROAS reportado cai de 83x para 10x conforme o gasto triplica. Isso é exatamente a curva de rendimentos decrescentes do **Módulo 12 §1** — mas atenção: parte da queda é *diluição do artefato de atribuição*, não só saturação real de leilão. Os dois efeitos estão misturados e **não dá para separá-los com a medição atual**.

### 1.2 Lado plataforma do cliente (vendas reais)

| Métrica | Valor |
|---|---|
| Faturamento 08–14/10 | **R$ 698.628,00** |
| Pedidos | 11.830 |
| Clientes ativos na janela | 764 |
| **Ticket por compra** | **R$ 55,50** |

> ⚠️ O `relatorio_financeiro_90dias.csv` imprime "Ticket médio R$ 4.742,01" — isso é faturamento ÷ **usuários únicos**, não por compra. O ticket real por pedido é **R$ 55,50**. Não usar os R$4.742 em nenhuma conta de CAC.

**Confiabilidade do dado:** esta série é confiável a partir da reconstrução de 10/10 (bug P0 do `collector.py`, ver `revisao-regras-2026-10-10.md`). Qualquer leitura de 08–10/10 feita **antes** daquela data está errada — capturava ~20% da realidade.

### 1.3 O cruzamento que importa

| Fonte | Receita atribuída a Meta Ads na janela |
|---|---|
| **Meta diz** | R$ 206.850,95 |
| **Nossos dados confirmam** | **R$ 5.988,00** |

Distância de **~34x**. A quebra por canal de atribuição, sobre os R$698.628 reais:

| Pedidos | Receita | % | Canal |
|---:|---:|---:|---|
| 8.374 | R$ 507.818,50 | 72,7% | Meta (pixel, **sem** clique confirmado) |
| 1.496 | R$ 72.944,50 | 10,4% | Meta Ads (fbc expirado >90d — não atribuível) |
| **515** | **R$ 42.205,00** | **6,0%** | **UTM: whatsapp** |
| 645 | R$ 38.879,50 | 5,6% | Meta Ads (fbc expirado 31–90d) |
| 538 | R$ 28.686,50 | 4,1% | Direto/Orgânico/Desconhecido |
| **183** | **R$ 5.988,00** | **0,9%** | **Meta Ads (clique confirmado)** |
| 64 | R$ 1.593,50 | 0,2% | Meta Ads (fbc expirado 8–30d) |
| 15 | R$ 512,50 | 0,1% | UTM: ig |

**Achado positivo e novo:** a linha `UTM: whatsapp` com **515 pedidos / R$42.205** mostra que o encurtador do grupo (`apps/link-imperio`) **está funcionando e gerando atribuição mensurável** — 6% do faturamento. Isso contradiz a leitura anterior de "UTM 0%" e valida aquele investimento. A plataforma **persiste UTM** quando ela chega pelo encurtador; o que ela não faz é capturar UTM que passa pela home.

---

## 2. Leitura honesta de performance: prospecção real vs. recompra

### 2.1 O que o Meta diz por segmento (7d)

| Segmento | Gasto | Compras | Valor reportado | ROAS |
|---|---:|---:|---:|---:|
| prospecting | R$ 4.184,76 | 1.266 | R$ 67.351,86 | 16,1x |
| existing | R$ 3.048,57 | 1.892 | R$ 100.630,59 | 33,0x |
| engaged | R$ 1.810,49 | 522 | R$ 38.048,50 | 21,0x |

Isso é **melhor** que a leitura de 07/10 (que mostrava 0,47x em "Novo público"), mas vem da **mesma fonte contaminada** — então não trato como refutação daquele achado, e sim como mais um número que não dá para auditar. Vale notar que **42% do gasto ainda vai para público existente/engajado**, o que é exatamente a contaminação que o `funil-conversao.md` manda evitar.

### 2.2 A medição que não depende do Meta: clientes genuinamente novos

Cruzando primeira-compra-de-todas contra todo o histórico (2.139 clientes únicos, 174.280 pedidos):

| Métrica | Valor |
|---|---|
| Clientes cuja **primeira compra** caiu em 08–14/10 | **95** |
| Pedidos desses novos na janela | 281 |
| Receita deles na janela | R$ 10.253,50 |
| Ticket/pedido deles | R$ 36,49 |
| **CAC ingênuo** (gasto ÷ novos) | **R$ 95,21** |

### 2.3 O teste de incrementalidade — e por que ele é o número decisivo

Confirmei via Graph API: **não houve gasto de mídia nenhum antes de 03/10.** A conta só começou a gastar naquela data. Isso dá uma linha de base limpa:

| Semana | Clientes novos | Gasto de mídia |
|---|---:|---:|
| Set S1 | 83 | **R$ 0** |
| Set S2 | 71 | **R$ 0** |
| Set S3 | 44 | **R$ 0** |
| Set S4 | 89 | **R$ 0** |
| **Média set (zero verba)** | **~72/semana** | — |
| Out S1 (01–07) | 47 | ~R$ 3.022 |
| **Out S2 (08–14)** | **95** | **R$ 9.045** |

Dois fatos desconfortáveis:

1. **Na semana com R$3.022 investidos, vieram 47 clientes novos — ABAIXO da média de quando não se gastava nada.**
2. Na semana com R$9.045, vieram 95 — cerca de **+23 acima da linha de base**. Isso dá um **CAC incremental de ~R$393**.

**Mas a variância da linha de base é alta** (44 a 89, ±30%). Vinte e três clientes a mais cabem dentro do ruído. A conclusão rigorosa é: **a campanha não demonstrou aquisição incremental mensurável.** Não está provado que destrói valor; está não-provado que cria.

### 2.4 CPA marginal (Módulo 12 §1.1)

Entre os dois níveis de investimento observados:

```
ΔGasto        = R$ 8.338,73 − R$ 3.022,05 = R$ 5.316,68
ΔClientes     = 95 − 47 = 48
CPA marginal  = R$ 110,76
```

Esse número precisa ser comparado com a **contribuição real** de um cliente novo — o que exige LTV, não ROAS de uma semana.

---

## 3. LTV por coorte: a conta que muda a decisão

Coortes semanais por data da primeira compra (receita acumulada por cliente, com os dias de observação de cada uma):

| Coorte | Clientes | Dias obs. | Receita/cliente | Pedidos/cliente |
|---|---:|---:|---:|---:|
| Jul S2 | 637 | 95 | R$ 13.377 | 219,5 |
| Jul S3 | 338 | 90 | R$ 2.402 | 48,1 |
| Jul S4 | 186 | 82 | R$ 1.640 | 26,6 |
| Ago S1 | 111 | 72 | R$ 532 | 13,6 |
| Ago S3 | 126 | 59 | R$ 594 | 14,0 |
| Set S2 | 71 | 35 | R$ 507 | 7,1 |
| Set S4 | 89 | 20 | R$ 341 | 6,7 |
| Out S1 | 47 | 11 | R$ 265 | 7,1 |
| **Out S2 (nossa)** | **95** | **3** | **R$ 117** | **3,2** |

> A coorte Jul S2 (R$13.377/cliente) **não é uma coorte real** — é o retrato da base pré-existente no início da janela de dados, e inclui as baleias. Ignorar para fins de LTV.

**Curva de maturação honesta** (coortes de ago/set, que são de aquisição de verdade): ~R$117 em 3 dias → R$265 em 11 → R$341 em 20 → R$507 em 35 → ~R$594 em 60 dias.

Aplicando a MC de **17,5%**:

| Horizonte | Receita/cliente | **Contribuição/cliente** |
|---|---:|---:|
| 35 dias | R$ 507 | **R$ 89** |
| 60 dias | R$ 594 | **R$ 104** |

**Confronto final:**

| | |
|---|---|
| CPA marginal medido | **R$ 110,76** |
| Contribuição a 35 dias | R$ 89 |
| Contribuição a 60 dias | R$ 104 |
| CAC incremental (vs. linha de base) | **R$ 393** |

Pela leitura de CPA marginal: **payback em ~60-70 dias, no limite do empate.** Pela leitura de incrementalidade: **prejuízo de ~R$290 por cliente.** As duas leituras discordam, e essa discordância é a informação mais importante deste documento — ela existe porque **não conseguimos atribuir**, não porque os dados são contraditórios.

---

## 4. A fotografia financeira da empresa

| Métrica | Valor |
|---|---|
| Faturamento (semana) | R$ 698.628 |
| Faturamento (90 dias) | R$ 9.697.412 |
| Margem de contribuição | 17,54% |
| ROAS break-even | **5,70x** |
| Clientes únicos (90d) | 2.139 |
| Pedidos (90d) | 174.280 |
| Compras por cliente (90d) | ~81 |

**Concentração de receita na semana** (764 clientes ativos):

| Faixa | Clientes | Receita | % |
|---|---:|---:|---:|
| Top 1% | 7 | R$ 171.620 | **24,6%** |
| Top 5% | 38 | R$ 374.693 | 53,6% |
| Top 10% | 76 | R$ 485.489 | 69,5% |
| Top 20% | 152 | R$ 586.904 | 84,0% |

**O que isso implica para o teto de escala:**

1. **O negócio é grande e saudável** — ~R$100k/dia. Os R$9k/semana de mídia são **1,3% do faturamento**. Há folga de caixa real para reinvestir, como o founder disse.
2. **Mas a base é minúscula: 2.139 clientes.** O negócio inteiro roda sobre pouco mais de dois mil CPFs, com 7 pessoas gerando um quarto da receita semanal. Isso é risco de concentração severo — e é também **o melhor argumento a favor de investir em aquisição**, porque o negócio depende perigosamente de poucas baleias.
3. **O teto de escala não é orçamentário, é de mercado endereçável.** A Lookalike 1–3% já cobre 2,5 milhões de pessoas; o gargalo não é alcance, é a nossa incapacidade de medir quem converteu.
4. **O ativo mais valioso é a recompra, não a primeira compra.** 81 compras por cliente em 90 dias significa que acertar aquisição se paga muito — mas só se a gente conseguir provar qual aquisição foi nossa.

---

## 5. Recomendação de escala: **não subir para R$3k/dia ainda**

O founder pediu verdade em vez de otimismo, então aqui está.

### 5.1 Por que não

Aplicando a **máquina de estados do Módulo 12 §2** literalmente:

```
CHECK_CPA: o CPA está abaixo do alvo?
  → INDETERMINADO. Não temos CPA confiável — 0,9% de atribuição confirmada.
CHECK_MARGINAL: CPA marginal <= target?
  → R$110,76 vs contribuição R$89–104. No limite, inconclusivo.
→ A máquina NÃO autoriza SCALE. Ela exige que o CPA seja legível primeiro.
```

Além disso:

- **Subir de ~R$1,3k para R$3k/dia é +130%.** O Módulo 02 limita saltos a **15–20% por janela de 48–72h** em campanha que já aprendeu. Esse salto é 6x o permitido.
- **Dois dos quatro bloqueios do `setup-guide` seguem abertos.** As audiências existem como Custom Audience de verdade (verifiquei: Lookalike 1-3% com 2,5M, base dormente com 354.600, alto valor e quentes com 1.000 cada) — então **B1 está resolvido**. Mas **B4 continua aberto**: não existe nenhuma audiência de exclusão "Clientes Ativos Recentes". Sem ela, 42% do gasto segue indo para público existente/engajado.
- **Achado novo e grave: as audiências de site estão vazias.** "All Viewers" tem **20 pessoas** e "All Viewers – Purchase" tem **20**. É consequência direta de a home não carregar o pixel. **A Campanha 3 (Retargeting) gastou R$826,97 sem ter um público de site real para remarketar** — é o pior ROAS da conta (3,6x) e agora sabemos por quê.

### 5.2 O que fazer nos próximos 7 dias

| # | Ação | Por quê |
|---|---|---|
| 1 | **Manter o orçamento em ~R$1.200–1.500/dia.** Não subir. | Sem CPA legível, escalar é escalar um número que não sabemos ler. |
| 2 | **Terminar o catálogo da pressel** (em construção) e ativar `PurchaseClickSorteios` / `PurchaseClickGroup`. | É o que torna o funil mensurável. Sem isso, tudo o mais é opinião. |
| 3 | **Criar a audiência de exclusão "Clientes Ativos Recentes"** (B4) e aplicar nas campanhas de prospecção. | Para o gasto parar de perseguir quem já compra. Gero o CSV da base reconstruída em minutos. |
| 4 | **Pausar ou reconstruir a Campanha 3.** | Está remarketando um público de 20 pessoas. |
| 5 | **Realocar verba de criativo** (ver §6). | O dinheiro está nos piores criativos. |
| 6 | Reavaliar em 7 dias com evento segmentado no ar. | Aí sim a máquina de estados tem o que decidir. |

### 5.3 Quando subir, e como

Gatilho objetivo, não data: **quando o `PurchaseClickSorteios` acumular ≥50 eventos em 7 dias** (limite de aprendizado do Módulo 03), passamos a ter CPA real de prospecção. A partir daí:

- Se `CPA_marginal ≤ R$104` (contribuição a 60d) → subir **15–20% por janela de 48–72h**, conforme Módulo 12.
- Caminho: R$1.500 → R$1.800 → R$2.100 → R$2.500 → R$3.000. Cerca de **2–3 semanas** para chegar aos R$3k com segurança.
- Se o CPA marginal estourar em algum degrau, parar ali — é o teto real daquele momento, não uma falha.

Sobre o `fbc`: concordo com a leitura do founder. **Com os eventos segmentados no ar, voltar a enviar `fbc` no Purchase principal deixa de ser perigoso**, porque a otimização passa a rodar em `PurchaseClickSorteios`/`PurchaseClickGroup`. O `fbc` volta a ser *identidade* (melhora EMQ) em vez de *atribuição* (inflava ROAS) — que é exatamente a distinção registrada no `revisao-regras-2026-10-10.md`. **Recomendo religar**, mas só depois que o evento segmentado estiver recebendo volume, nunca antes.

---

## 6. Plano de alto volume de criativo

O founder quer volume alto de criativos e testes. A infra existe: `apps/video-studio` (Remotion + receitas YAML validadas em 10/10), `@ladeira` com 5 ângulos escritos.

### 6.1 O diagnóstico do criativo atual — o dinheiro está no lugar errado

23 anúncios rodando. Retenção a 25% (p25 ÷ impressões) por gasto:

| Anúncio | Gasto | CTR | Retenção 25% |
|---|---:|---:|---:|
| Copy Carro 03 | **R$ 2.258** | 2,83% | **16,8%** |
| Copy Carro 02 | **R$ 1.736** | 2,92% | **19,8%** |
| 100 Números | R$ 746 | 4,80% | 26,7% |
| **Edit IA** | R$ 651 | 3,62% | **40,4%** |
| Dia das Crianças | R$ 382 | 4,16% | 11,1% |
| CARROCEL Dia das Crianças | R$ 348 | 2,15% | **3,5%** |
| PUBLI Gincana | R$ 328 | 1,21% | **2,4%** |
| **Entra pro grupo** | R$ 106 | 0,53% | **39,4%** |
| **Jogo das Dezenas** | R$ 86 | 0,77% | **34,5%** |

> ⚠️ **Ressalva metodológica:** o Módulo 12 define Hook Rate como *views de 3s ÷ impressões*. Eu usei p25 ÷ impressões como proxy, porque `video_play_actions` na conta é basicamente autoplay (56.297 plays em 58.078 impressões — não discrimina nada). O p25 é mais **severo** que o Hook Rate de 3s, então os números acima não devem ser comparados diretamente contra o corte de 30% do módulo. Para aplicar o corte oficial, é preciso puxar `video_3_sec_watched_actions`.

**Três leituras acionáveis:**

1. **Os dois maiores gastos (R$3.994 juntos, 44% da verba) são os de pior retenção** (16,8% e 19,8%). Pela árvore do Módulo 07: retenção baixa com CTR alto = **o gancho atrai mas o corpo não segura** → trocar os primeiros 3 segundos, não a oferta.
2. **Os melhores retentores estão sem verba.** "Edit IA" (40,4%) com R$651, "Entra pro grupo" (39,4%) com R$106. Mas atenção: "Entra pro grupo" tem **CTR de 0,53%** — retém quem assiste e não gera clique. É um caso de *copy/CTA fraca* na árvore do Módulo 07, não de criativo ruim.
3. **Carrossel e PUBLI são estruturalmente ruins neste nicho** (2,2–3,5%). Recomendo **cortar esses formatos** e concentrar em vídeo.

### 6.2 Cadência proposta (protocolo 3:2:2, Módulo 07 §1)

Com a infra de receitas YAML, o custo marginal de uma variação caiu para quase zero — foi exatamente o que validamos na Garantido (4 variações geradas só editando YAML, sem tocar em `.tsx`).

**Onda semanal:**
- **2 ângulos** por onda (dos 5 já escritos: Prêmio, Prova, Confiança, Acessibilidade, Comunidade)
- **× 3 ganchos** (os primeiros 3s variando — é o eixo que o diagnóstico acima mostra ser o gargalo)
- **× 2 copies**
- = 12 combinações, ~6 vídeos-base por onda

**Prioridade de produção para a próxima onda**, derivada do diagnóstico:
1. **3 ganchos novos para o conceito "Copy Carro"** — o corpo funciona (gasto alto, CTR 2,8–2,9%), o início não segura. Maior ganho por esforço.
2. **Reforçar "Edit IA"** com verba — melhor retenção da conta, subalimentado.
3. **Reescrever o CTA de "Entra pro grupo"** — retenção ótima, clique péssimo. É copy, não vídeo.

**Critérios de corte (Módulo 12 §2), a aplicar semanalmente:**
- Retenção < 30% **e** CPA > CAC máximo → **matar**
- Retenção ≥ 30% **e** CPA > CAC máximo → iterar copy/LP, manter o vídeo
- CTR outbound < 1,0% → problema de copy/CTA (caso "Entra pro grupo")
- Formato com retenção < 5% → cortar o formato inteiro (caso Carrossel/PUBLI)

---

## 7. Riscos e o que ainda não dá para saber

**Não dá para saber hoje:**
- **Qual parcela dos 95 clientes novos veio do anúncio.** Sem atribuição, o contrafactual é desconhecido. Essa é a lacuna central.
- **Se a coorte Out S2 vai maturar como as de ago/set.** Tem 3 dias de observação. A projeção de R$507–594 é extrapolação de coortes anteriores, não medição.
- **Se a queda do ROAS reportado (83x→10x) é saturação de leilão ou diluição do artefato.** Os dois efeitos estão sobrepostos.

**Riscos ativos:**
- **Concentração extrema:** 7 clientes = 24,6% da receita semanal. Se duas baleias saírem, o impacto supera qualquer ganho de mídia do período.
- **Escalar sem exclusão (B4)** aumenta proporcionalmente o gasto em quem já compraria sozinho.
- **Campanha 3 queimando verba** contra um público de 20 pessoas.
- **Dependência de correção de terceiros:** a home do cliente não carrega GTM nem repassa UTM. O catálogo contorna para tráfego pago, mas não cura o site.

**O que mudaria a recomendação rapidamente:** se, com os eventos segmentados no ar, o `PurchaseClickSorteios` mostrar CPA de prospecção abaixo de ~R$100 com volume ≥50/semana, a trava cai e a escalada para R$3k passa a ser justificada — e aí eu seria a favor, com a cadência de 15–20% da §5.3.

---

*Fontes: Graph API ao vivo (insights por campanha/dia/segmento/anúncio, `customaudiences`, `/stats`), `dados_brutos_completos_{3,90}dias.csv` (reconstruídos 10/10), `relatorio_financeiro_90dias.csv`. Metodologia: MBA Meta Módulos 02, 03, 07, 12 e `PLANEJAMENTO_ESTRATEGICO_90DIAS.md`. Histórico: `gates-status.yaml`, `auditoria-tracking-2026-10-10.md`, `revisao-regras-2026-10-10.md`, `funil-conversao.md`, `setup-guide-campanhas-r2k-2026-10-09.md`.*
