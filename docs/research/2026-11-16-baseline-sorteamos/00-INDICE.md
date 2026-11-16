# Baseline Sorteamos — índice

> **O que é isto.** A especificação da plataforma **Sorteamos** (hoje rodando o Império
> Prêmios em `painel.rapidinhas24hr.com`), extraída sem acesso ao fonte — que não existe mais.
> Serve de alvo de paridade para o `apps/lotemania`, o sucessor.
>
> **Levantado em 2026-11-16 por @analyst (Atlas), sem nenhuma chamada à API da plataforma.**

---

## Por que esta baseline é offline

A plataforma tem **sessão única**: autenticar de novo **derruba a sessão aberta**. Foi assim que
cinco jobs agendados nossos, relogando em paralelo, tiraram o founder do painel no meio do
trabalho dele (achado 2026-10-24, registrado em `services/Meta/imperio-premios/client_api.py`).
No momento deste levantamento o founder estava com o painel aberto — então **um `login()` meu
derrubaria a sessão dele.** Nenhuma chamada foi feita.

> **Nota sobre a flag de pausa.** `client_api.is_paused()` estava `True`. Isso significa que **os
> nossos cinco jobs agendados estão parados** — é o founder desligando a automação justamente
> para trabalhar no painel em paz. **A flag não proíbe a API**; a razão para não chamar é a sessão
> única, acima. O briefing original descrevia a flag com a semântica invertida, e a correção veio
> do coordenador durante a execução. Registro aqui para que ninguém reaprenda isso errado.

Consequência direta: **nada aqui foi observado ao vivo por mim.** A baseline foi reconstruída a
partir do nosso próprio código de produção que consome a Sorteamos há meses, de artefatos de
dados gravados no repositório, e do briefing. Cada afirmação carrega a sua procedência.

A observação ao vivo está sendo feita em paralelo pelo coordenador, por navegação no Chrome já
autenticado do founder — sem login novo. **[`05-pendente-de-observacao.md`](05-pendente-de-observacao.md)
é o roteiro dessa navegação**, e por isso é entregável de primeira classe, não rodapé. Quando as
observações voltarem, elas entram nos documentos 01 a 04.

---

## Os documentos

| Documento | O que cobre | Confiança geral |
|---|---|---|
| [`01-api.md`](01-api.md) | Superfície da API: 3 endpoints REST, o webhook `order.paid`, campo por campo dos objetos `order` e `product`, o contrato de export de 25 colunas | **Alta** nos campos que o nosso pipeline lê em produção; **nula** nos endpoints que nunca consumimos |
| [`02-dominio.md`](02-dominio.md) | O modelo de domínio no vocabulário do cliente: sorteio, título, compra, reserva, baixa manual, afiliado, capitalizadora, prêmio, ganhador | **Alta** no núcleo transacional; **média** nas bordas (capitalizadora, filantropia) |
| [`03-telas.md`](03-telas.md) | As telas do painel. Barra lateral de 13 itens, menu de ações por sorteio, modal de faturamento, tela de webhooks. **O resto está marcado "não observado"** | **Baixa** — é o documento mais incompleto, por desenho |
| [`04-lacunas.md`](04-lacunas.md) | Tabela de paridade capacidade × Sorteamos × lotemania × veredito. A coluna do lotemania foi lida no código, não inferida | **Alta** na coluna lotemania; herda a confiança de 01-03 na coluna Sorteamos |
| [`05-pendente-de-observacao.md`](05-pendente-de-observacao.md) | **O roteiro de navegação.** Para cada pendência: que tela abrir, que pergunta exata responder, que evidência serve | — |

---

## Legenda de procedência

Usada em todos os documentos. **Sem exceção: nenhuma linha afirma algo sem um destes marcadores.**

| Marcador | Significado | Posso construir código em cima? |
|---|---|---|
| `[PROD]` | Confirmado por código nosso que roda **em produção contra a API real**, com comentário datado de observação ao vivo (ex.: "confirmado ao vivo 2026-10-08") | **Sim.** É o grau mais alto disponível sem o painel |
| `[AMOSTRA]` | Confirmado por artefato de dados gravado no repositório, capturado da API real (JSON/CSV) | **Sim** |
| `[BRIEFING]` | Fornecido na missão pelo requisitante, que observou no painel ou em CSV real. Não re-verificado por mim | **Sim, com a ressalva de que a fonte é relato** |
| `[RELATO]` | Afirmação de segunda mão feita dentro deste repositório — tipicamente um comentário em `apps/lotemania` descrevendo "o original". **Quem escreveu pode ter observado; eu não** | **Não.** Tratar como pista de investigação |
| `[DEFENSIVO]` | O nome do campo aparece no nosso código **apenas como fallback**. Nunca foi confirmado que a API devolve isso. Frequentemente é um palpite de quem escreveu o fallback | **Não.** Confirmar primeiro |
| `[INFERIDO]` | Dedução minha. A base da dedução vem escrita na mesma linha | **Não sem confirmar** |
| `[NÃO OBSERVADO]` | Sei que existe (aparece num menu, num log, num comentário) mas não sei o que faz nem o que mostra | **Não** |

Regra que vale para os cinco documentos: **"não confirmado" é resposta preferível a um palpite
plausível.** Esta baseline vira especificação de implementação — um campo inventado aqui vira
código errado lá.

---

## Fontes usadas

Todas offline, todas dentro deste repositório:

| Fonte | Linhas | O que entregou |
|---|---|---|
| `services/Meta/imperio-premios/client_api.py` | 574 | Os 3 endpoints REST, paginação, filtros, o objeto `order` inteiro, status, armadilhas datadas |
| `services/Meta/imperio-premios/bi_aggregator.py` | 2.222 | O objeto `product` (`numbersConfig`, `awards`, `winners`), taxa de plataforma, modelo financeiro |
| `services/Meta/imperio-premios/snapshot_sorteios.py` | 189 | Campos de vitrine do produto, semântica real de `status` vs `qtyFree`, Cloudflare |
| `services/Meta/imperio-premios/collector.py` | 235 | Status terminais do sorteio |
| `services/Meta/imperio-premios/reports.py` | 229 | Modelo de margem, taxa de plataforma 5% |
| `apps/webhook-imperio-capi/api/order-paid.js` | ~230 | Formato do evento `order.paid` e a tela de webhooks do painel |
| `apps/utm-capture-imperio/api/capture.js` | ~110 | O que a plataforma **não** persiste (UTM) |
| `services/Meta/imperio-premios/ativos_debug.json` | — | Amostra real de 6 produtos |
| `squads/.../imperio-premios/meta-ads/*.md` | ~3.700 | Comportamento observado da plataforma: `fbc` congelado, UTM zerada, pixel duplicando, CAPI nativa horária |
| `apps/lotemania/src/**` | 14.462 | A coluna lotemania de `04-lacunas.md` |

**Nada foi commitado.** Os arquivos ficam na árvore de trabalho.
