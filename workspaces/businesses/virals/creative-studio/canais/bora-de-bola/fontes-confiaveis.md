# Fontes confiáveis — Bora de Bola

Acumula; não se revalida do zero a cada episódio.

## RSS validado

Vinte candidatos testados em 2026-09-04; nove responderam. O que decide não é o
nome do veículo — é se o feed abre, quantos itens traz e o frescor do mais
recente. Registro em `apps/pauta-futebol/fonte_rss.py`.

| Fonte | Itens | Peso | Nota |
|---|---|---|---|
| **ge.globo** | 100 | 1.00 | só responde em `pox.globo.com/rss/ge` — as URLs óbvias dão 400/404 |
| UOL Esporte | 16 | 0.90 | XML inválido; entra pelo leitor tolerante |
| **Jogada10** | 100 | 0.85 | o mais fresco de todos |
| Gazeta Esportiva | 50 | 0.85 | |
| Placar | 20 | 0.80 | |
| Metrópoles | 20 | 0.75 | |
| Trivela | 20 | 0.70 | texto mais analítico |
| Torcedores.com | 20 | 0.70 | |
| Terra Esportes | 10 | 0.70 | sem imagem no feed |
| Coluna do Fla | 10 | 0.55 | clube-específico (Flamengo) |

**Fora do ar:** Lance (410 Gone), NetVasco, Meu Timão, CNN Esportes (404),
SPFC.net (403), Verdão Web (timeout), ESPN BR (corpo vazio).

## Dado estruturado

| Fonte | O que dá | Onde |
|---|---|---|
| ESPN (endpoints públicos) | eventos, escalação, 28 estatísticas, coordenadas | `apps/live-futebol/servidor.py` |

Não documentados: podem mudar sem aviso. O código trata ausência de campo como
normal — uma mudança degrada em vez de derrubar.

**Sem cobertura na ESPN:** Copa do Brasil, Carioca, Paulista, Conference League,
K-League, A-League, Emirados, Catar, Egito, Marrocos, Suíça, Polônia, Tchéquia,
Romênia, Ucrânia, Croácia, Sérvia.

## Jornalistas com histórico de acerto

A regra de fonte manda **citar em voz alta**, e citar com histórico vale mais que
citar sem. Preencher conforme o acerto for observado:

| Jornalista | Veículo | Acertos observados |
|---|---|---|
| *(a preencher)* | | |

## Direito de imagem

**Puxar imagem de blog por RSS não dá direito de uso.** A maioria licencia de
agência, e reclamação de copyright no YouTube é mais rápida e mais cara que
strike de conteúdo.

Rotas limpas, em ordem de preferência:

1. **Escudo do clube** — `a.espncdn.com/i/teamlogos/soccer/500/{id}.png`
2. **Camisa numerada** — `stitcher.espn.com/sports/soccer/leagues/{liga}/events/{jogo}/athletes/{id}/jersey.png?darkMode=true`
   (gerada sob demanda; funciona para qualquer jogador de qualquer jogo)
3. **Imagem gerada localmente** — pipeline do squad
4. **Acervo licenciado** — Pexels, já usado no farming
5. **Foto oficial de clube** — costuma ter permissão editorial, mas **varia por
   clube e precisa ser verificada, não presumida**

Retrato de atleta na ESPN existe para ~6% do elenco (medido: 3 de 46). A rota 2
é a que sempre funciona.
