# -*- coding: utf-8 -*-
"""Gera as cartelas de b-roll de um episodio, a partir da marcacao do roteiro.

POR QUE CARTELA, E NAO SO FOTO
  Onze minutos de locucao com tres fotos alternando e o formato que o espectador
  abandona no terceiro minuto. Mas a alternativa nao e "mais fotos": metade do
  que este roteiro diz nao TEM foto — "efeito suspensivo", "lider por um ponto",
  "o julgamento comecou com absolvicao na mesa". Isso se mostra com grafico.

  A cartela tambem faz uma coisa que foto nao faz: ela repete VISUALMENTE o
  numero que a narracao disse. Quem esta com o video em segundo plano ouve; quem
  esta olhando, le. As duas rotas entregam a mesma informacao.

O QUE ELA NAO E
  Nao e thumb grande. A thumb disputa clique num feed e por isso grita. A cartela
  aparece POR BAIXO da narracao e existe para ancorar o que esta sendo dito — uma
  ideia por cartela, e silencio visual em volta.

FONTE DOS DADOS
  Os escudos vem da ESPN pelo mesmo caminho que a live ja usa (`fontes_imagem`),
  que e gratuito e sempre existe. Os numeros vem do claim-ledger: nenhuma cartela
  exibe numero que nao tenha ancora de fonte.

USO
  python -X utf8 broll/cartelas.py 2026-09-04-abel-stjd
  python -X utf8 broll/cartelas.py 2026-09-04-abel-stjd --so 3   (refaz uma)
"""
import argparse
import base64
import json
import os
import re
import sys
import unicodedata

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(AQUI))
from narra_comfy import CANAL  # noqa: E402

TEMPLATE = os.path.join(AQUI, "cartela.html")
ESCUDO = "https://a.espncdn.com/i/teamlogos/soccer/500/%s.png"

# Os ids sao os da ESPN, os mesmos que a live usa no scoreboard.
CLUBES = {"palmeiras": 2029, "botafogo": 6086, "flamengo": 819, "santos": 2674,
          "fluminense": 3445, "vasco": 3454,
          # ── acrescentado 2026-09-07 ──
          "cruzeiro": 2022, "athletico": 20851, "corinthians": 874,
          "chapecoense": 9318, "internacional": 1936}


def _arbitragem_flu_vasco(esc):
    """Marcacao de 2026-09-06 — a arbitragem de Fluminense x Vasco.

    ANCORA: cada cartela declara um trecho da FALA onde ela deve entrar. O
    `monta.py` acha a posicao relativa dessa frase dentro do bloco (no SRT) e
    poe a camada no plano correspondente.

    Sem ancora, a cartela era espalhada uniformemente pelos planos do bloco na
    ordem em que foi declarada -- e a do penalti aparecia enquanto a locucao
    ainda falava de outra coisa. Foi o que o founder viu como falta de
    sincronizacao no corte de 06/09.

    O que e ANALISE de comentarista entra com o nome dele na cartela. Cartela sem
    atribuicao vira asserção do canal, e este episodio inteiro depende dessa
    distincao.
    """
    def m(c):
        c.setdefault("modo", "faixa")
        return c

    return [m(c) for c in [
        {"bloco": "GANCHO", "tipo": "frase", "rotulo": "no maracanã",
         "ancora": "O árbitro peitou um jogador",
         "frase": 'O árbitro peitou um jogador.<br>'
                  '<span class="rlc">E o Hulk foi pra cima.</span>'},

        {"bloco": "NÚMEROS", "tipo": "escudos", "modo": "painel",
         "rotulo": "26ª rodada · maracanã", "ancora": "os numeros da noite porque eles explicam",
         "esq": esc["fluminense"], "dir": esc["vasco"],
         "placar_esq": "1", "placar_dir": "0"},

        {"bloco": "NÚMEROS", "tipo": "lista", "modo": "painel",
         "rotulo": "o que os números dizem", "ancora": "agora os numeros que quase ninguem viu",
         "itens": ["Posse: Vasco 55% x 44% Fluminense",
                   "Finalizações: 14 x 7 para o Vasco",
                   "Faltas: 20 do Vasco, 11 do Fluminense"]},

        {"bloco": "NÚMEROS", "tipo": "frase", "menor": True, "rotulo": "quem apitou",
         "ancora": "guarde esse nome porque ele e o personagem",
         "frase": 'Davi de Oliveira Lacerda'},

        {"bloco": "ÍNDICE", "tipo": "lista", "modo": "painel", "rotulo": "neste vídeo",
         "ancora": "neste video voce vai entender quatro coisas",
         "itens": ["O que o Hulk falou do árbitro",
                   "O pênalti que a análise da Globo aponta",
                   "Como o jogo chegou a 8 amarelos",
                   "O detalhe do Hulk que ninguém comenta"]},

        {"bloco": "CTA", "tipo": "frase", "menor": True, "rotulo": "bora de bola",
         "ancora": "se inscreve no canal",
         "frase": 'Lance polêmico a gente destrincha<br>com análise, não com achismo'},

        {"bloco": "BLOCO 1", "tipo": "frase", "modo": "painel", "rotulo": "hulk, do fluminense",
         "ancora": "A frase dele foi esta",
         "frase": '"Não pode ter um árbitro<br>que não tem personalidade"'},

        {"bloco": "BLOCO 1", "tipo": "frase", "menor": True, "rotulo": "o que chama atenção",
         "ancora": "É o time que ganhou",
         "frase": 'Quem reclamou foi o time<br>que GANHOU'},

        {"bloco": "BLOCO 2", "tipo": "frase", "modo": "painel",
         "rotulo": "pc oliveira · arbitragem do grupo globo",
         "ancora": "a analise dele foi esta",
         "frase": '"Adson não disputa a bola,<br>toca Kevin Serna por baixo"'},

        {"bloco": "BLOCO 2", "tipo": "lista", "rotulo": "o que ele diz que faltou",
         "ancora": "o que deveria ter saido dali eram duas coisas",
         "itens": ["Pênalti para o Fluminense",
                   "Cartão vermelho para Adson"]},

        {"bloco": "BLOCO 3", "tipo": "numero", "modo": "painel", "rotulo": "no jogo inteiro",
         "ancora": "volta comigo aos numeros",
         "numero": "31", "abaixo": "faltas somando<br>os dois lados"},

        {"bloco": "BLOCO 3", "tipo": "frase", "menor": True, "rotulo": "aos 23 minutos",
         "ancora": "aconteceu algo que raramente aparece na sumula",
         "frase": 'A partida foi PARALISADA<br>com os dois times envolvidos'},

        {"bloco": "BLOCO 3", "tipo": "frase", "menor": True, "rotulo": "guga, lateral do fluminense",
         "ancora": "e teve mais uma reclamacao essa sobre o campo",
         "frase": '"Não me recordo de um campo<br>tão ruim no Brasileirão"'},

        {"bloco": "BLOCO 3B", "tipo": "frase", "modo": "painel",
         "rotulo": "imprensa internacional",
         "ancora": "a expressão que apareceu na cobertura",
         "frase": 'A peitada virou manchete<br>'
                  '<span class="rlc">fora do Brasil: "nunca visto"</span>'},

        {"bloco": "BLOCO 4", "tipo": "lista", "modo": "painel",
         "rotulo": "o vasco jogou mais e perdeu",
         "ancora": "olha de novo os numeros do jogo",
         "itens": ["55% de posse de bola",
                   "14 finalizações contra 7",
                   "Zero ponto no fim"]},

        {"bloco": "BLOCO 4", "tipo": "frase", "menor": True, "rotulo": "a diferença",
         "ancora": "a diferenca nao foi volume",
         "frase": 'Não foi volume.<br>Foi aproveitamento.'},

        {"bloco": "BLOCO 5", "tipo": "frase", "modo": "painel", "rotulo": "o detalhe",
         "ancora": "os representantes dele chegaram a oferecer",
         "frase": 'O Vasco sondou o Hulk<br>'
                  '<span class="rlc">na janela em que ele saiu do Atlético</span>'},

        {"bloco": "BLOCO 6", "tipo": "numero", "modo": "painel", "rotulo": "com a vitória",
         "ancora": "com a vitoria o fluminense chega",
         "numero": "4º", "abaixo": "posição do Fluminense<br>no Brasileirão"},

        {"bloco": "BLOCO 6", "tipo": "frase", "menor": True, "rotulo": "o que ainda NÃO houve",
         "ancora": "fica o registro porque aqui a gente nao inventa",
         "frase": 'Sem punição, sem súmula de agressão,<br>sem representação protocolada'},

        {"bloco": "FECHO", "tipo": "frase", "menor": True, "rotulo": "e você, o que acha?",
         "ancora": "agora eu quero saber a sua opiniao",
         "frase": 'Foi pênalti no Serna?<br>Comenta aí embaixo'},
    ]]


def _penalti_cruzeiro(esc):
    """Marcacao de 2026-09-07 — a briga pelo penalti no Cruzeiro.

    A ANCORA E TRECHO DA FALA, nao numero de plano. O `monta.py` acha onde essa
    frase e realmente dita (pelo `fala-real.json`, transcrito do mp3) e poe a
    camada ali. Foi essa mudanca que corrigiu a dessincronia de 06/09.

    CARTELA DE FALA CITADA ENTRA COM A ORIGEM NO ROTULO.
      Metade deste episodio depende de uma distincao: o dialogo do penalti veio
      de LEITURA LABIAL, e o proprio autor declarou margem de erro. Cartela sem
      atribuicao vira asserção do canal -- e por na tela, em letra grande, uma
      frase que talvez nao tenha sido dita e exatamente o que este canal nao faz.

      Por isso as duas cartelas de dialogo tem o rotulo
      `leitura labial · velloso · com margem de erro`. O rotulo e pequeno e a
      frase e grande, entao a ressalva nao atrapalha a leitura -- mas ela esta
      la, no mesmo quadro, para quem parar.
    """
    def m(c):
        c.setdefault("modo", "faixa")
        return c

    return [m(c) for c in [
        {"bloco": "GANCHO", "tipo": "frase", "rotulo": "no mineirão",
         "ancora": "Esta todo mundo falando de 15 segundos",
         "frase": 'Pediu a bola. Ouviu não.<br>'
                  '<span class="rlc">E a câmera pegou tudo.</span>'},

        {"bloco": "NÚMEROS", "tipo": "escudos", "modo": "painel",
         "rotulo": "brasileirão · mineirão",
         "ancora": "Cruzeiro 3 Athletico Paranaense 1",
         "esq": esc["cruzeiro"], "dir": esc["athletico"],
         "placar_esq": "3", "placar_dir": "1"},

        {"bloco": "NÚMEROS", "tipo": "lista", "modo": "painel",
         "rotulo": "o que os números dizem",
         "ancora": "O Cruzeiro dominou a bola",
         "itens": ["Posse: Cruzeiro 61% x 39%",
                   "Finalizações: 19 x 17",
                   "Escanteios: 7 x 2",
                   "Cartões: 2 amarelos para cada lado"]},

        {"bloco": "NÚMEROS", "tipo": "linha_do_tempo", "modo": "painel",
         "rotulo": "os dois pênaltis",
         "ancora": "agora os dois numeros que sao o video inteiro",
         "etapas": [{"q": "45'+8", "v": "Matheus Pereira<br>PERDE"},
                    {"q": "71'", "v": "Romero faz<br>o 2 a 1"},
                    {"q": "82'", "v": "Kaio Jorge<br>CONVERTE"}]},

        {"bloco": "NÚMEROS", "tipo": "numero", "rotulo": "entre um e outro",
         "ancora": "passaram 37 minutos de jogo",
         "numero": "37", "abaixo": "minutos entre o pênalti perdido<br>e o pênalti convertido"},

        {"bloco": "ÍNDICE", "tipo": "lista", "modo": "painel", "rotulo": "neste vídeo",
         "ancora": "Neste video voce vai entender quatro coisas",
         "itens": ["Quem tinha razão pelo regulamento do clube",
                   "O que a leitura labial mostrou — e o que ela não prova",
                   "O que dois jogadores contaram do vestiário",
                   "O detalhe das redes que ninguém comentou"]},

        {"bloco": "CTA", "tipo": "frase", "menor": True, "rotulo": "bora de bola",
         "ancora": "se inscreve no canal",
         "frase": 'Bastidor com fonte na mesa,<br>separando fato de interpretação'},

        {"bloco": "BLOCO 1", "tipo": "frase", "modo": "painel",
         "rotulo": "45 minutos e 8 do primeiro tempo",
         "ancora": "E o goleiro Mycael defende",
         "frase": 'Matheus Pereira bate.<br>'
                  '<span class="rlc">Mycael defende.</span>'},

        {"bloco": "BLOCO 1", "tipo": "frase", "menor": True,
         "rotulo": "por que isso importa",
         "ancora": "carrega uma coisa muito especifica pelo resto da partida",
         "frase": 'Cobrador que perde<br>quer bater de novo'},

        {"bloco": "BLOCO 2", "tipo": "frase", "modo": "painel", "rotulo": "aos 82 minutos",
         "ancora": "Kaio Jorge bate E faz",
         "frase": 'Kaio Jorge bate e faz.<br>'
                  '<span class="rlc">O gol número 50 dele pelo clube.</span>'},

        {"bloco": "BLOCO 2", "tipo": "frase", "menor": True,
         "rotulo": "artur jorge · técnico do cruzeiro",
         "ancora": "Artur Jorge explicou que o Cruzeiro tem uma ordem de batedores",
         "frase": 'Confirma que existe uma ordem.<br>'
                  'Não diz quem estava no topo dela.'},

        {"bloco": "BLOCO 3", "tipo": "frase", "modo": "painel",
         "rotulo": "leitura labial · velloso · com margem de erro declarada",
         "ancora": "Segundo essa leitura Matheus Pereira teria dito",
         "frase": '"Dá, me dá. Kaio, Kaio,<br>vai ficar feio"'},

        {"bloco": "BLOCO 3", "tipo": "frase", "modo": "painel",
         "rotulo": "leitura labial · velloso · com margem de erro declarada",
         "ancora": "a resposta atribuida a Kaio Jorge",
         "frase": '"Eu vou bater. Você não fez o gol, velho.<br>'
                  'Vai ficar feio se você não sair"'},

        {"bloco": "BLOCO 3", "tipo": "lista", "rotulo": "o que está provado",
         "ancora": "O que a gente sabe porque esta no video da transmissao",
         "itens": ["Discussão ANTES da cobrança",
                   "Discussão DEPOIS do gol",
                   "O dedo levantado"]},

        {"bloco": "BLOCO 4", "tipo": "frase", "modo": "painel",
         "rotulo": "joão marcelo · zagueiro, estava no vestiário",
         "ancora": "disse o seguinte eles se resolveram no vestiario",
         "frase": '"Eles se resolveram no vestiário.<br>'
                  'Os dois são batedores. Está resolvido"'},

        {"bloco": "BLOCO 4", "tipo": "numero", "rotulo": "fagner, no antidoping",
         "ancora": "so foi liberado mais de duas horas depois do apito",
         "numero": "2h", "abaixo": "depois do apito final —<br>ele confirmou, mas não viu"},

        {"bloco": "BLOCO 5", "tipo": "lista", "modo": "painel",
         "rotulo": "o que cada um postou",
         "ancora": "Os dois se manifestaram nas redes sociais",
         "itens": ["Matheus Pereira: foto abraçado com Kaio",
                   "Kaio Jorge: o gol 50, várias imagens",
                   "Nenhuma delas com o companheiro"]},

        {"bloco": "BLOCO 5", "tipo": "frase", "menor": True,
         "rotulo": "o que isso NÃO é",
         "ancora": "Isso nao prova que existe briga",
         "frase": 'Não é prova de briga.<br>É um dado — e dado a gente registra.'},

        {"bloco": "BLOCO 6", "tipo": "escudos", "modo": "painel",
         "rotulo": "em casa, de virada",
         "ancora": "para a lanterna Chapecoense",
         "esq": esc["corinthians"], "dir": esc["chapecoense"],
         "placar_esq": "1", "placar_dir": "2"},

        {"bloco": "BLOCO 6", "tipo": "lista", "modo": "painel",
         "rotulo": "o jogo que não fecha na conta",
         "ancora": "O Corinthians teve 62 por cento de posse de bola",
         "itens": ["Corinthians: 62% de posse, 16 finalizações — 1 gol",
                   "Chapecoense: 7 finalizações — 2 gols",
                   "Faltas: 21 da Chape, 9 do Corinthians"]},

        {"bloco": "BLOCO 6", "tipo": "frase", "menor": True,
         "rotulo": "fernando diniz · técnico do corinthians",
         "ancora": "A frase dele foi eu fico constrangido",
         "frase": '"Eu fico constrangido"'},

        {"bloco": "BLOCO 7", "tipo": "numero", "modo": "painel",
         "rotulo": "proposta do tigres, do méxico",
         "ancora": "Em reais cerca de 41 milhoes",
         "numero": "R$ 41 mi", "abaixo": "por Arthur Cabral<br>(8 milhões de dólares)"},

        {"bloco": "BLOCO 7", "tipo": "frase", "menor": True, "rotulo": "o problema não é o preço",
         "ancora": "A janela de transferencias fecha na proxima sexta-feira",
         "frase": 'A janela fecha na SEXTA.<br>'
                  '<span class="rlc">Repor centroavante em 5 dias.</span>'},

        {"bloco": "BLOCO 8", "tipo": "numero", "modo": "painel", "rotulo": "na rodada",
         "ancora": "tres expulsoes e duas delas nos acrescimos",
         "numero": "3", "abaixo": "expulsões — duas delas<br>já nos acréscimos"},

        {"bloco": "BLOCO 8", "tipo": "frase", "menor": True,
         "rotulo": "abel ferreira · técnico do palmeiras",
         "ancora": "a expulsao do Marcal era clara",
         "frase": '"A expulsão do Marçal era clara,<br>e o árbitro deu amarelo"'},

        {"bloco": "FECHO", "tipo": "frase", "menor": True, "rotulo": "e você, o que acha?",
         "ancora": "Kaio Jorge estava certo em bater",
         "frase": 'A bola era do cobrador oficial?<br>Comenta aí embaixo'},
    ]]


def cartelas_do_episodio(slug):
    """A marcacao de b-roll deste episodio, na ordem em que entra no video.

    Cada entrada declara o BLOCO que ela ilustra — e assim que a montagem sabe
    onde ela cai, sem depender de eu acertar o segundo aqui.
    """
    ESCRITOS = ("2026-09-04-abel-stjd", "2026-09-06-arbitragem-flu-vasco",
                "2026-09-07-penalti-cruzeiro")
    if slug not in ESCRITOS:
        raise SystemExit("sem marcação escrita para %s — escreva antes de gerar" % slug)
    esc = {k: ESCUDO % v for k, v in CLUBES.items()}
    if slug == "2026-09-06-arbitragem-flu-vasco":
        return _arbitragem_flu_vasco(esc)
    if slug == "2026-09-07-penalti-cruzeiro":
        return _penalti_cruzeiro(esc)
    def m(c):
        """`faixa` é o padrão: quem não declarou modo é camada leve."""
        c.setdefault("modo", "faixa")
        return c

    return [m(c) for c in [
        {"bloco": "GANCHO", "tipo": "frase", "rotulo": "agora",
         "frase": 'Abel fora.<br><span class="rlc">E o Palmeiras não aceitou.</span>'},

        {"bloco": "NÚMEROS", "tipo": "numero", "rotulo": "a punição", "modo": "painel",
         "numero": "2", "abaixo": "partidas de suspensão<br>por chutar o microfone"},

        {"bloco": "NÚMEROS", "tipo": "frase", "menor": True, "rotulo": "onde foi julgado",
         "frase": '3ª Comissão Disciplinar<br>do STJD'},

        {"bloco": "ÍNDICE", "tipo": "lista", "modo": "painel", "rotulo": "neste vídeo",
         "itens": ["O que virou a sessão do STJD",
                   "Como fica a escalação sem o técnico",
                   "O que o recurso muda na prática",
                   "O tamanho real do prejuízo"]},

        {"bloco": "ÍNDICE", "tipo": "frase", "menor": True, "rotulo": "fica até o fim",
         "frase": 'A quarta é a que<br><span class="rlc">quase ninguém está ligando</span>'},

        {"bloco": "CTA", "tipo": "frase", "menor": True, "rotulo": "bora de bola",
         "frase": 'Plantão do futebol brasileiro<br>todo dia, com fonte na mesa'},

        {"bloco": "BLOCO 1", "tipo": "frase", "rotulo": "o recurso", "modo": "painel",
         "frase": 'O Palmeiras vai pedir<br><span class="rlc">efeito suspensivo</span>'},

        {"bloco": "BLOCO 1", "tipo": "frase", "menor": True,
         "rotulo": "o que isso significa",
         "frase": 'Paralisa a decisão<br>até o tribunal superior julgar'},

        {"bloco": "BLOCO 2", "tipo": "escudos", "modo": "painel", "rotulo": "domingo, 18h30",
         "escudos": [esc["botafogo"], esc["palmeiras"]], "entre": "&times;",
         "frase": "Nilton Santos"},

        {"bloco": "BLOCO 2", "tipo": "numero", "rotulo": "desfalques",
         "numero": "2", "abaixo": "no mínimo — o lateral Arthur<br>cumpre suspensão"},

        {"bloco": "BLOCO 2B", "tipo": "placar", "modo": "painel", "rotulo": "brasileirão · 26ª rodada",
         "lados": [{"nome": "Palmeiras", "pts": "52", "pos": "líder", "lider": True},
                   {"nome": "Flamengo", "pts": "51", "pos": "vice"}],
         "abaixo": "um ponto separa os dois"},

        {"bloco": "BLOCO 2B", "tipo": "numero", "modo": "painel", "rotulo": "único clube do brasil",
         "numero": "3", "abaixo": "competições disputadas<br>ao mesmo tempo"},

        {"bloco": "BLOCO 2C", "tipo": "frase", "menor": True, "rotulo": "o reencontro",
         "frase": 'Barboza volta ao Nilton Santos<br>'
                  '<span class="rlc">três meses depois do adeus</span>'},

        {"bloco": "BLOCO 2C", "tipo": "escudos", "rotulo": "o outro lado",
         "escudos": [esc["botafogo"]],
         "frase": "Com desfalques,<br>o Botafogo deve mudar de esquema"},

        {"bloco": "BLOCO 2C", "tipo": "numero", "rotulo": "o adeus",
         "numero": "3", "abaixo": "meses desde a despedida<br>no mesmo estádio"},

        {"bloco": "BLOCO 3", "tipo": "frase", "menor": True, "rotulo": "o que o tribunal avalia",
         "frase": 'A comunicação do VAR<br>sobre o lance'},

        {"bloco": "BLOCO 3", "tipo": "linha_do_tempo", "modo": "painel", "rotulo": "como a sessão virou",
         "etapas": [{"q": "1º voto", "v": "absolvição"},
                    {"q": "2º voto", "v": "1 jogo"},
                    {"q": "intervalo", "v": "pausa para<br>o almoço"},
                    {"q": "resultado", "v": "2 jogos"}]},

        {"bloco": "BLOCO 4", "tipo": "numero", "rotulo": "copa do brasil", "modo": "painel",
         "numero": "R$ 9 mi", "abaixo": "pela vaga na semifinal"},

        {"bloco": "BLOCO 4", "tipo": "numero", "modo": "painel",
         "rotulo": "premiação acumulada em 2026",
         "numero": "48,33", "abaixo": "milhões de reais<br>vice-liderança do ranking"},

        {"bloco": "FECHO", "tipo": "frase", "modo": "painel", "rotulo": "resumindo",
         "frase": 'Dois jogos.<br>Recurso a caminho.<br>'
                  '<span class="rlc">E um ponto de vantagem.</span>'},
    ]]


def _slug(t):
    """Nome de arquivo sem acento: ele vai entrar em linha de comando do ffmpeg."""
    t = unicodedata.normalize("NFD", t.lower())
    t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", "", t)


def renderiza(cards, saida):
    """Uma PNG por cartela, 1920x1080, pelo mesmo caminho da thumb."""
    from playwright.sync_api import sync_playwright
    os.makedirs(saida, exist_ok=True)
    feitas = []
    with sync_playwright() as pw:
        nav = pw.chromium.launch()
        pg = nav.new_page(viewport={"width": 1920, "height": 1080},
                          device_scale_factor=1)
        # A camada precisa de canal alfa: sem `omit_background` o Chromium pinta
        # branco onde o CSS pediu transparente, e a "camada" viraria um retângulo
        # branco sobre o take.
        for i, c in enumerate(cards, 1):
            if c is None:
                continue
            # URL-SAFE, e nao o base64 comum. O alfabeto padrao usa "+" e "/";
            # numa query string o "+" e lido como ESPACO, o `atob` do template
            # falha, e a cartela sai TRANSPARENTE -- sem erro, sem aviso.
            # Em 06/09 foram 6 de 20 cartelas invisiveis no video final, e o
            # defeito so apareceu ao medir o canal alfa dos PNGs.
            d = base64.urlsafe_b64encode(json.dumps(c, ensure_ascii=False)
                                         .encode("utf-8")).decode()
            pg.goto("file:///%s?d=%s" % (TEMPLATE.replace("\\", "/"), d))
            # Escudo vem de CDN. Sem esperar, a cartela sai com o quadro vazio —
            # e o defeito so aparece no PNG, quando ja e tarde.
            pg.wait_for_timeout(600)
            try:
                pg.wait_for_function(
                    "[...document.images].every(i => i.complete && i.naturalWidth > 0)",
                    timeout=9000)
            except Exception:
                print("  aviso: cartela %02d tem imagem que não carregou" % i)
            arq = os.path.join(saida, "c%02d-%s.png" % (i, _slug(c["bloco"])))
            pg.locator("#alvo").screenshot(path=arq, omit_background=True)
            # GUARDA: PNG 100% transparente e cartela que nao vai aparecer.
            # Falhar aqui e melhor que descobrir no video montado.
            try:
                from PIL import Image as _Im
                _a = _Im.open(arq).convert("RGBA").split()[-1]
                if _a.getextrema()[1] == 0:
                    raise SystemExit(
                        "cartela %02d (%s) saiu TRANSPARENTE — o template nao "
                        "recebeu o dado. Confira o encode da query string."
                        % (i, c["bloco"]))
            except ImportError:
                pass
            feitas.append((i, c, arq))
        nav.close()
    return feitas


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("--so", type=int, help="renderiza só esta cartela")
    a = ap.parse_args()

    cards = cartelas_do_episodio(a.slug)
    if a.so:
        cards = [c if i == a.so else None for i, c in enumerate(cards, 1)]

    saida = os.path.join(CANAL, "episodios", a.slug, "04-takes", "cartelas")
    feitas = renderiza(cards, saida)

    print("%-3s %-10s %-16s %-7s %s" % ("#", "BLOCO", "TIPO", "MODO", "ARQUIVO"))
    print("─" * 66)
    for i, c, arq in feitas:
        print("%-3d %-10s %-16s %-7s %s" % (i, c["bloco"][:10], c["tipo"],
                                            c.get("modo", "faixa"),
                                            os.path.basename(arq)))
    print("\n%d cartelas em 04-takes/cartelas/" % len(feitas))

    # O indice diz a que bloco cada cartela pertence — e o que a montagem le.
    idx = os.path.join(saida, "cartelas.json")
    with open(idx, "w", encoding="utf-8") as f:
        json.dump([{"n": i, "bloco": c["bloco"], "tipo": c["tipo"],
                    "modo": c.get("modo", "faixa"),
                    # a ANCORA viaja no indice: e ela que diz ao monta.py em que
                    # ponto da fala esta cartela deve entrar
                    "ancora": c.get("ancora", ""),
                    "arquivo": os.path.basename(arq)} for i, c, arq in feitas],
                  f, ensure_ascii=False, indent=2)
    return 0


if __name__ == "__main__":
    sys.exit(main())
