# Overlay de live de futebol — dados reais, custo zero

Placar, estatísticas e lances ao vivo desenhados por nós, entrando no OBS como
Browser Source. Sem chave de API, sem cadastro, sem mensalidade.

---

## Como usar

```
cd apps\live-futebol

python servidor.py                 # lista os jogos de hoje no Brasileirão
python servidor.py 401841208       # sobe o overlay para esse jogo
python servidor.py --demo          # jogo já encerrado, para ver funcionando
python servidor.py 12345 --liga esp.1
```

Depois abra `http://127.0.0.1:8790/` — no navegador comum use
`http://127.0.0.1:8790/?fundo=1`, senão a transparência aparece como branco.

### No OBS

1. **Fontes → + → Navegador**
2. URL `http://127.0.0.1:8790/`, largura **1920**, altura **1080**
3. Deixe **"Desligar a fonte quando não estiver visível" DESMARCADO** — senão o
   overlay recarrega do zero a cada troca de cena e perde a animação de entrada
4. Arraste para a cena que estiver por baixo (gameplay, arte de fundo, vídeo)

O fundo é transparente de propósito: assenta sobre qualquer cena sem chroma key.

### Ligas

`bra.1` Brasileirão A · `bra.2` Série B · `eng.1` Premier League ·
`esp.1` LaLiga · `ita.1` Serie A · `ger.1` Bundesliga · `fra.1` Ligue 1 ·
`uefa.champions` Champions · `conmebol.libertadores` Libertadores

---

## De onde vêm os dados

Os endpoints públicos que a própria ESPN usa no site. Testado com jogo real:

- **placar e relógio** ao vivo
- **28 métricas por time** — a tela mostra as 6 que valem: posse, finalizações,
  no alvo, escanteios, faltas, cartões
- **eventos** com minuto, tipo, autor e assistência
- escalações, formações, tabela, odds

### Por que não uma API "de verdade"

A conta que elimina as alternativas: uma partida dura ~110 min. Consultando a
cada 30 s são **220 requisições por jogo**.

| Provedor | Free tier | Serve? |
|---|---|---|
| API-Football | 100 requisições **por dia** | não cobre um jogo |
| KickoffAPI | 100/dia | idem |
| TheSportsDB | livescore só no plano de US$ 9/mês | não |
| football-data.org | placar atrasado, sem eventos no free | não |
| **ESPN** | sem chave, sem limite publicado | **sim** |

Os tiers gratuitos dos provedores comerciais são para desenvolvimento, não para
operação contínua.

### A ressalva

São endpoints **não documentados**. Não há contrato: podem mudar sem aviso. Por
isso o código nunca quebra a página — se a busca falhar, o painel **congela no
último dado bom** em vez de sumir, que num overlay é sempre a escolha certa. O
intervalo padrão é 30 s, e é suficiente: como a live não mostra a partida, meio
minuto de atraso é invisível.

---

## Como está montado

```
servidor.py    busca da ESPN, faz cache, serve /dados e a página
overlay.html   desenha; não conhece a ESPN — só consome /dados
```

O servidor no meio existe por três razões, e nenhuma é estilo:

1. **CORS** — o Browser Source é um Chromium comum e não chamaria a ESPN direto;
2. **cache** — a página redesenha a cada 5 s lendo do cache local; quem fala com
   a origem é o servidor, no ritmo dele;
3. **uma fonte só** — várias cenas do OBS podem abrir a mesma página sem
   multiplicar as chamadas externas.

Trocar a fonte de dados um dia significa mexer só no `servidor.py`.

---

## O que dá para acrescentar

- **Narração automática** — os eventos já vêm com minuto, autor e assistência.
  O caminho é template com variação sorteada + [Piper](https://github.com/rhasspy/piper)
  (TTS local, MIT, PT-BR, latência de dezenas de ms). **Sem LLM na camada do
  fato**: modelo de linguagem narrando futebol inventa jogador, minuto e placar,
  e faz isso com confiança. LLM só entraria para comentário de contexto.
- **Campo dinâmico** — SVG com posição das finalizações; a ESPN traz coordenada
  de chute em `commentary`.
- **Chat** — ler a live pela API do YouTube, filtrar e responder com a mesma voz.
- **Odds** — já vêm no mesmo JSON (DraftKings, Bet365). Antes de colocar na tela,
  saiba que canal monetizado exibindo odds entra na política de conteúdo de
  jogos de azar do YouTube, que tem regras próprias de idade e monetização.

## Como colocar no ar

```bash
# 1. o que esta em campo agora (varre 19 ligas em paralelo)
python servidor.py --procurar

# 2. sobe o servidor com a partida escolhida e a locucao ligada
python servidor.py <id> --liga bra.1 --narrar

# 3. no OBS: Fonte > Navegador
#    URL     http://127.0.0.1:8790/?fundos=1&torcida=1
#    Tamanho 1920 x 1080
#    DESMARQUE "Desligar a fonte quando nao visivel"
```

### Parametros da URL

| Parametro | O que faz |
|---|---|
| `?fundos=1` | rodizio das 6 imagens de fundo com movimento lento |
| `?fundos=03` | fixa um fundo (prefixo do arquivo) |
| `?torcida=1` | cama de torcida em loop + rugido no gol |
| `?torcida=.35` | mesma cama com o volume que voce escolher |
| `?campo=1` | gramado desenhado atras de tudo (sem imagem de fundo) |
| `?video=URL` | video de fundo em loop |
| `?cta=Texto` | troca o texto da faixa inferior |
| `?testegol=1` | dispara o cartaz de gol uma vez, para conferir |

### Antes do jogo

```bash
python faz_loop_torcida.py            # fecha o loop da torcida (uma vez so)
python gera_pack_voz.py --fixo        # 146 falas de engajamento (uma vez so)
python prova_mixagem.py --ouvir       # ouve voz + torcida antes de abrir o OBS
```

## Roteamento de audio no OBS

O audio nasce na pagina, mas **nao passa pelo Chrome nem pelo mixer do Windows**.
O Browser Source roda num Chromium proprio, embutido no OBS. As suas abas do
navegador sao outro processo e nao chegam perto da transmissao — a menos que
voce capture "Audio da Area de Trabalho", que pega tudo o que a maquina toca.
E ai sim entra notificacao do Discord, video de outra aba e o que mais estiver
tocando enquanto voce mexe no PC.

**A regra:** capture o audio pela FONTE, nunca pela area de trabalho.

- No Browser Source, marque **"Controlar audio pelo OBS"**. O som passa a ter
  fader, medidor e filtros proprios no mixer.
- Deixe **"Audio da Area de Trabalho"** mudo ou removido.
- Deixe **"Desligar a fonte quando nao visivel"** DESMARCADO — senao o OBS
  derruba a pagina ao trocar de cena e a narracao para.

### Duas montagens possiveis

**A. Tudo na pagina** (mais simples, um fader so)

```
Browser Source   http://127.0.0.1:8790/?fundos=1&torcida=1
```
A pagina mixa voz e torcida e abaixa a torcida sozinha enquanto a voz fala.

**B. Torcida separada** (dois faders, abafamento nativo do OBS)

```
Browser Source   http://127.0.0.1:8790/?fundos=1          <- sem ?torcida
Media Source     assets/torcida/torcida-ambiente-LOOP.mp3  <- marque "Repetir"
```
No Media Source da torcida, adicione o filtro **Compressor** e escolha o
Browser Source em **"Fonte de abafamento (sidechain)"**. O OBS passa a abaixar
a torcida quando a voz entra — mesma ideia, feita na mesa em vez de na pagina.

A montagem B da controle independente de volume ao vivo e tira a torcida da
dependencia da pagina. A A tem menos peca para configurar. As duas entregam o
mesmo resultado no ar.

## Deixar rodando sozinho, mudo no seu PC

O som pode ir para a live e **nao** sair nas suas caixas. E uma configuracao do
OBS, nao do codigo:

1. Browser Source > Propriedades > marque **"Controlar audio pelo OBS"**.
   So com isso o audio ja deixa de passar pelo dispositivo padrao do Windows.
2. No mixer, botao direito no Browser Source > **Propriedades Avancadas de Audio**.
3. Na coluna **"Monitoramento de Audio"**, deixe em **"Monitoramento desligado"**.

   | Opcao | Vai para a live | Sai nas suas caixas |
   |---|---|---|
   | **Monitoramento desligado** | sim | **nao**  <- e esta |
   | Somente monitorar (silenciar saida) | nao | sim |
   | Monitorar e emitir | sim | sim |

4. Deixe **"Audio da Area de Trabalho"** mudo ou removido, senao volta tudo.

Com isso voce trabalha normalmente, ouve musica, entra em call — nada disso
alcanca a transmissao, e a transmissao nao alcanca voce.

### Conferir sem assistir

```
http://127.0.0.1:8790/saude
```

Devolve, em uma tela: ha quanto tempo esta no ar, a hora da ultima leitura de
dados, o placar que esta na tela, se houve erro, quantas falas esperam na fila,
e quantas mensagens do chat foram lidas e quantas viraram voz. E o unico jeito
de saber se algo parou — a live nao tem tela de erro, ela para em silencio.

### Chat

```bash
python servidor.py <id> --liga bra.1 --narrar --chat https://youtube.com/watch?v=SEU_ID
python servidor.py <id> --liga bra.1 --narrar --chat-teste   # ensaio sem live real
```

`--chat-teste` injeta mensagens simuladas a cada 18 s. Serve para exercitar a
interacao antes de existir canal — que e exatamente a situacao do ensaio.
