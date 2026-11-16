# BI Império — Dashboard multi-página

**URL pública (com login): https://imperio-bi.vercel.app**

Diferente da LP (`apps/imperio-premios-lp`), este BI é **público de
propósito** — pra poder ser compartilhado com o cliente, não só com quem
tem login na conta Vercel do time. O acesso é controlado por um painel de
login **nosso** (não é Vercel SSO/Password Protection — essa exige plano
Pro, indisponível).

## Senha

Definida em `BI_PASSWORD` (env var da Vercel, Production + Preview). Pra
ver/trocar:

```bash
cd apps/BI/imperio-premios
vercel env ls
vercel env rm BI_PASSWORD production
vercel env add BI_PASSWORD production --value "NOVA_SENHA" --yes
```

Depois de trocar, redeploy (`vercel --prod --yes`) pra aplicar.

## Como o login funciona (arquitetura)

- `middleware.js` — roda em TODA rota (exceto `login.html`/`api/login`),
  via Vercel Edge Middleware. Sem cookie `bi_auth` válido (hash SHA-256 da
  senha), redireciona pra `/login.html`. Bloqueia também acesso direto aos
  `data-*.json` — não é só a página HTML que fica protegida.
- `api/login.js` — função Edge que recebe o POST do form de login, compara
  com `BI_PASSWORD`, e se bater, seta o cookie (`HttpOnly`, `Secure`,
  `SameSite=Lax`, 30 dias).
- `login.html` — formulário simples, sem framework.
- Exige `package.json` com `"type":"module"` + dependência
  `@vercel/functions` (única dependência do projeto) — isso é uma mudança
  real em relação à LP (zero-dependência): middleware do Vercel precisa
  disso pra funcionar. Vercel instala sozinho no deploy (`npm install`
  automático), não muda o fluxo de `vercel --prod --yes`.

**Testado e confirmado 2026-10-07**: sem cookie → bloqueado (HTML e JSON);
senha certa → cookie setado, acesso liberado; senha errada → rejeitado.

## Arquitetura de páginas

Baseada em pesquisa de padrões reais de BI dashboard design (Stephen Few —
dashboards estratégico/operacional/analítico; Kimball — fato/dimensão; KPI
Tree/North Star) — ver
`squads/virals-marketing-squad/data/clients/imperio-premios/meta-ads/bi-arquitetura-profissional.md`
pro documento de pesquisa completo.

- `executiva.html` — estratégico, founder+cliente, poucos números.
- `operacional.html` — tático, quem opera a campanha, atualiza a cada 15min.
- `produto.html` — analítico. **Redesenhada em 2026-10-08**: era um resumo
  do que a Executiva já mostrava (LTV proxy, top sorteios por faturamento,
  faturamento por dia). Agora é investigação da **rodada de sorteio como
  produto** — preço por número, estrutura de prêmio, giro e horário. Ver
  seção "Página Produto" abaixo.
- `qualidade.html` — diagnóstico específico deste cliente (prova de que o
  tracking funciona — UTM%, fbc fresco/expirado, status dos scripts,
  pendências do Events Manager).

### Filtro de período (componente compartilhado)

`periodo.js` serve Executiva, Operacional e Produto. Presets: **Hoje,
Ontem, Últimos 7 dias, Últimos 30 dias, Desde o início da campanha, Toda a
janela puxada, Período/dia personalizado**. Uma página pode escolher um
subconjunto passando `presets: [...]` (Produto omite "desde o início da
campanha" — não é uma página sobre a campanha de Ads). Preset novo entra
**sempre aqui**, nunca na página que pediu, pra as três ganharem junto.

## Página Produto — a rodada como produto

Decisões que a página existe pra sustentar: **preço por número**,
**tamanho/formato do prêmio**, **horário de lançamento**.

**Achado que organiza a página (medido em 364 rodadas / 14 dias,
2026-10-08):** 360 de 360 rodadas encerradas venderam 100% dos 100 números.
A regra do produto é "sorteio após a venda de todos os números", então
**taxa de esgotamento não distingue nada** — o recurso escasso é TEMPO
(mediana 2,3h até fechar, de 15min a 7 dias). Daí as métricas centrais
serem `horas_ate_esgotar` e `lucro_por_hora`, não conversão/sell-through.

| Bloco | Gráfico | Decide |
|---|---|---|
| 1 | 8 cards (giro, payout, preço, margem) | panorama |
| 2 | Dispersão preço × horas até esgotar (log-log + reta OLS) | preço |
| 3 | Dispersão payout × lucro/hora · colunas nº de ganhadores × horas | prêmio |
| 4 | Colunas lucro/hora + linha horas, por faixa de preço | alocação de portfólio |
| 5 | Linha hora do dia (receita + pedidos, com janelas PT-Rio) · colunas hora de criação × horas | horário |
| 6 | 2 pizzas (faturamento por porte · por faixa de preço) | composição |
| 7 | Colunas 00-99: posição média de venda + banda ±2EP · dezena · dígito final | quais números promover |
| 8 | Linha de Lorenz + Gini | concentração de receita |
| 9 | Colunas números por pedido · faixas de valor | perfil do pedido |
| 10 | Tabela ordenável de rodadas | drill-down |

**Lib de gráfico:** Chart.js 4.5.1 UMD via jsDelivr, **versão pinada**.
Única dependência de runtime da página. uPlot é menor mas é motor de série
temporal (sem pizza nem dispersão categórica); ECharts passa de 1MB. O UMD
do Chart.js tem 208KB (~70KB gzip) e cobre pizza + colunas + linha +
dispersão + eixo duplo + misto sem build step — que é a restrição
arquitetural do resto da pasta.

**Teste de uniformidade na escolha de número.** Em rodada esgotada todo
número vende exatamente uma vez, então contar frequência não informa nada.
A preferência do jogador aparece na **ordem de venda**: cada número recebe
sua posição relativa (0 = primeiro pago, 1 = último) e a média por número é
comparada com 0,50 (valor esperado sob escolha aleatória), com erro padrão
0,2887/√k. Ressalva registrada na própria página: dentro de uma rodada a
venda é **sem reposição**, então posições de dois números da mesma rodada
não são independentes — a banda de ±2EP é ordem de grandeza, não p-valor.
Medido: ~63 de 100 números fora da banda; dezena 80 é a mais lenta, "00",
dobradinhas (11/22/33/44/77/99) e 13 são as mais rápidas.

Cada página lê seu próprio `data-{pagina}.json` (não um `data.json` único)
— ver `bi_aggregator.py::dividir_por_pagina`.

## Como os dados são gerados

```bash
python services/Meta/imperio-premios/bi_aggregator.py --dias 14
cd apps/BI/imperio-premios && vercel --prod --yes
```

Automatizado via Windows Task Scheduler (`BI-Imperio-Refresh`, roda
`refresh.ps1` a cada 30min — ajustado em 2026-10-13 para preservar cota diária de deploys da Vercel).

## KPIs financeiros — fórmulas e fontes (cuidado ao mudar)

Ver `calcular_kpis_financeiros()` em `bi_aggregator.py`. Dois pontos que já
causaram erro real nesta sessão, não repetir:

1. **Nunca comparar gasto de campanha contra receita de uma janela maior
   que a vida da campanha** — já inflou ROAS de ~3,5x pra ~40x numa
   versão anterior. `CAMPANHA_INICIO` filtra isso.
2. **`CAC_max` usa a fórmula do
   `docs/meta_mba/PLANEJAMENTO_ESTRATEGICO_90DIAS.md` seção 2**
   (`MC - Faturamento×%ML`, teto de ORÇAMENTO TOTAL pro período,
   depende da meta de margem líquida do cliente — ainda indefinida, por
   isso mostramos 2 cenários) — **não** a fórmula do diagrama genérico do
   Módulo 01 raiz (`Ticket × MC%`, um conceito diferente). Usar a errada
   aqui já aconteceu uma vez (corrigido 2026-10-07) — a do plano de 90
   dias é a que vale pra este cliente especificamente.

## Limitações conhecidas

- "Novo público/Clientes existentes" do Meta não está disponível via API
  (recurso só de UI do Advantage+) — usamos classificação própria por
  telefone/CPF, com viés conhecido (ver `aviso_metodologia` no JSON).
- LTV proxy é limitado à janela de `--dias` puxada, não é LTV real.
- Concentração/Gini da página Produto é calculada pra **toda a janela
  puxada** e não responde ao filtro de período (Gini não é somável por dia;
  recalcular por período exigiria mandar o detalhe por comprador × dia, o
  que multiplicaria o JSON). Mesmo tratamento já dado ao LTV proxy.
- A página Produto usa só pedidos **pagos** — a API não devolve histórico de
  reserva não paga por pedido, só o agregado `qtyReserved` ponto-a-ponto do
  sorteio. Por isso não há métrica de abandono de PIX por rodada.
- Rodada sem prêmio identificável (sem `awards` e sem valor no título) fica
  marcada e **fora** das médias de margem/payout — não inventamos custo que
  a API não informa.
- Sem integração com SendFlow (gestão do grupo de WhatsApp) — pendente de
  credenciais/API docs do founder.
