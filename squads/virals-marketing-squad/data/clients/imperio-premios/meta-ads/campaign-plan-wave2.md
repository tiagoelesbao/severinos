# Wave 2 — Império Prêmios: escala pra até R$3k/dia + cadência de criativos

**Contexto:** a Wave 1 (`campaign-plan-wave1.md`, 2026-10-05) definiu a estrutura de R$1.000/dia e já previa esta fase — seção 7 ("Quando e como escalar") condiciona a escalada a evidência de CPA marginal, não a uma data fixa. O founder pediu agora (2026-10-09) orientação pra subir até R$3k/dia e perguntou especificamente se há "alguma estrutura avançada que identificamos antes" — a resposta curta é **sim, já está desenhada, só falta executar**: é exatamente a seção 7 da Wave 1 mais a Campanha 2 (CBO Creative Testing) que consta como `proximo_passo_imediato` em `gates-status.yaml` desde 2026-10-07 e nunca foi criada.

**Atualização 2026-10-09 (respostas do founder):** (1) R$3k é orçamento **diário**, confirmado — e ele quer comparar 3 patamares (R$2.000 / R$2.500 / R$3.000/dia) antes de escolher, não ir direto pro teto; (2) a campanha subida hoje foi **ajuste na Campanha 1 existente**, não uma Campanha 2 nova — a Campanha 2 (CBO Teste) segue como próximo passo real, ainda não criada; (3) o **Existing Customer Budget Cap já está ativo** — deixa de ser bloqueio, removido da lista de pendências.

Este documento não reescreve a Wave 1 — estende ela com o que mudou desde então (volume real, EMQ, mitigação do bug de fbc) e formaliza o gatilho de escala que já estava condicionado a acontecer.

---

## 1. O que mudou desde a Wave 1 (por que agora é diferente de 2026-10-05)

| Fato | Na Wave 1 (05/10) | Agora (09/10) |
|---|---|---|
| Volume real do negócio | Desconhecido (cold start, campanha parada há dias) | **~1.700-1.800 pedidos pagos/dia** confirmado (webhook tempo real + CSV + Graph API cruzados) |
| EMQ do evento Compra | 0.0 (não populado ainda) | **7.5/10**, subindo — telefone/IP/UA/external_id/nome/sobrenome/país em 100% |
| Dedup Pixel×CAPI | Não verificado | **"Atende às boas práticas"** confirmado no Events Manager |
| Bug de fbc congelado (plataforma) | Não descoberto | Descoberto, causa raiz confirmada, **mitigação própria ativa** (GTM captura `_fbc` genuíno, `capi_client.py` prioriza essa fonte) — cobertura ainda cresce com o tráfego que passa por páginas com GTM |
| Campanha 2 (CBO Creative Testing) | Planejada, não criada | Ainda não criada — **gargalo real pro pedido de "bastante criativos"** |
| Inflação de "Compras" no Ads Manager | N/A | Diagnosticada e mitigada parcialmente (871 compras/R$1.084,35 de gasto em um dia = fisicamente impossível, causa = fbc sempre "fresco") |

**Leitura prática:** o sinal de otimização do Meta está sensivelmente melhor hoje do que na Wave 1, mas ainda não está "limpo" — a mitigação do fbc é recente e a cobertura ainda está subindo. Isso importa pra decisão de orçamento na seção 3.

---

## 2. Sobre a campanha que o founder acabou de subir

Config reportada: atribuição por clique = 1 dia, engajamento = nenhuma, visualização = nenhuma, variações extras de criativo. **Confirmado pelo founder: isso foi um ajuste dentro da Campanha 1 (Advantage+) já existente, não uma campanha nova.** A Campanha 2 (CBO Teste de Criativos) continua **não criada** — é o item real em aberto da seção 3.

Isso **não é uma configuração isolada** — é a continuação direta de uma investigação já registrada em `gates-status.yaml` (`inflacao_resultados_reportados_causa_raiz_2026_10_08`): o ad set anterior tinha `CLICK_THROUGH 1 dia` mas ainda com `VIEW_THROUGH 1 dia` + `ENGAGED_VIDEO_VIEW 1 dia` ativos (preset padrão da interface, não intencional), e o founder já estava "testando campanha nova sem nenhum" desses dois. **Confirmo que essa é a direção certa**, pela mesma razão documentada: com o bug de fbc congelado ainda em mitigação parcial, qualquer janela de atribuição mais larga que clique puro aumenta a superfície de contaminação (visualização/engajamento são ainda mais fáceis de "inflar" artificialmente do que clique). Manter só clique = 1 dia até a cobertura do fbc genuíno (via GTM) estar validada com mais volume.

**Existing Customer Budget Cap — confirmado ativo pelo founder (09/10).** Resolve o risco de contaminação de ROAS por "Clientes existentes"/"Público engajado" que tinha inflado o agregado artificialmente em 07/10 (R$317 de clientes existentes + R$227,50 de público engajado vs. só R$19 de público novo, ROAS 0,47 — prejuízo real em prospecção). Deixa de ser bloqueio; segue só como item a observar na seção 5 (confirmar com dado que a distorção realmente diminuiu, não assumir que ativar o toggle já resolveu 100%).

---

## 3. Estrutura recomendada — 3 patamares de orçamento diário

Confirma o padrão **Performance 5** (Módulo 01 §4, Módulo 05 §2) que a Wave 1 já usa, agora com a 4ª campanha que a própria Wave 1 previa "quando escalar" (§7, item 3). A distribuição percentual entre campanhas é a MESMA nos 3 patamares — só o valor em R$ muda:

| Campanha | % | R$2.000/dia | R$2.500/dia | R$3.000/dia |
|---|---|---|---|---|
| 1 — Advantage+ Vendas (existente) | 60% | R$1.200 | R$1.500 | R$1.800 |
| 2 — CBO Teste de Criativos (CRIAR) | 20% | R$400 | R$500 | R$600 |
| 3 — Retargeting (CRIAR) | 15% | R$300 | R$375 | R$450 |
| 4 — Reativação "Desinteressados" (CRIAR) | 5% | R$100 | R$125 | R$150 |
| **Total** | 100% | **R$2.000** | **R$2.500** | **R$3.000** |

**O que cada campanha faz, igual nos 3 patamares:**
- **Campanha 1 (Advantage+ Vendas):** já existe, hoje em R$700/dia — qualquer um dos 3 patamares é um aumento real. Otimização por VALOR, não volume — justificado pela concentração de receita (top 10% dos compradores = 85,3% do faturamento histórico, brief.yaml). CPA fixo não é a métrica certa aqui (mesma razão da Wave 1). Existing Customer Budget Cap já ativo (§2).
- **Campanha 2 (CBO Teste de Criativos) — AINDA PRECISA SER CRIADA DO ZERO**, confirmado: o que subiu hoje foi só ajuste na Campanha 1. Protocolo 3:2:2 completo (Módulo 07 §1): 2 sets de ângulo, cada um com 3 vídeos (mesmo conceito, 3 ganchos) × 2 copies × 2 títulos. Dos 5 ângulos já escritos (copy-angles, Prêmio/Prova/Confiança/Acessibilidade/Comunidade), escolher os 2 com maior volume de formato pronto no pipeline de vídeo (ver §4) pros 2 sets.
- **Campanha 3 (Retargeting) — CRIAR.** Site visitors + engajamento, excluindo compradores recentes. Público já existe: `audiences/audiencia_recompra_90dias.csv` (1.538).
- **Campanha 4 (Reativação "Desinteressados") — CRIAR.** Prevista na Wave 1 §7 item 3. Lista de 550.763 contatos dormentes já carregada no Ads Manager (gates-status.yaml, `custom_audiences_upload`). Mensagem própria — ângulo recomendado: Acessibilidade ("é mais simples do que parece", copy-angles-2026-10-09.md).

### Qual patamar começar — recomendação: **R$2.000/dia**, não o maior

Não é "pode pagar mais, então começa no teto". Três razões concretas pra começar em R$2.000, não R$3.000:

1. **A Campanha 1 vai de R$700 pra R$1.200/dia mesmo no patamar mais baixo — já é +71%.** O Módulo 02 recomenda nunca saltar mais que 15-20% por janela de 48-72h numa campanha que já aprendeu, pra não "chocar" o algoritmo. Um salto estrutural (criar 3 campanhas novas de uma vez) já é inevitavelmente maior que isso — ir direto pro patamar de R$1.800 na Campanha 1 (R$3k total) empilha dois choques ao mesmo tempo (budget + estrutura nova).
2. **O sinal de otimização só ficou minimamente confiável HOJE** (mitigação do fbc congelado, GTM capturando `_fbc` genuíno) — a cobertura ainda está subindo, não foi validada com uma semana limpa de volume. Comprometer o patamar mais alto antes de confirmar que o sinal aguenta é apostar no CPA marginal errado.
3. **As 3 campanhas novas começam do zero de aprendizado de qualquer forma**, independente do patamar escolhido — R$400/dia já é confortável pra Campanha 2 sair da fase de aprendizado dado o volume real do negócio (~1.700 pedidos/dia, evento de conversão barato e frequente). Não precisa de mais orçamento só pra "ocupar espaço".

**Caminho recomendado:** começar em R$2.000/dia agora. Depois de 7 dias corridos sem edição de estrutura (§5), medir CPA marginal — se `<= CAC_máximo`, subir pra R$2.500, repetir o ciclo, depois R$3.000. O mesmo gatilho de 15-20% por 48-72h da seção 5 já cobre essa progressão — não é um passo novo, é aplicar a régua que já existe.

---

## 4. Cadência de criativos — conectando ao pipeline que já existe

O founder quer volume de criativos no pipeline de produção. A infraestrutura pra isso **já existe e está rodando** (não é um pedido novo de ferramenta): `apps/video-studio` (Remotion, renderização programática, já produzindo pra Império e Garantido), squad de copy com `@ladeira` (Master Copywriter, 5 ângulos já escritos pro Império em `copy-angles-2026-10-09.md`).

Cadência recomendada (Módulo 07 §1, protocolo 3:2:2):
- **Onda inicial (Campanha 2, lançamento):** 2 ângulos × 3 vídeos × 2 copies × 2 títulos = 12 combinações possíveis, mas CBO testa a combinação, não exige upload de 12 criativos distintos — na prática, **6 vídeos-base** (3 por ângulo, ganchos diferentes nos primeiros 3s) + 2 variações de copy por vídeo cobre o protocolo sem sobrecarregar o pipeline de produção logo de saída.
- **Cadência contínua:** 1 novo ângulo ou gancho por semana entrando na Campanha 2, seguindo a árvore de diagnóstico do Módulo 07 §2 pra decidir o que fazer com o que já está rodando:
  - Hook Rate < 30% → trocar os 3 primeiros segundos (não é a oferta que está errada, é o gancho)
  - Hold Rate < 20% → "Narrative Collapse", vídeo perde atenção depois do gancho — revisar roteiro/ritmo
  - CTR Outbound < 1,0% → copy/CTA fraca
  - LP Connection < 70% → gargalo de carregamento, não de criativo
  - Cart Rate < 10% → mismatch entre a mensagem do anúncio e a oferta real da LP
- **Critério de promoção:** vencedor validado na Campanha 2 migra manualmente pra Campanha 1 (mesmo mecanismo da Wave 1) — não deixar criativo "parado" testando indefinidamente.
- **Critério de corte (Módulo 12 §2, máquina de estados):** CPA atual > CAC máximo E Hook Rate < 30% → **matar sem piedade** (literal, o módulo usa essa palavra). CPA atual > CAC máximo mas Hook Rate >= 30% → iterar copy/LP antes de cortar o vídeo.

---

## 5. Gates de decisão entre os patamares (e pra escalar além de R$3k)

Mesma régua da Wave 1 §7, formalizada e aplicável a CADA degrau (R$2.000→R$2.500→R$3.000→além):

1. **Rodar o patamar atual por mínimo 7 dias corridos sem edição significativa de estrutura/budget** antes de julgar. Importante: esse relógio **começa agora** (quando o patamar novo entrar no ar), não em 06/10 — o sinal de otimização só ficou minimamente confiável depois da mitigação do fbc (09/10). Qualquer leitura de CPA marginal antes disso está contaminada pela mesma inflação já diagnosticada.
2. **CPA marginal = ΔGasto / ΔConversões** (Módulo 12 §1.1) entre o nível atual e o anterior. Se `CPA_marginal <= CAC_máximo` → sobe pro próximo patamar (15-20% por janela de 48-72h), nunca dobrar de uma vez (choque de algoritmo, Módulo 02).
3. Acompanhar por **"Novo público" especificamente**, não o agregado (achado de 07/10: agregado mostrava ROAS ~7x, prospecção real estava em 0,47x/prejuízo por contaminação de clientes existentes). Existing Customer Budget Cap já ativo (§2) — confirmar com dado, ao longo dos primeiros dias, que a distorção realmente diminuiu, não assumir que o toggle sozinho resolveu 100%.
4. Reconfirmar meta de margem líquida com o cliente antes de passar de R$2.500/dia total (Wave 1 §7 item 4, segue pendente em `gates-status.yaml` — 10% vs 15%).

---

*Fundamentação: Módulo 01 §4 (Performance 5), Módulo 03 (Learning Phase, 50/7), Módulo 05 §1-2 (Advantage+ Engine, Existing Customer Budget Cap), Módulo 07 §1-2 (protocolo 3:2:2, árvore de CRO), Módulo 12 §1-2 (CPA marginal, máquina de estados de decisão). Dados de negócio: brief.yaml, gates-status.yaml, campaign-plan-wave1.md, PLANEJAMENTO_ESTRATEGICO_90DIAS.md.*
