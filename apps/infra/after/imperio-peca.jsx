/*
 * imperio-peca.jsx — monta a peca inteira dentro do After Effects, editavel.
 *
 * COMO RODAR
 *   No AE:  Arquivo > Scripts > Executar arquivo de script...  e escolha
 *   este arquivo. Ele constroi o projeto do zero e deixa a comp master
 *   aberta. Nada e salvo automaticamente -- salvar e sua decisao.
 *
 * O QUE ELE CONSTROI
 *   00_PECA_FINAL     master, 18,75 s
 *   ├── 01_HOOK       os tres cortes que voce cortou, como camadas separadas
 *   ├── FX_FLARE      o flare da transicao, comp propria e reaproveitavel
 *   ├── 02_RETRO_2025 os cinco momentos, cada um em sua camada
 *   └── 03_CARTELA    2026 + coroa + marca, animado
 *
 * POR QUE MATCHNAME E NAO NOME DE EFEITO
 *   Este AE esta em portugues. `addProperty("Preto e branco")` funcionaria
 *   aqui e quebraria em qualquer AE em ingles. MatchName ("ADBE Black&White")
 *   e o identificador interno: nao muda com o idioma, nao muda com a versao.
 *   Todo efeito deste script entra por matchName, de proposito.
 *
 * O QUE ESTE SCRIPT NAO FAZ
 *   Nao renderiza. Construir e renderizar sao decisoes diferentes: voce vai
 *   querer mexer antes de exportar, e e exatamente para isso que o projeto
 *   existe em vez de um mp4 pronto.
 */

// ══════════════════════════════════════════════════════════════════════════
//  CONFIGURACAO
// ══════════════════════════════════════════════════════════════════════════

var DOWN = "C:/Users/Pichau/Downloads/";

var LARG = 1080, ALT = 1920, FPS = 30;

/* Os tres cortes do hook, com a duracao que cada um OCUPA na sua montagem.
 *
 * Os arquivos somam 5,80 s; o hook.mp4 que voce montou tem 4,95 s. A
 * diferenca nao foi chutada: rodando deteccao de cena no seu proprio hook,
 * as emendas caem em 1,933 s e 4,467 s. Dai saem as duracoes abaixo -- e o
 * projeto nasce com o SEU corte, nao com um corte parecido.
 *
 * A sobra de cada arquivo continua disponivel na camada: arrastar a ponta
 * no AE devolve o que foi aparado, porque a fonte inteira esta la. */
var CORTES = [
    { arq: "cortes/cortes-1.mp4", dur: 1.933, nome: "corte 1" },
    { arq: "cortes/cortes-2.mp4", dur: 2.534, nome: "corte 2" },   // sobra 0,67 s
    { arq: "cortes/cortes-3.mp4", dur: 0.479, nome: "corte 3" }    // sobra 0,17 s
];

// Os cinco momentos da retrospectiva: inicio no material de 2025, duracao,
// e o que e. Mexer AQUI e a forma rapida de trocar a retrospectiva inteira.
var MOMENTOS = [
    { em:  9.4, dur: 2.2, nome: "criancas correndo em massa" },
    { em: 17.6, dur: 2.0, nome: "a comida sendo servida" },
    { em: 25.6, dur: 2.0, nome: "a comunidade de cima" },
    { em: 29.6, dur: 2.2, nome: "a multidao na rua" },
    { em: 38.4, dur: 2.2, nome: "o Bruno e a marca" }
];

var D_CARTELA = 3.2;
var FONTE = "Impact";
var AZUL = [0.169, 0.702, 0.941];   // #2BB3F0, o azul da marca
var OURO = [0.94, 0.66, 0.16];

// ══════════════════════════════════════════════════════════════════════════
//  FERRAMENTAS
// ══════════════════════════════════════════════════════════════════════════

var faltando = [];

function importa(rel, nome) {
    var f = new File(DOWN + rel);
    if (!f.exists) { faltando.push(DOWN + rel); return null; }
    var it = app.project.importFile(new ImportOptions(f));
    if (nome) it.name = nome;
    return it;
}

/* Escala a camada para PREENCHER a comp (cover), nao para caber dentro.
 * Material de origens diferentes -- 1440x2518, 360x640, 512x896 -- precisa
 * chegar na mesma grade sem barra preta. Cover corta o excedente; fit
 * deixaria tarja, que numa peca vertical e a pior das duas opcoes. */
function preenche(L, comp) {
    var s = L.source;
    if (!s || !s.width) return;
    var f = Math.max(comp.width / s.width, comp.height / s.height) * 100;
    L.property("ADBE Transform Group").property("ADBE Scale").setValue([f, f]);
    L.property("ADBE Transform Group").property("ADBE Position")
        .setValue([comp.width / 2, comp.height / 2]);
}

/* Coloca no tempo t0 da comp o trecho do material que comeca em `em`.
 * startTime e o instante da comp em que o quadro ZERO do material cairia --
 * por isso ele e negativo quando se quer entrar no meio do arquivo. Esta e
 * a linha que mais gente erra ao escrever script de AE. */
function recorta(L, t0, em, dur) {
    L.startTime = t0 - em;
    L.inPoint = t0;
    L.outPoint = t0 + dur;
}

function ef(L, matchName) {
    return L.property("ADBE Effect Parade").addProperty(matchName);
}

/* Dois keyframes com aceleracao suave nas duas pontas.
 *
 * A armadilha: propriedades ESPACIAIS (Posicao) usam UM valor de ease
 * (velocidade), enquanto as demais usam um por dimensao. Passar dois eases
 * para a Posicao levanta excecao. Por isso a dimensao e descoberta aqui em
 * vez de assumida. */
function anima(prop, t1, v1, t2, v2, vel) {
    vel = (vel === undefined) ? 70 : vel;
    prop.setValueAtTime(t1, v1);
    prop.setValueAtTime(t2, v2);
    var espacial = (prop.propertyValueType === PropertyValueType.TwoD_SPATIAL ||
                    prop.propertyValueType === PropertyValueType.ThreeD_SPATIAL);
    var dim = espacial ? 1 : ((v2 instanceof Array) ? v2.length : 1);
    var e = [];
    for (var i = 0; i < dim; i++) e.push(new KeyframeEase(0, vel));
    try {
        prop.setTemporalEaseAtKey(prop.nearestKeyIndex(t1), e, e);
        prop.setTemporalEaseAtKey(prop.nearestKeyIndex(t2), e, e);
    } catch (err) { /* linear serve; nao vale derrubar a montagem por isso */ }
}

function texto(comp, txt, tam, cor, y, nome) {
    var L = comp.layers.addText(txt);
    L.name = nome || txt;
    var p = L.property("ADBE Text Properties").property("ADBE Text Document");
    var d = p.value;
    d.font = FONTE;
    d.fontSize = tam;
    d.fillColor = cor;
    d.applyFill = true;
    d.applyStroke = false;
    d.justification = ParagraphJustification.CENTER_JUSTIFY;
    p.setValue(d);
    L.property("ADBE Transform Group").property("ADBE Position")
        .setValue([comp.width / 2, y]);
    return L;
}

/* Vinheta SEM mascara.
 *
 * Mascara elipsoidal por script exige montar vertices e tangentes na mao --
 * muito codigo para um efeito que o Gradiente resolve: rampa RADIAL de
 * branco no centro a preto na borda, camada em MULTIPLICAR. Branco multiplica
 * por 1 (centro intacto), preto multiplica por 0 (borda escura). */
function vinheta(comp, forca) {
    var v = comp.layers.addSolid([1, 1, 1], "vinheta", comp.width, comp.height, 1);
    var r = ef(v, "ADBE Ramp");
    r.property("ADBE Ramp-0001").setValue([comp.width / 2, comp.height / 2]);
    r.property("ADBE Ramp-0002").setValue([1, 1, 1, 1]);
    r.property("ADBE Ramp-0003").setValue([comp.width * 1.02, comp.height * 0.92]);
    r.property("ADBE Ramp-0004").setValue([0, 0, 0, 1]);
    r.property("ADBE Ramp-0005").setValue(2);          // 2 = radial
    v.blendingMode = BlendingMode.MULTIPLY;
    v.property("ADBE Transform Group").property("ADBE Opacity")
        .setValue(forca === undefined ? 55 : forca);
    return v;
}

// ══════════════════════════════════════════════════════════════════════════

app.beginUndoGroup("Monta a peca Imperio");
app.newProject();
app.project.bitsPerChannel = 16;   // 8 bits estoura banding no ceu gerado

var pastaFontes = app.project.items.addFolder("_fontes");

// ── importacao ────────────────────────────────────────────────────────────
var fCortes = [];
for (var i = 0; i < CORTES.length; i++)
    fCortes.push(importa(CORTES[i].arq, CORTES[i].nome));

var f2025   = importa("video (1).mp4", "2025 (material real)");
var fHook   = importa("hook.mp4", "hook montado (audio)");
var fCoroa  = importa("imperio-coroa.png", "coroa");
var fSfx    = importa("transicao-flare.wav", "sfx transicao");
var fVozes  = [];
var VOZES = ["voz-bruno/natural1_00001.wav", "voz-bruno/natural2_00001.wav",
             "voz-bruno/hookC_00001.wav"];
for (var i = 0; i < VOZES.length; i++) {
    var v = importa(VOZES[i], "voz " + (i + 1));
    if (v) fVozes.push(v);
}
// os takes brutos, para quem quiser remontar o hook do zero
var fTakes = [];
var TAKES = ["shot01_00012_.mp4", "shot02_00004_.mp4"];
for (var i = 0; i < TAKES.length; i++) {
    var t = importa(TAKES[i], "take bruto " + (i + 1));
    if (t) fTakes.push(t);
}

if (faltando.length) {
    alert("Nao achei " + faltando.length + " arquivo(s):\n\n" +
          faltando.join("\n") +
          "\n\nO projeto vai ser montado sem eles -- as camadas que " +
          "dependiam desses arquivos nao vao existir.");
}

/* Recolher ANTES de mover.
 * Mudar `parentFolder` reordena a lista do projeto, e um laco que le
 * `app.project.item(i)` enquanto move pula itens -- o classico bug de
 * modificar a colecao durante a iteracao. */
var aMover = [];
for (var i = 1; i <= app.project.numItems; i++) {
    var it = app.project.item(i);
    if (it instanceof FootageItem) aMover.push(it);
}
for (var i = 0; i < aMover.length; i++) aMover[i].parentFolder = pastaFontes;

// ══════════════════════════════════════════════════════════════════════════
//  01_HOOK — os tres cortes, cada um na sua camada
// ══════════════════════════════════════════════════════════════════════════
var dHook = 0;
for (var i = 0; i < CORTES.length; i++) dHook += CORTES[i].dur;

var cHook = app.project.items.addComp("01_HOOK", LARG, ALT, 1, dHook, FPS);
cHook.bgColor = [0, 0, 0];
cHook.motionBlur = true;

var t = 0;
for (var i = CORTES.length - 1; i >= 0; i--) {     // de tras para frente:
    if (!fCortes[i]) continue;                     // assim a ordem das
    var acc = 0;                                   // camadas sai natural
    for (var k = 0; k < i; k++) acc += CORTES[k].dur;
    var L = cHook.layers.add(fCortes[i]);
    L.name = CORTES[i].nome;
    preenche(L, cHook);
    recorta(L, acc, 0, CORTES[i].dur);
    L.label = 9;
}

/* O AUDIO vem do hook.mp4, nao dos cortes.
 * Voce montou ali a ambiencia e o SFX de climax; os cortes crus tem so o
 * que o LTX gerou. Entao a imagem vem dos cortes (editaveis) e o som vem da
 * sua montagem (pronta) -- e o video do hook.mp4 fica desligado. */
if (fHook) {
    var La = cHook.layers.add(fHook);
    La.name = "AUDIO do seu hook";
    La.enabled = false;             // so a trilha; a imagem vem dos cortes
    La.audioEnabled = true;
    La.label = 5;
}

// grade do hook num ajuste, para poder desligar e comparar
var ajH = cHook.layers.addSolid([1, 1, 1], "GRADE (ajuste)", LARG, ALT, 1);
ajH.adjustmentLayer = true;
ajH.moveToBeginning();
/* NIVEIS: a ordem dos parametros do efeito, que nao e obvia.
 *   -0003 preto de entrada   -0004 branco de entrada   -0005 GAMA
 *   -0006 preto de saida     -0007 branco de saida
 * Na primeira versao deste script o gama foi escrito em -0007 -- o que
 * mexe no branco de saida. O valor entrava, o efeito nao era o pedido, e
 * nada reclamava. Indice errado em efeito de AE nunca da erro: da imagem
 * diferente. */
var cur = ef(ajH, "ADBE CurvesCustom");
var lvl = ef(ajH, "ADBE Easy Levels2");
lvl.property("ADBE Easy Levels2-0005").setValue(1.04);   // gama
var gr = ef(ajH, "ADBE Noise");
gr.property("ADBE Noise-0001").setValue(0.022);          // quantidade
gr.property("ADBE Noise-0002").setValue(false);          // ruido de cor nao
vinheta(cHook, 42);

// ══════════════════════════════════════════════════════════════════════════
//  02_RETRO_2025 — os cinco momentos, em P&B
// ══════════════════════════════════════════════════════════════════════════
var dRetro = 0;
for (var i = 0; i < MOMENTOS.length; i++) dRetro += MOMENTOS[i].dur;

var cRetro = app.project.items.addComp("02_RETRO_2025", LARG, ALT, 1, dRetro, FPS);
cRetro.bgColor = [0, 0, 0];

if (f2025) {
    for (var i = MOMENTOS.length - 1; i >= 0; i--) {
        var acc = 0;
        for (var k = 0; k < i; k++) acc += MOMENTOS[k].dur;
        var L = cRetro.layers.add(f2025);
        L.name = (i + 1) + ") " + MOMENTOS[i].nome;
        preenche(L, cRetro);
        recorta(L, acc, MOMENTOS[i].em, MOMENTOS[i].dur);
        L.label = 11;
        cRetro.markerProperty.setValueAtTime(
            acc, new MarkerValue(MOMENTOS[i].nome));
    }
}

/* O P&B num AJUSTE, e nao em cada camada.
 * Nao e so economia de cliques: com o ajuste, mudar o look da retrospectiva
 * inteira e mexer em UMA curva. Com o efeito em cada camada, e mexer em
 * cinco e torcer para ficarem iguais. */
var ajR = cRetro.layers.addSolid([1, 1, 1], "P&B + GRADE (ajuste)",
                                 LARG, ALT, 1);
ajR.adjustmentLayer = true;
ajR.moveToBeginning();

/* ORDEM DOS EFEITOS, e ela ja custou uma versao errada.
 * O grao precisa vir ANTES da dessaturacao. Aplicado depois, ele pinta os
 * tres canais de forma independente e devolve COR ao preto e branco -- na
 * versao em ffmpeg a saturacao ficou em 30-38 por causa disso. */
var gr2 = ef(ajR, "ADBE Noise");
gr2.property("ADBE Noise-0001").setValue(0.05);
gr2.property("ADBE Noise-0002").setValue(false);
ef(ajR, "ADBE Black&White");
/* Preto de saida em 0,06 e o que da "filme" ao P&B: preto puro e video,
 * preto levantado e pelicula. O branco em 0,94 segura o ceu, que no
 * material de celular estoura com facilidade. */
var lv2 = ef(ajR, "ADBE Easy Levels2");
lv2.property("ADBE Easy Levels2-0003").setValue(0.0);    // preto de entrada
lv2.property("ADBE Easy Levels2-0004").setValue(1.0);    // branco de entrada
lv2.property("ADBE Easy Levels2-0005").setValue(0.96);   // gama
lv2.property("ADBE Easy Levels2-0006").setValue(0.06);   // preto de saida
lv2.property("ADBE Easy Levels2-0007").setValue(0.94);   // branco de saida
vinheta(cRetro, 62);

// a cartela "2025", discreta, so no primeiro momento
var t2025 = texto(cRetro, "2025", 96, [0.86, 0.86, 0.86], ALT * 0.16, "2025");
var op25 = t2025.property("ADBE Transform Group").property("ADBE Opacity");
anima(op25, 0.25, 0, 0.75, 85);
anima(op25, 2.00, 85, 2.60, 0);

// ══════════════════════════════════════════════════════════════════════════
//  FX_FLARE — o flare da transicao, em comp propria
// ══════════════════════════════════════════════════════════════════════════
/*
 * POR QUE COMP PROPRIA
 *   Um flare montado direto na master vira quatro camadas soltas no meio da
 *   linha do tempo, e qualquer ajuste depois exige mexer nas quatro em
 *   sincronia. Isolado, ele e UMA camada na master, com um ponto de corte
 *   so -- e reaproveitavel na proxima peca.
 *
 * COMO ELE E FEITO SEM PLUGIN
 *   Optical Flares, Knoll, Video Copilot: nenhum esta instalado, e um
 *   projeto que depende de plugin nao abre na maquina do cliente. Tudo aqui
 *   e nativo:
 *     nucleo   Gradiente Radial branco->preto em ADICAO. Preto em adicao
 *              nao soma nada, entao o preto VIRA a transparencia.
 *     estria   solido achatado com desfoque forte, tambem em adicao -- e a
 *              risca horizontal anamorfica.
 *     vazamento  rampa quente atravessando o quadro em TELA: o vazamento de
 *              luz da emenda de filme.
 *     brilho   Glow por cima, que e o que faz os tres virarem um so.
 *
 * O TEMPO
 *   O corte cai em 1,0 s dentro desta comp -- o mesmo instante em que o SFX
 *   tem o pico. Os dois foram feitos para se encontrar ali.
 */
var D_FLARE = 2.0, T_CORTE = 1.0;
var cFlare = app.project.items.addComp("FX_FLARE", LARG, ALT, 1, D_FLARE, FPS);
cFlare.motionBlur = true;
cFlare.markerProperty.setValueAtTime(T_CORTE, new MarkerValue("CORTE"));

// — nucleo —
var nuc = cFlare.layers.addSolid([1, 1, 1], "nucleo", LARG, ALT, 1);
var rn = ef(nuc, "ADBE Ramp");
rn.property("ADBE Ramp-0001").setValue([LARG / 2, ALT * 0.44]);
rn.property("ADBE Ramp-0002").setValue([1, 1, 1, 1]);
rn.property("ADBE Ramp-0003").setValue([LARG / 2, ALT * 0.44 + 420]);
rn.property("ADBE Ramp-0004").setValue([0, 0, 0, 1]);
rn.property("ADBE Ramp-0005").setValue(2);
nuc.blendingMode = BlendingMode.ADD;
var esN = nuc.property("ADBE Transform Group").property("ADBE Scale");
anima(esN, T_CORTE - 0.20, [40, 40], T_CORTE, [130, 130], 80);
anima(esN, T_CORTE, [130, 130], T_CORTE + 0.45, [190, 190], 40);
var opN = nuc.property("ADBE Transform Group").property("ADBE Opacity");
anima(opN, T_CORTE - 0.20, 0, T_CORTE, 100, 90);
anima(opN, T_CORTE, 100, T_CORTE + 0.50, 0, 30);

// — estria anamorfica —
var est = cFlare.layers.addSolid([1, 1, 1], "estria", LARG, ALT, 1);
var re = ef(est, "ADBE Ramp");
re.property("ADBE Ramp-0001").setValue([LARG / 2, ALT / 2]);
re.property("ADBE Ramp-0002").setValue([0.75, 0.88, 1, 1]);   // levemente fria
re.property("ADBE Ramp-0003").setValue([LARG * 1.05, ALT / 2]);
re.property("ADBE Ramp-0004").setValue([0, 0, 0, 1]);
re.property("ADBE Ramp-0005").setValue(2);
var bl = ef(est, "ADBE Box Blur2");
bl.property("ADBE Box Blur2-0001").setValue(30);
est.blendingMode = BlendingMode.ADD;
est.property("ADBE Transform Group").property("ADBE Position")
   .setValue([LARG / 2, ALT * 0.44]);
var esE = est.property("ADBE Transform Group").property("ADBE Scale");
anima(esE, T_CORTE - 0.15, [60, 1.5], T_CORTE, [210, 3.5], 80);
anima(esE, T_CORTE, [210, 3.5], T_CORTE + 0.55, [280, 1.0], 30);
var opE = est.property("ADBE Transform Group").property("ADBE Opacity");
anima(opE, T_CORTE - 0.15, 0, T_CORTE, 100, 90);
anima(opE, T_CORTE, 100, T_CORTE + 0.55, 0, 30);

// — vazamento de luz quente —
var vaz = cFlare.layers.addSolid([1, 1, 1], "vazamento", LARG * 2, ALT, 1);
var rv = ef(vaz, "ADBE Ramp");
rv.property("ADBE Ramp-0001").setValue([LARG * 0.5, ALT / 2]);
rv.property("ADBE Ramp-0002").setValue([1, 0.62, 0.22, 1]);
rv.property("ADBE Ramp-0003").setValue([LARG * 1.6, ALT / 2]);
rv.property("ADBE Ramp-0004").setValue([0, 0, 0, 1]);
rv.property("ADBE Ramp-0005").setValue(2);
var bv = ef(vaz, "ADBE Box Blur2");
bv.property("ADBE Box Blur2-0001").setValue(60);
vaz.blendingMode = BlendingMode.SCREEN;
var poV = vaz.property("ADBE Transform Group").property("ADBE Position");
anima(poV, T_CORTE - 0.30, [-LARG * 0.4, ALT * 0.40],
           T_CORTE + 0.60, [LARG * 1.4, ALT * 0.52], 20);
var opV = vaz.property("ADBE Transform Group").property("ADBE Opacity");
anima(opV, T_CORTE - 0.30, 0, T_CORTE - 0.05, 75, 80);
anima(opV, T_CORTE + 0.10, 75, T_CORTE + 0.65, 0, 30);

// — brilho por cima de tudo —
var ajF = cFlare.layers.addSolid([1, 1, 1], "brilho (ajuste)", LARG, ALT, 1);
ajF.adjustmentLayer = true;
ajF.moveToBeginning();
var glo = ef(ajF, "ADBE Glo2");
glo.property("ADBE Glo2-0002").setValue(0.65);   // limiar
glo.property("ADBE Glo2-0003").setValue(28);     // raio
glo.property("ADBE Glo2-0004").setValue(1.4);    // intensidade

// ══════════════════════════════════════════════════════════════════════════
//  03_CARTELA — 2026, coroa e marca
// ══════════════════════════════════════════════════════════════════════════
var cCart = app.project.items.addComp("03_CARTELA", LARG, ALT, 1, D_CARTELA, FPS);
cCart.bgColor = [0, 0, 0];
cCart.motionBlur = true;
var fundo = cCart.layers.addSolid([0, 0, 0], "preto", LARG, ALT, 1);
fundo.moveToEnd();

// — 2026 —
var t26 = texto(cCart, "2026", 180, [1, 1, 1], ALT * 0.34, "2026");
t26.motionBlur = true;
var es26 = t26.property("ADBE Transform Group").property("ADBE Scale");
anima(es26, 0.00, [112, 112], 0.70, [100, 100], 85);
var op26 = t26.property("ADBE Transform Group").property("ADBE Opacity");
anima(op26, 0.00, 0, 0.40, 100, 70);
var bl26 = ef(t26, "ADBE Box Blur2");
anima(bl26.property("ADBE Box Blur2-0001"), 0.00, 26, 0.45, 0, 85);

// — 12 de outubro —
var tdata = texto(cCart, "12 DE OUTUBRO", 76, AZUL, ALT * 0.34 + 112, "12 de outubro");
var opD = tdata.property("ADBE Transform Group").property("ADBE Opacity");
anima(opD, 0.45, 0, 0.90, 100, 70);
var poD = tdata.property("ADBE Transform Group").property("ADBE Position");
anima(poD, 0.45, [LARG / 2, ALT * 0.34 + 136],
           0.90, [LARG / 2, ALT * 0.34 + 112], 75);

// — a coroa —
/* O ARQUIVO ORIGINAL NAO SERVE AQUI.
 * O jpg da coroa tem 800x250 com o desenho so na esquerda: centrado, ele
 * cai 136 px a esquerda do centro do quadro. `limpa_logo.py` recorta o
 * desenho e devolve alpha de verdade, preservando as estrelas brancas de
 * dentro -- que um colorkey no branco furaria junto com o fundo. */
if (fCoroa) {
    var Lc = cCart.layers.add(fCoroa);
    Lc.name = "coroa";
    Lc.motionBlur = true;
    var alvo = 330 / fCoroa.width * 100;
    Lc.property("ADBE Transform Group").property("ADBE Position")
      .setValue([LARG / 2, ALT * 0.54]);
    var esC = Lc.property("ADBE Transform Group").property("ADBE Scale");
    anima(esC, 0.95, [alvo * 0.82, alvo * 0.82], 1.35, [alvo * 1.05, alvo * 1.05], 80);
    anima(esC, 1.35, [alvo * 1.05, alvo * 1.05], 1.60, [alvo, alvo], 40);
    var opC = Lc.property("ADBE Transform Group").property("ADBE Opacity");
    anima(opC, 0.95, 0, 1.30, 100, 70);
    /* Varredura de luz sobre o dourado: o brilho que atravessa o metal.
     *
     * O CC Light Sweep e Cycore, vem junto com o AE -- mas os parametros
     * dele so podem ser alcancados por INDICE, porque os matchNames
     * internos nao sao publicos. Indice e fragil entre versoes, entao tudo
     * aqui esta dentro de try: se falhar, a coroa entra sem a varredura e
     * o resto do projeto continua de pe. Nunca vale derrubar a montagem
     * inteira por um brilho.
     *
     * O Centro e relativo a CAMADA (298x250), nao ao quadro -- por isso a
     * varredura vai de -120 a 420 em x. */
    var sw = ef(Lc, "CC Light Sweep");
    if (sw) {
        try {
            anima(sw.property(1), 1.45, [-120, 125], 2.15, [420, 125], 20);
            sw.property(4).setValue(52);    // largura
            sw.property(5).setValue(30);    // intensidade da varredura
        } catch (e) { /* sem varredura, com coroa */ }
    }
}

// — a marca, com acentos —
/* \u00C9 e \u00CA em vez de E e E acentuados no arquivo: um .jsx sem BOM e
 * lido como ASCII pelo ExtendScript, e o acento vira lixo. Escapado, o
 * texto sai certo em qualquer maquina. A versao em ffmpeg saiu sem acento
 * exatamente por nao ter resolvido isso. */
var tm = texto(cCart, "IMP\u00C9RIO PR\u00CAMIOS", 64, [1, 1, 1],
               ALT * 0.68, "Imperio Premios");
var opM = tm.property("ADBE Transform Group").property("ADBE Opacity");
anima(opM, 1.55, 0, 2.00, 100, 70);

// ══════════════════════════════════════════════════════════════════════════
//  00_PECA_FINAL — a master
// ══════════════════════════════════════════════════════════════════════════
var D_TOTAL = dHook + dRetro + D_CARTELA;
var cFim = app.project.items.addComp("00_PECA_FINAL", LARG, ALT, 1, D_TOTAL, FPS);
cFim.bgColor = [0, 0, 0];
cFim.motionBlur = true;

var Lcart = cFim.layers.add(cCart);
Lcart.startTime = dHook + dRetro;
Lcart.label = 14;

var Lretro = cFim.layers.add(cRetro);
Lretro.startTime = dHook;
Lretro.label = 11;

var Lhook = cFim.layers.add(cHook);
Lhook.startTime = 0;
Lhook.label = 9;

// — o flare, centrado no corte —
var Lflare = cFim.layers.add(cFlare);
Lflare.startTime = dHook - T_CORTE;
Lflare.blendingMode = BlendingMode.ADD;
Lflare.name = "FLARE da transicao";
Lflare.label = 1;
Lflare.moveToBeginning();

// — o SFX, com o pico no mesmo quadro —
if (fSfx) {
    var Ls = cFim.layers.add(fSfx);
    Ls.startTime = dHook - 1.0;      // o wav nasce com o pico em 1,0 s
    Ls.name = "SFX da transicao";
    Ls.label = 1;
}

/* — o pulo de desfoque no corte —
 * Meia duzia de quadros de desfoque em cima da emenda. E o que faz o corte
 * parecer decidido em vez de acidental: o olho perde o detalhe por 6
 * quadros e nao tem tempo de comparar os dois planos. */
var ajC = cFim.layers.addSolid([1, 1, 1], "pulo de desfoque", LARG, ALT, 1);
ajC.adjustmentLayer = true;
ajC.startTime = dHook - 0.20;
ajC.inPoint = dHook - 0.20;
ajC.outPoint = dHook + 0.25;
ajC.moveToBeginning();
var blC = ef(ajC, "ADBE Box Blur2");
var pB = blC.property("ADBE Box Blur2-0001");
anima(pB, dHook - 0.13, 0, dHook, 22, 85);
anima(pB, dHook, 22, dHook + 0.20, 0, 30);

// — fecho —
var fim = cFim.layers.addSolid([0, 0, 0], "fecho em preto", LARG, ALT, 1);
fim.moveToBeginning();
var opF = fim.property("ADBE Transform Group").property("ADBE Opacity");
opF.setValueAtTime(0, 0);
// o ultimo quadro de uma comp esta em (duracao - 1/fps), nao em `duracao`.
// Um keyframe exatamente na duracao nunca e alcancado, e o preto nunca
// chega a 100.
anima(opF, D_TOTAL - 0.6, 0, D_TOTAL - 1 / FPS, 100, 30);

// — as vozes, desligadas, a disposicao —
/* Entram mudas de proposito. O audio que vale hoje e o do seu hook; estas
 * sao as tomadas do ChatterBox para quando voce quiser trocar a fala sem
 * precisar voltar ao ComfyUI. */
for (var i = 0; i < fVozes.length; i++) {
    var Lv = cFim.layers.add(fVozes[i]);
    Lv.name = "[reserva] " + fVozes[i].name;
    Lv.audioEnabled = false;
    Lv.enabled = false;
    Lv.label = 5;
}

// — marcadores de navegacao —
cFim.markerProperty.setValueAtTime(0, new MarkerValue("HOOK"));
cFim.markerProperty.setValueAtTime(dHook, new MarkerValue("CORTE + flare + SFX"));
cFim.markerProperty.setValueAtTime(dHook + dRetro, new MarkerValue("CARTELA 2026"));

cFim.openInViewer();
app.endUndoGroup();

alert("Projeto montado.\n\n" +
      "00_PECA_FINAL   " + D_TOTAL.toFixed(2) + " s\n" +
      "  01_HOOK       " + dHook.toFixed(2) + " s  (" + CORTES.length + " cortes)\n" +
      "  FX_FLARE      corte em " + dHook.toFixed(2) + " s\n" +
      "  02_RETRO_2025 " + dRetro.toFixed(2) + " s  (" + MOMENTOS.length + " momentos)\n" +
      "  03_CARTELA    " + D_CARTELA.toFixed(2) + " s\n\n" +
      (faltando.length ? faltando.length + " arquivo(s) nao encontrado(s)."
                       : "Todos os arquivos foram encontrados.") +
      "\n\nNada foi salvo ainda -- salve onde voce quiser.");
