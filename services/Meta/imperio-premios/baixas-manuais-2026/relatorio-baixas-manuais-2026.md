# Relatório — Baixas Manuais em Sorteios (Império Prêmios)

**Período coberto:** 22/06/2026 a 19/10/2026 (120 dias — toda a janela de dados disponível na API da plataforma até o momento da coleta)
**Gerado em:** 19/10/2026
**Fonte dos dados:** API oficial da plataforma de sorteios do Império (somente leitura), coleta completa e fresca, sem amostragem.

---

## ⚠️ Limitação crítica — leia antes de tudo

A pergunta central do cliente foi **"qual foi o ADM/usuário que deu a baixa"**. Isso **não pode ser respondido com os dados hoje disponíveis**.

A plataforma expõe, por pedido, um campo `approvedBy` que indica **a categoria** de quem aprovou o pagamento:
- `paysure` / `pay2m` → gateway de pagamento automático (baixa real, cliente pagou).
- `admin` → **baixa manual**, feita por alguém com acesso ao painel administrativo.
- vazio → pedido ainda não aprovado.

O campo `admin` **não identifica qual usuário/login específico** fez a ação — não existe, na API consultada, um ID, e-mail ou nome de operador associado à baixa manual. Ou seja: eu consigo dizer com certeza **quais ações tiveram baixa manual, quantas, e se premiaram** — mas **não consigo apontar a pessoa**, porque essa informação não é exposta por este acesso.

Se a plataforma tiver um **log de auditoria separado** (painel administrativo, banco interno, ou um endpoint diferente do que usamos aqui), isso precisaria vir de outro acesso que eu não tenho hoje. Recomendo pedir isso diretamente ao time da plataforma/fornecedor do sistema — é o próximo passo natural para fechar a lacuna que o cliente descreveu no Discord ("quem está aprovando manual internamente").

Todo o restante deste relatório é baseado em dados reais, extraídos agora, sem nenhuma estimativa ou suposição.

---

## 1. Metodologia

- **Definição de "baixa manual":** pedido (`ApprovedBy == "admin"`) — ou seja, teve pelo menos um número de bilhete aprovado manualmente no painel, em vez de pelo gateway de pagamento.
- **Coleta:** script de coleta já existente e validado do projeto (`collector.py`), rodado agora para os últimos 120 dias — cobre **toda a história disponível na plataforma** (o pedido mais antigo encontrado é de 22/06/2026; não há dados anteriores a essa data na API).
- **"Contemplação":** um número aprovado manualmente é cruzado contra a lista oficial de ganhadores (`winners[]`) de cada sorteio, buscada ao vivo na API no momento da análise. Se o número baixado manualmente aparece como ganhador, a ação é marcada como **contemplada** e o valor do prêmio correspondente é somado.
- **Reuso de lógica já validada:** a regra de negócio (o que conta como baixa manual, como cruzar com ganhadores) **não foi reinventada agora** — foi reutilizada diretamente do motor de BI já existente no projeto (`bi_aggregator.py`), que já tinha essa lógica testada desde 17/10/2026.
- **Nota sobre completude:** durante a busca dos sorteios (para pegar a lista de ganhadores) houve um erro transitório (HTTP 500) em uma página da paginação, com recuperação automática. O total de sorteios retornado nessa etapa (3.660) ficou muito próximo do total da coleta principal (3.658, feita ~15-20 min antes) — a diferença é compatível com novos sorteios criados nesse intervalo, não com dados faltando.

---

## 2. Resumo geral (120 dias)

| Métrica | Valor |
|---|---|
| Total de pedidos no período | 218.641 |
| Total de ações/sorteios no período | 3.660 |
| **Pedidos com baixa manual** | **1.801** |
| **Ações com pelo menos 1 baixa manual** | **1.038** |
| Números de bilhete aprovados manualmente | 7.194 |
| Valor total dos pedidos com baixa manual | R$ 157.801,50 |
| **Ações contempladas por número baixado manualmente** | **118** |
| **Valor total pago em prêmios de baixas manuais** | **R$ 89.063,00** |

Em outras palavras: de 3.660 ações rodadas nos últimos 4 meses, **1.038 (28%) tiveram pelo menos uma baixa manual**, e em **118 dessas (11,4% das que tiveram baixa manual)**, o próprio número baixado manualmente foi sorteado como ganhador — gerando um prêmio pago de **quase R$ 89 mil**.

---

## 3. Corte mensal

| Mês | Ações com baixa manual | Pedidos | Números baixados | Valor dos pedidos | Ações contempladas | Valor pago em prêmios |
|---|---|---|---|---|---|---|
| 2026-06 | 60 | 115 | 305 | R$ 5.527,00 | 5 | R$ 1.300,00 |
| 2026-07 | 236 | 374 | 1.631 | R$ 20.884,00 | 23 | R$ 5.600,00 |
| 2026-08 | 259 | 410 | 1.579 | R$ 28.045,50 | 26 | R$ 27.250,00 |
| **2026-09** | **323** | **591** | **2.347** | **R$ 67.607,00** | **38** | **R$ 44.563,00** |
| 2026-10* | 160 | 311 | 1.332 | R$ 35.738,00 | 26 | R$ 10.350,00 |

\* outubro parcial — dados até 19/10/2026.

**Setembro/2026 se destaca**: é o mês com mais ações com baixa manual (323), mais prêmio pago em números baixados manualmente (R$ 44.563,00 — metade do total do período inteiro) e a maior contagem de ações contempladas (38). Vale ser o primeiro ponto de atenção se o cliente quiser recortar por tempo.

---

## 4. As 118 ações em que uma baixa manual foi contemplada

Ordenado pelo valor do prêmio recuperado (maior primeiro). "Pedidos" e "Números" se referem apenas aos pedidos/números **baixados manualmente** daquela ação (pode haver outros pedidos pagos normalmente na mesma ação, não contados aqui). Todas no status `done`.

| # | Data | Ação | Pedidos (baixa manual) | Números (baixa manual) | Prêmio pago (R$) | Product ID |
|---|---|---|---|---|---|---|
| 1 | 2026-09-20 | 05° RAPIDINHA VALENDO R$20.000,00! ESPECIAL FED3RAL | 3 | 10 | 20.000,00 | 6aaf139d45d35718871530ff |
| 2 | 2026-08-11 | 28° RAPIDINHA VALENDO R$9.000,00! | 1 | 4 | 9.000,00 | 6a7a49da56d1d21bb98bd8ac |
| 3 | 2026-09-13 | 02° RAPIDINHA VALENDO R$4.000,00 2° EDIÇÃO!! | 2 | 10 | 4.000,00 | 6aa6913856d1d21bb9b01c8d |
| 4 | 2026-09-17 | 2° RAPIDINHA VALENDO R$4.500,00!! COM 5 GANHADORES! | 4 | 18 | 3.000,00 | 6aabc55945d357188711e624 |
| 5 | 2026-08-15 | 12° RAPIDINHA VALENDO R$5.000,00 COM 2 GANHADORES 2° EDIÇÃO | 4 | 14 | 3.000,00 | 6a804b4f56d1d21bb990ce92 |
| 6 | 2026-08-13 | 07° RAPIDINHA VALENDO R$ 3.000,00! 1 GANHADOR 2º EDIÇÃO | 1 | 4 | 3.000,00 | 6a7e090356d1d21bb98f0922 |
| 7 | 2026-09-23 | 12° RAPIDINHA VALENDO R$9.000,00! COM 3 GANHADORES! | 2 | 12 | 2.500,00 | 6ab31c7d45d3571887189651 |
| 8 | 2026-10-02 | 14° RAPIDINHA VALENDO R$4.000,00!! COM 5 GANHADORES! | 4 | 21 | 2.000,00 | 6abfba4645d357188723b96a |
| 9 | 2026-08-29 | 31° RAPIDINHA VALENDO R$ 2.000,00 NA CABEÇA! | 2 | 12 | 2.000,00 | 6a92f2a556d1d21bb99fef06 |
| 10 | 2026-08-26 | 2° RAPIDINHA VALENDO R4.500,00 COM 5 GANHADORES! | 2 | 8 | 2.000,00 | 6a8ec7e456d1d21bb99c5bcc |
| 11 | 2026-10-03 | 81° RAPIDINHA VALENDO R$ 1.500,00 NA TAMPA! | 2 | 9 | 1.500,00 | 6ac1606545d35718872568d1 |
| 12 | 2026-09-09 | 1° RAPIDINHA VALENDO R$5.000,00!! COM 4 GANHADORES! | 2 | 7 | 1.500,00 | 6aa1ab2f56d1d21bb9ac05ce |
| 13 | 2026-09-25 | 10° RAPIDINHA VALENDO R$ 2.400,00 EM 05 OPORTUNIDADES! | 2 | 10 | 1.200,00 | 6ab5989a45d35718871aeb0a |
| 14 | 2026-09-23 | 30° RAPIDINHA VALENDO R$1.200,00 NA TAMPA 2º EDIÇÃO! | 3 | 16 | 1.200,00 | 6ab2fee645d357188718744f |
| 15 | 2026-08-11 | 94° RAPIDINHA VALENDO R$ 2.500,00 COM 07 GANHADORES!! | 2 | 4 | 1.100,00 | 6a7b2d4056d1d21bb98c6ab5 |
| 16 | 2026-10-05 | 15° RAPIDINHA VALENDO R$4.000,00!! COM 5 GANHADORES! | 3 | 8 | 1.000,00 | 6ac1a16145d357188725bd8f |
| 17 | 2026-09-30 | 14° RAPIDINHA VALENDO R$ 3.000,00 EM 5 CHANCES | 3 | 16 | 1.000,00 | 6abd5db045d357188721983b |
| 18 | 2026-09-10 | 1° RAPIDINHA VALENDO R$3.200,00!! COM 7 GANHADORES! | 5 | 22 | 1.000,00 | 6aa29d2c56d1d21bb9accfac |
| 19 | 2026-08-26 | 90° RAPIDINHA VALENDO R$2.100,00! COM 5 CHANCES! | 3 | 11 | 1.000,00 | 6a8ef72c56d1d21bb99c8727 |
| 20 | 2026-08-26 | 40° RAPIDINHA VALENDO R$ 3.000,00 2º EDIÇÃO! | 2 | 11 | 1.000,00 | 6a8e42f656d1d21bb99c1f48 |
| 21 | 2026-07-08 | 66° RAPIDINHA VALENDO R$2.100,00! COM 5 CHANCES! | 1 | 4 | 1.000,00 | 6a4e5d6456d1d21bb967d318 |
| 22 | 2026-09-14 | 27° RAPIDINHA VALENDO R$1.100 3 GANHADORES! | 2 | 10 | 900,00 | 6aa8506b56d1d21bb9b16590 |
| 23 | 2026-08-28 | 28° RAPIDINHA VALENDO R$ 900,00 NA TAMPA! | 3 | 13 | 900,00 | 6a91c86356d1d21bb99edd69 |
| 24 | 2026-09-21 | 60° RAPIDINHA VALENDO R$ 1.400,00! 3 GANHADORES! | 2 | 8 | 700,00 | 6ab009a845d357188715d6cb |
| 25 | 2026-09-16 | 13° RAPIDINHA VALENDO R$1.600 3° EDIÇÃO! | 1 | 2 | 700,00 | 6aa9c05056d1d21bb9b2a66e |
| 26 | 2026-08-05 | 95° RAPIDINHA VALENDO R$1.600 2° EDIÇÃO! | 1 | 11 | 700,00 | 6a72609b56d1d21bb9856991 |
| 27 | 2026-09-22 | 3° RAPIDINHA VALENDO R$4.200,00!! COM 6 GANHADORES! | 1 | 7 | 600,00 | 6ab27ff645d357188717d65b |
| 28 | 2026-09-17 | 1° RAPIDINHA VALENDO R$4.200,00!! COM 6 GANHADORES! | 1 | 2 | 600,00 | 6aab210c56d1d21bb9b3d91c |
| 29 | 2026-09-16 | 6° RAPIDINHA VALENDO R$3.300,00!! COM 7 GANHADORES! | 6 | 32 | 600,00 | 6aaadc2d56d1d21bb9b38051 |
| 30 | 2026-10-15 | 3° RAPIDINHA VALENDO R$500,00!! | 4 | 21 | 500,00 | 6ad0d80045d357188733a26b |
| 31 | 2026-10-14 | 36° RAPIDINHA VALENDO R$1.100 3 GANHADORES! | 2 | 6 | 500,00 | 6acfc10c45d3571887328a81 |
| 32 | 2026-07-21 | 20° RAPIDINHA VALENDO R$1.500,00 COM 02 GANHADORES! | 2 | 4 | 500,00 | 6a5e9c0c56d1d21bb975472f |
| 33 | 2026-07-17 | 32º RAPIDINHA VALENDO R$1.700 COM 8 GANHADORES!! | 4 | 6 | 500,00 | 6a5a67e656d1d21bb9720cc0 |
| 34 | 2026-10-08 | 11° RAPIDINHA VALENDO R$3.300,00!! COM 7 GANHADORES! | 2 | 10 | 400,00 | 6ac6debc45d35718872a5440 |
| 35 | 2026-10-07 | 97° RAPIDINHA VALENDO R$ 900,00! COM 3 GANHADORES! | 3 | 13 | 400,00 | 6ac6b5f645d35718872a119e |
| 36 | 2026-10-03 | 10° RAPIDINHA VALENDO R$3.300,00!! COM 7 GANHADORES! | 2 | 9 | 400,00 | 6ac020ab45d357188724420d |
| 37 | 2026-09-21 | 08° RAPIDINHA VALENDO R$ 2.400,00 EM 05 OPORTUNIDADES! | 2 | 20 | 400,00 | 6ab13be445d357188716b8c9 |
| 38 | 2026-09-12 | 52° RAPIDINHA VALENDO R$1.700 COM 3 GANHADORES! | 2 | 7 | 400,00 | 6aa56bf056d1d21bb9af3b85 |
| 39 | 2026-09-09 | 1° RAPIDINHA VALENDO R$3.300,00!! COM 7 GANHADORES! | 7 | 23 | 400,00 | 6aa1435356d1d21bb9ab8912 |
| 40 | 2026-08-06 | 24° RAPIDINHA VALENDO R$1.500,00 COM 09 GANHADORES 3º EDIÇÃO | 1 | 4 | 400,00 | 6a74c0a856d1d21bb9875476 |
| 41 | 2026-06-27 | 12° RAPIDINHA VALENDO R$ 2.200,00 2º EDIÇÃO! | 2 | 3 | 400,00 | 6a3ef82356d1d21bb95aff0e |
| 42 | 2026-06-28 | 76° RAPIDINHA VALENDO R$ 1.900,00 COM 8 GANHADORES!! | 2 | 6 | 350,00 | 6a40368b56d1d21bb95bfac0 |
| 43 | 2026-10-19 | 22° RAPIDINHA VALENDO R$2.300,00 COM 05 GANHADORES!! | 1 | 5 | 300,00 | 6ad6265645d357188738a9ac |
| 44 | 2026-10-17 | 21° RAPIDINHA VALENDO R$2.300,00 COM 05 GANHADORES!! | 3 | 7 | 300,00 | 6ad37dfe45d3571887366d24 |
| 45 | 2026-10-14 | 2° RAPIDINHA VALENDO R$300,00 EM DUAS OPORTUNIDADES! | 5 | 33 | 300,00 | 6acfb72b45d3571887327e50 |
| 46 | 2026-09-24 | 03° RAPIDINHA VALENDO R$6.000,00!! COM 7 GANHADORES! | 9 | 38 | 300,00 | 6ab42a8445d3571887197ef9 |
| 47 | 2026-09-15 | 54° RAPIDINHA VALENDO R$ 1.400,00 4° EDIÇÃO! | 3 | 10 | 300,00 | 6aa9992656d1d21bb9b27739 |
| 48 | 2026-09-02 | 14° RAPIDINHA VALENDO R$300,00 8º EDIÇÃO | 4 | 16 | 300,00 | 6a986b1c56d1d21bb9a470d5 |
| 49 | 2026-08-28 | 47° RAPIDINHA VALENDO R$ 800,00 COM 2 GANHADORES! | 5 | 35 | 300,00 | 6a91ee9456d1d21bb99f159f |
| 50 | 2026-08-14 | 82° RAPIDINHA VALENDO R$2.100,00! COM 5 CHANCES! | 1 | 3 | 300,00 | 6a7e3ef256d1d21bb98f462f |
| 51 | 2026-08-11 | 39° RAPIDINHA VALENDO R$1.700 COM 3 GANHADORES! | 2 | 7 | 300,00 | 6a7a4a0a56d1d21bb98bd945 |
| 52 | 2026-07-15 | 81° RAPIDINHA VALENDO R$ 2.500,00 COM 07 GANHADORES!! | 1 | 2 | 300,00 | 6a57dc0c56d1d21bb96fdd00 |
| 53 | 2026-10-18 | 3º RAPIDINHA VALENDO R$250,00 COM 2 GANHADORES! | 2 | 13 | 250,00 | 6ad502b645d357188737cedb |
| 54 | 2026-10-17 | 5º RAPIDINHA VALENDO R$250,00 NA TAMPA! | 6 | 33 | 250,00 | 6ad3ae9b45d357188736b163 |
| 55 | 2026-09-10 | 62º RAPIDINHA VALENDO R$250,00 NA TAMPA! | 2 | 11 | 250,00 | 6aa2dbd756d1d21bb9ad0c2c |
| 56 | 2026-08-16 | 51º RAPIDINHA VALENDO R$250,00 NA TAMPA! | 3 | 16 | 250,00 | 6a81c02e56d1d21bb991fa19 |
| 57 | 2026-07-15 | 7° RAPIDINHA VALENDO R$1.500,00 COM 09 GANHADORES 3º EDIÇÃO! | 2 | 11 | 250,00 | 6a57c05b56d1d21bb96fbbf7 |
| 58 | 2026-07-12 | 78° RAPIDINHA VALENDO R$ 1.900,00 COM 8 GANHADORES!! | 1 | 9 | 250,00 | 6a529dc556d1d21bb96bc1fa |
| 59 | 2026-07-07 | 27º RAPIDINHA VALENDO R$250,00! | 1 | 7 | 250,00 | 6a4d027856d1d21bb9667df1 |
| 60 | 2026-10-17 | 20° RAPIDINHA VALENDO R$ 2.400,00 EM 05 OPORTUNIDADES! | 2 | 8 | 200,00 | 6ad29afc45d357188735acd6 |
| 61 | 2026-10-15 | 12º RAPIDINHA VALENDO R$2.800,00 COM 5 GANHADORES! | 2 | 3 | 200,00 | 6ad0de8745d357188733af89 |
| 62 | 2026-10-15 | 4º RAPIDINHA VALENDO R$200,00 NA TAMPA | 5 | 31 | 200,00 | 6ad0a73545d3571887336cc2 |
| 63 | 2026-10-07 | 90° RAPIDINHA VALENDO R$ 1.400,00 4° EDIÇÃO! | 2 | 16 | 200,00 | 6ac6937845d357188729d9c0 |
| 64 | 2026-10-06 | 85º RAPIDINHA VALENDO R$200,00 NA TAMPA 2º EDIÇÃO!! | 5 | 28 | 200,00 | 6ac4dab045d357188727ffa8 |
| 65 | 2026-10-06 | 84º RAPIDINHA VALENDO R$200,00 NA TAMPA 2º EDIÇÃO!! | 3 | 21 | 200,00 | 6ac4361145d35718872796cc |
| 66 | 2026-10-03 | 72° RAPIDINHA VALENDO R$ 2.000,00 EM 5 CHANCES! | 1 | 4 | 200,00 | 6ac1818d45d357188725994f |
| 67 | 2026-09-28 | 71º RAPIDINHA VALENDO R$200,00 NA TAMPA 2º EDIÇÃO!! | 4 | 48 | 200,00 | 6aba70ef45d35718871ed7b4 |
| 68 | 2026-09-27 | 68° RAPIDINHA VALENDO R$ 2.000,00 EM 5 CHANCES! | 2 | 8 | 200,00 | 6ab9293c45d35718871df9fc |
| 69 | 2026-09-24 | 100° RAPIDINHA VALENDO R$2.100,00! COM 5 CHANCES! | 4 | 19 | 200,00 | 6ab4426e45d3571887199d13 |
| 70 | 2026-09-23 | 67° RAPIDINHA VALENDO R$ 1.400,00 4° EDIÇÃO! | 2 | 10 | 200,00 | 6ab3bfa845d357188718f7fb |
| 71 | 2026-09-17 | 11° RAPIDINHA VALENDO R$2.700,00 COM 5 GANHADORES! | 3 | 8 | 200,00 | 6aabf29b45d3571887121621 |
| 72 | 2026-09-13 | 50º RAPIDINHA VALENDO R$200,00 NA TAMPA 2º EDIÇÃO!! | 4 | 28 | 200,00 | 6aa6b19a56d1d21bb9b034fc |
| 73 | 2026-09-12 | 80° RAPIDINHA VALENDO R$1.500,00 COM 05 GANHADORES!! | 3 | 13 | 200,00 | 6aa5407256d1d21bb9af0d55 |
| 74 | 2026-09-12 | 50° RAPIDINHA VALENDO R$ 1.400,00 4° EDIÇÃO! | 2 | 12 | 200,00 | 6aa5893e56d1d21bb9af552f |
| 75 | 2026-09-12 | 2° RAPIDINHA VALENDO R$3.200,00!! COM 7 GANHADORES! | 1 | 3 | 200,00 | 6aa5447956d1d21bb9af127c |
| 76 | 2026-09-10 | 47º RAPIDINHA VALENDO R$200,00 NA TAMPA 2º EDIÇÃO!! | 3 | 27 | 200,00 | 6aa2f96b56d1d21bb9ad341f |
| 77 | 2026-09-07 | 44º RAPIDINHA VALENDO R$200,00 NA TAMPA 2º EDIÇÃO!! | 3 | 21 | 200,00 | 6a9eeab256d1d21bb9a9b7e2 |
| 78 | 2026-09-05 | 63° RAPIDINHA VALENDO R$ 2.000,00 EM 5 CHANCES! | 1 | 2 | 200,00 | 6a9c2ba956d1d21bb9a7ac02 |
| 79 | 2026-09-01 | 36º RAPIDINHA VALENDO R$200,00 NA TAMPA 2º EDIÇÃO!! | 1 | 13 | 200,00 | 6a96121756d1d21bb9a2636c |
| 80 | 2026-08-28 | 20° RAPIDINHA VALENDO R$1.600 COM 03 GANHADORES! | 2 | 5 | 200,00 | 6a91ddd356d1d21bb99f022a |
| 81 | 2026-08-26 | 22° RAPIDINHA VALENDO R$2.200,00! COM 5 CHANCES! | 2 | 7 | 200,00 | 6a8f385256d1d21bb99cc53e |
| 82 | 2026-08-25 | 89° RAPIDINHA VALENDO R$ 900,00! COM 3 GANHADORES! | 4 | 21 | 200,00 | 6a8dbab756d1d21bb99b88cb |
| 83 | 2026-08-19 | 16º RAPIDINHA VALENDO R$200,00 NA TAMPA 2º EDIÇÃO!! | 3 | 29 | 200,00 | 6a84f21756d1d21bb99493b3 |
| 84 | 2026-08-13 | 45° RAPIDINHA VALENDO R$ 2.600,00 EM 5 CHANCES!! | 2 | 7 | 200,00 | 6a7dd11d56d1d21bb98ecee7 |
| 85 | 2026-08-12 | 16° RAPIDINHA VALENDO R$ 2.800,00! | 3 | 5 | 200,00 | 6a7b8d5e56d1d21bb98cd3bf |
| 86 | 2026-08-06 | 74° RAPIDINHA VALENDO R$ 600,00! COM 2 GANHADORES! | 1 | 7 | 200,00 | 6a74ce8656d1d21bb987653b |
| 87 | 2026-07-30 | 81º RAPIDINHA VALENDO R$200,00 NA TAMPA!! | 1 | 5 | 200,00 | 6a6a927856d1d21bb97f3783 |
| 88 | 2026-07-22 | 74° RAPIDINHA VALENDO R$ 900,00! COM 3 GANHADORES! | 1 | 5 | 200,00 | 6a6103ed56d1d21bb97747fc |
| 89 | 2026-07-20 | 68º RAPIDINHA VALENDO R$200,00 NA TAMPA!! | 1 | 4 | 200,00 | 6a5e09e756d1d21bb974a41a |
| 90 | 2026-07-11 | 58º MEGA RAPIDINHA VALENDO R$200,00! | 1 | 8 | 200,00 | 6a52728756d1d21bb96b8dca |
| 91 | 2026-07-06 | 24° RAPIDINHA VALENDO R$500,00 EM 02 PRÊMIOS! | 1 | 6 | 200,00 | 6a4bd6b256d1d21bb9657fbb |
| 92 | 2026-06-26 | 60° RAPIDINHA VALENDO R$1.500,00 COM 05 GANHADORES!! | 1 | 7 | 200,00 | 6a3da7bf56d1d21bb959f8f7 |
| 93 | 2026-06-22 | 9° RAPIDINHA VALENDO R$1.200 COM 3 GANHADORES! | 27 | 38 | 200,00 | 6a395bfe56d1d21bb9562571 |
| 94 | 2026-10-17 | 1° RAPIDINHA VALENDO R$500,00 EM 3 PRÊMIOS! | 1 | 2 | 150,00 | 6ad3843c45d3571887367f11 |
| 95 | 2026-10-13 | 1º RAPIDINHA VALENDO R$150,00 NA TAMPA! | 6 | 28 | 150,00 | 6ace84c945d3571887313bf2 |
| 96 | 2026-10-09 | 10° MEGA RAPIDINHA VALENDO R$150,00 NA TAMPA 3º EDIÇÃO! | 3 | 28 | 150,00 | 6ac82e3645d35718872bb743 |
| 97 | 2026-10-06 | 09° RAPIDINHA VALENDO R$ 2.500,00 COM 07 GANHADORES 2° EDIÇÃO | 1 | 3 | 150,00 | 6ac4109945d3571887276969 |
| 98 | 2026-10-02 | 08° RAPIDINHA VALENDO R$ 2.500,00 COM 07 GANHADORES 2° EDIÇÃO | 2 | 4 | 150,00 | 6abec90e45d357188722f769 |
| 99 | 2026-08-28 | 34° RAPIDINHA VALENDO R$ 2.200,00 2º EDIÇÃO! | 2 | 10 | 150,00 | 6a91982156d1d21bb99ea72b |
| 100 | 2026-08-08 | 8º MEGA RAPIDINHA VALENDO R$150,00 NA TAMPA 2º EDIÇÃO! | 3 | 12 | 150,00 | 6a77144b56d1d21bb9895545 |
| 101 | 2026-08-05 | 2º MEGA RAPIDINHA VALENDO R$150,00 NA TAMPA 2º EDIÇÃO! | 3 | 12 | 150,00 | 6a736af956d1d21bb9862b41 |
| 102 | 2026-08-05 | 1º MEGA RAPIDINHA VALENDO R$150,00 NA TAMPA 2º EDIÇÃO! | 3 | 10 | 150,00 | 6a733f8056d1d21bb98603b7 |
| 103 | 2026-07-27 | 25° RAPIDINHA VALENDO R$ 2.200,00 2º EDIÇÃO! | 1 | 4 | 150,00 | 6a67669b56d1d21bb97c6bb7 |
| 104 | 2026-07-22 | 76º MEGA RAPIDINHA VALENDO R$150,00! | 1 | 12 | 150,00 | 6a60f5e756d1d21bb9773458 |
| 105 | 2026-07-20 | 72º MEGA RAPIDINHA VALENDO R$150,00! | 3 | 24 | 150,00 | 6a5e526c56d1d21bb974f32d |
| 106 | 2026-07-18 | 68º MEGA RAPIDINHA VALENDO R$150,00! | 5 | 42 | 150,00 | 6a5bf7e456d1d21bb9735757 |
| 107 | 2026-07-15 | 47° RAPIDINHA VALENDO R$2.300,00 COM 10 GANHADORES!!! | 1 | 4 | 150,00 | 6a5793d056d1d21bb96f8951 |
| 108 | 2026-07-14 | 58º MEGA RAPIDINHA VALENDO R$150,00! | 5 | 35 | 150,00 | 6a566a4556d1d21bb96e89f1 |
| 109 | 2026-07-13 | 55º MEGA RAPIDINHA VALENDO R$150,00! | 6 | 40 | 150,00 | 6a54d29756d1d21bb96d3267 |
| 110 | 2026-07-08 | 47º MEGA RAPIDINHA VALENDO R$150,00! | 3 | 22 | 150,00 | 6a4e81d356d1d21bb9680070 |
| 111 | 2026-07-03 | 35º MEGA RAPIDINHA VALENDO R$150,00! | 3 | 23 | 150,00 | 6a47e9a356d1d21bb9622df5 |
| 112 | 2026-06-30 | 14° RAPIDINHA VALENDO R$ 2.200,00 2º EDIÇÃO! | 2 | 10 | 150,00 | 6a4305a456d1d21bb95e33d5 |
| 113 | 2026-10-12 | 39° RAPIDINHA VALENDO R$1.500,00 COM 09 GANHADORES 3º EDIÇÃO | 1 | 6 | 100,00 | 6acd316045d35718872ffb3c |
| 114 | 2026-09-28 | 76° RAPIDINHA VALENDO R$ 1.400,00 4° EDIÇÃO! | 2 | 10 | 100,00 | 6aba9ed345d35718871f17c0 |
| 115 | 2026-07-24 | 14° RAPIDINHA VALENDO R$1.500,00 COM 09 GANHADORES 3º EDIÇÃO | 1 | 4 | 100,00 | 6a639cb756d1d21bb97999ce |
| 116 | 2026-07-07 | 99° RAPIDINHA VALENDO R$1.500,00 COM 09 GANHADORES 2º EDIÇÃO | 2 | 9 | 100,00 | 6a4d302256d1d21bb966c1dc |
| 117 | 2026-09-25 | 55° RAPIDINHA VALENDO R$11.000,00 COM 1 GANHADOR! | 8 | 12 | 11,00 | 6ab6893545d35718871baaca |
| 118 | 2026-09-24 | 27° RAPIDINHA VALENDO R$5.000,00 COM 2 GANHADORES 2° EDIÇÃO | 2 | 10 | 2,00 | 6ab50bfd45d35718871a393a |

**Soma de conferência:** R$ 89.063,00 (igual ao total do resumo geral, seção 2).

---

## 5. O que mais chama atenção (leitura, não acusação)

- **Casos #1, #2 e #5** concentram sozinhos R$ 17.000,00 do total de R$ 89.063,00 (quase 1/5), com poucos pedidos/números baixados manualmente (1 a 4 números) — ou seja, pouco volume, prêmio alto. É o padrão mais compatível com a preocupação relatada pelo cliente ("gente aprovando manual pra ganhar prêmio alto"), e o primeiro lugar que eu olharia numa auditoria dirigida.
- **Caso #93** (22/06, product_id `6a395bfe...`) tem 27 pedidos de baixa manual numa única ação — disparado o maior volume de pedidos manuais entre os 118 contemplados — mas o prêmio recuperado foi de apenas R$ 200,00. Vale verificar se não é um caso operacional legítimo (ex.: ação muito antiga, migração de dados, ou lote de aprovações manuais justificadas) antes de tratar como suspeito.
- **Setembro concentra metade do valor pago** (R$ 44.563,00 de R$ 89.063,00) — se o cliente quiser recortar o problema por período, setembro é o mês a investigar primeiro.
- Fora da tabela de contempladas: existem **920 ações** (1.038 − 118) que tiveram baixa manual mas **não** bateram com número ganhador — não representam prejuízo direto em prêmio, mas ainda são baixas manuais de pagamento (ou seja, a pessoa "ganhou" o número sem pagar pelo gateway), o que já é, por si só, um ponto de controle interno a olhar — estão listadas por completo no arquivo anexo (seção 6).

---

## 6. Arquivos anexos (para auditoria/drill-down)

Todos em `services/Meta/imperio-premios/baixas-manuais-2026/`:

| Arquivo | Conteúdo |
|---|---|
| `baixas_manuais_por_acao.csv` | As **1.038 ações** com pelo menos uma baixa manual (não só as 118 contempladas) — pedidos, números, valor, se contemplou, datas. |
| `baixas_manuais_por_acao.json` | Mesmo conteúdo do CSV + resumo geral, em JSON. |
| `dados_brutos_completos_120dias.csv` | Dados brutos, nível pedido (218.641 linhas) — inclui o campo `ApprovedBy` por pedido, para auditoria pedido-a-pedido. |
| `detalhes_sorteios_120dias.csv` | Metadados por ação/sorteio (título, valor do prêmio, faturamento, status). |

---

## 7. Próximo passo recomendado

Para fechar a lacuna da seção "Limitação crítica": perguntar ao time da plataforma de sorteios se existe **log de auditoria de admin** (quem logou, quem clicou "aprovar manualmente", em qual pedido, e quando) — isso normalmente fica em uma tabela/endpoint separado de controle de acesso administrativo, fora da API de sorteios/pedidos que usei aqui. Sem isso, não há como ir além de "a baixa foi manual" para "a baixa foi feita por tal pessoa".
