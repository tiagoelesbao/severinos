// build-comps.jsx — Automação de montagem das 4 comps da transição "Ignição do Punho"
// (Império Prêmios). Implementa ae-spec.md deste mesmo diretório.
//
// COMO RODAR:
//   1. After Effects > Preferences > Scripting & Expressions > marcar
//      "Allow Scripts to Write Files and Access Network" (precisa reiniciar o AE se mudar agora).
//   2. File > Scripts > Run Script File... > selecionar este arquivo.
//   3. O script cria um projeto novo (ou usa o aberto, se já tiver as pastas) com as 4 comps
//      prontas, camadas nomeadas e keyframes aplicados conforme ae-spec.md.
//
// O QUE ESTE SCRIPT NÃO FAZ (precisa de passo manual depois):
//   - NÃO importa o Take 1 nem o still congelado — você precisa ter rodado o conform do
//     passo 0 do ae-spec.md ANTES (ffmpeg → take1_conformado.mov + take1_still_punho.png) e
//     importar esses 2 arquivos manualmente (ou ajuste SOURCE_FOLDER abaixo e rode de novo).
//   - A coroa é uma reconstrução GEOMÉTRICA aproximada (esfera + estrela + swoosh), não uma
//     cópia pixel-perfect do logo.png original — refine a forma manualmente se precisar de
//     fidelidade exata à marca.
//   - Trapcode Particular: o script tenta adicionar o efeito via matchName. Se a versão do
//     Particular instalada usar um matchName diferente, o script cai automaticamente pro
//     CC Particle World (nativo do AE) e avisa no Info panel — confira o alert no final.
//   - Revelação "letra por letra" e "palavra por palavra" foram implementadas como CAMADAS
//     DE TEXTO SEPARADAS (uma por palavra/letra) em vez de Text Animators nativos — mais
//     robusto de automatizar via script e visualmente idêntico ao pedido da spec.

app.beginUndoGroup("Build Comps — Ignição do Punho");

// ----------------------------------------------------------------- constantes de marca
var COLOR = {
  gold: hexToRgb("#e3a73e"),
  goldLight: hexToRgb("#f4c869"),
  bg: hexToRgb("#0a0a0f"),
  text: hexToRgb("#f5f5f7"),
  ocre: hexToRgb("#c7823c"),
  greenA: hexToRgb("#3ddc6f"),
  greenB: hexToRgb("#2bb85a"),
  ctaText: hexToRgb("#06230f"),
  white: [1, 1, 1],
};

var W = 1080, H = 1920, FPS = 30;

function hexToRgb(hex) {
  hex = hex.replace("#", "");
  var r = parseInt(hex.substring(0, 2), 16) / 255;
  var g = parseInt(hex.substring(2, 4), 16) / 255;
  var b = parseInt(hex.substring(4, 6), 16) / 255;
  return [r, g, b];
}

function framesToSeconds(f) { return f / FPS; }

// Easing helper — aplica ease-in/ease-out em uma property com 2+ keyframes já setados.
// speed=0 e influence alto (~33-75) reproduz bem os "ease-in-out"/"ease-out" pedidos na spec.
function easeKey(prop, keyIndex, influenceIn, influenceOut) {
  var easeIn = new KeyframeEase(0, influenceIn || 33);
  var easeOut = new KeyframeEase(0, influenceOut || 33);
  var dims = prop.value instanceof Array ? prop.value.length : 1;
  var easeInArr = [], easeOutArr = [];
  for (var i = 0; i < dims; i++) { easeInArr.push(easeIn); easeOutArr.push(easeOut); }
  try {
    prop.setTemporalEaseAtKey(keyIndex, easeInArr, easeOutArr);
  } catch (e) { /* alguma propriedade não aceita ease temporal (ex: cor) — ignora */ }
}

function newComp(name, durFrames) {
  return app.project.items.addComp(name, W, H, 1, framesToSeconds(durFrames), FPS);
}

function addSolidLayer(comp, name, rgb, opacityStart) {
  var solid = comp.layers.addSolid(rgb, name, W, H, 1, comp.duration);
  if (opacityStart !== undefined) solid.property("Transform").property("Opacity").setValue(opacityStart);
  return solid;
}

function textLayer(comp, name, content, sizePx, colorRgb, fontName) {
  var t = comp.layers.addText(content);
  t.name = name;
  var textProp = t.property("Source Text");
  var textDocument = textProp.value;
  textDocument.fontSize = sizePx;
  textDocument.fillColor = colorRgb;
  textDocument.font = fontName || "Montserrat-ExtraBold";
  textDocument.justification = ParagraphJustification.CENTER_JUSTIFY;
  textProp.setValue(textDocument);
  t.property("Transform").property("Position").setValue([W / 2, H / 2]);
  return t;
}

// =====================================================================================
// COMP 01 — AE_01_ignicao-punho (14 frames @ 30fps, ~0.47s, COM ALFA)
// =====================================================================================
function buildComp01() {
  var comp = newComp("AE_01_ignicao-punho", 14);

  // Fundo: placeholder preto (troque pela camada do still congelado — ver nota do topo).
  var bgPlaceholder = addSolidLayer(comp, "[SUBSTITUIR] take1_still_punho.png", [0, 0, 0]);
  bgPlaceholder.guideLayer = false;
  bgPlaceholder.comment = "Troque este solid pela still congelada do punho (passo 0.5 do ae-spec.md)";

  // Flare — Shape Layer: círculo com glow nativo (Glow effect).
  var flare = comp.layers.addShape();
  flare.name = "Flare (punho)";
  var flareGroup = flare.property("Contents").addProperty("ADBE Vector Group");
  var ellipse = flareGroup.property("Contents").addProperty("ADBE Vector Shape - Ellipse");
  ellipse.property("Size").setValue([220, 220]);
  var fill = flareGroup.property("Contents").addProperty("ADBE Vector Graphic - Fill");
  fill.property("Color").setValue(COLOR.white);
  var strokeFx = flareGroup.property("Contents").addProperty("ADBE Vector Graphic - Stroke");
  strokeFx.property("Color").setValue(COLOR.goldLight);
  strokeFx.property("Stroke Width").setValue(14);
  // posição aproximada: terço superior, esquerda-centro — ajuste fino olhando a still real
  flare.property("Transform").property("Position").setValue([W * 0.38, H * 0.30]);
  flare.property("Transform").property("Scale").setValue([0, 0]);
  flare.property("Transform").property("Opacity").setValue(0);
  flare.property("Effects").addProperty("ADBE Glo2"); // Glow nativo

  var scaleProp = flare.property("Transform").property("Scale");
  scaleProp.setValueAtTime(framesToSeconds(1), [0, 0]);
  scaleProp.setValueAtTime(framesToSeconds(8), [140, 140]);
  easeKey(scaleProp, 1, 0, 60); // ease-in quadrático (acelera no fim)

  var flareOpacity = flare.property("Transform").property("Opacity");
  flareOpacity.setValueAtTime(framesToSeconds(1), 0);
  flareOpacity.setValueAtTime(framesToSeconds(8), 100);

  // Flash branco (solid, com alfa animado por cima de tudo)
  var flash = addSolidLayer(comp, "Flash branco", COLOR.white, 0);
  flash.moveToBeginning(); // topo da stack
  var flashOp = flash.property("Transform").property("Opacity");
  flashOp.setValueAtTime(framesToSeconds(8), 0);
  flashOp.setValueAtTime(framesToSeconds(11), 100);
  easeKey(flashOp, 1, 10, 0); // ease-in exponencial aproximado (influence baixa na entrada, estoura rápido)
  flashOp.setValueAtTime(framesToSeconds(12), 100); // hold até o frame 12
  flashOp.setValueAtTime(framesToSeconds(14), 100); // segue 100% até o corte pra Comp 02

  // Alfa: ativar canal alfa na comp (feito no render queue / output module, não aqui).
  comp.comment = "EXPORT: com alfa (ProRes 4444 ou sequência PNG). Ver ae-spec.md secao Comp 01.";
  return comp;
}

// =====================================================================================
// COMP 02 — AE_02_poeira-vira-po-de-ouro (22 frames @ 30fps, ~0.73s, SEM ALFA)
// =====================================================================================
function buildComp02() {
  var comp = newComp("AE_02_poeira-vira-po-de-ouro", 22);

  // Fundo preto por baixo (crossfade entra nos frames 14-22)
  var bgBlack = addSolidLayer(comp, "BG preto", COLOR.bg, 0);
  var bgBlackOp = bgBlack.property("Transform").property("Opacity");
  bgBlackOp.setValueAtTime(framesToSeconds(14), 0);
  bgBlackOp.setValueAtTime(framesToSeconds(22), 100);
  easeKey(bgBlackOp, 1, 33, 33);

  // Fundo branco por cima dele no início (herdado do flash da Comp 01), crossfade pro preto
  var bgWhite = addSolidLayer(comp, "BG branco (herdado)", COLOR.white, 100);
  var bgWhiteOp = bgWhite.property("Transform").property("Opacity");
  bgWhiteOp.setValueAtTime(framesToSeconds(14), 100);
  bgWhiteOp.setValueAtTime(framesToSeconds(22), 0);
  easeKey(bgWhiteOp, 1, 33, 33);

  // Partículas — tenta Trapcode Particular, cai pra CC Particle World se não existir
  var particleLayer = addSolidLayer(comp, "Partículas (base p/ efeito)", [0, 0, 0], 100);
  var usedParticular = false;
  try {
    var particular = particleLayer.property("Effects").addProperty("Trapcode Particular");
    usedParticular = true;
    // Propriedades básicas — nomes de grupo do Particular variam por versão; os paths mais
    // comuns são "Emitter" > "Particles/sec", "Position XY", e "Particle" > "Color".
    // Deixado com try/catch individual pra não quebrar o script inteiro se algum path mudar.
    try { particular.property("Emitter").property("Particles/sec").setValue(2000); } catch (e1) {}
    try { particular.property("Emitter").property("Position XY").setValue([W * 0.38, H * 0.30]); } catch (e2) {}
    try { particular.property("Particle").property("Color").setValue(COLOR.ocre); } catch (e3) {}
    try { particular.property("Particle").property("Size").setValue(3); } catch (e4) {}
  } catch (eOuter) {
    usedParticular = false;
    var ccWorld = particleLayer.property("Effects").addProperty("CC Particle World");
    try { ccWorld.property("Producer").property("Position X").setValue(0); } catch (e5) {}
    try { ccWorld.property("Producer").property("Position Y").setValue(0.3); } catch (e6) {}
    try { ccWorld.property("Physics").property("Velocity").setValue(0.6); } catch (e7) {}
    try { ccWorld.property("Particle").property("Birth Color").setValue(COLOR.ocre); } catch (e8) {}
    try { ccWorld.property("Particle").property("Death Color").setValue(COLOR.goldLight); } catch (e9) {}
  }

  // Tint animado ocre → gold → gold-light por cima da camada de partículas (reforça a
  // mudança de matiz independente de qual efeito de partícula foi usado acima).
  // Acesso por ÍNDICE (1=Map Black To, 2=Map White To), não por nome em inglês — nome de
  // parâmetro de efeito é dependente de idioma da UI (AE em PT-BR quebra lookup por string).
  try {
    var tint = particleLayer.property("Effects").addProperty("ADBE Tint");
    var tintBlack = tint.property(1);
    var tintWhite = tint.property(2);
    if (tintBlack && tintWhite) {
      tintBlack.setValue(COLOR.bg);
      tintWhite.setValueAtTime(framesToSeconds(1), COLOR.ocre);
      tintWhite.setValueAtTime(framesToSeconds(10), COLOR.gold);
      tintWhite.setValueAtTime(framesToSeconds(20), COLOR.goldLight);
      easeKey(tintWhite, 1, 33, 33);
      easeKey(tintWhite, 2, 33, 33);
    }
  } catch (eTint) {
    // Tint é reforço, não essencial — segue sem travar o resto da comp.
  }

  comp.comment = usedParticular
    ? "Partículas montadas com Trapcode Particular — confira os parâmetros, nomes de grupo variam por versão."
    : "AVISO: Trapcode Particular não encontrado pelo matchName esperado — caiu para CC Particle World nativo. Ajuste manualmente se quiser trocar.";
  return comp;
}

// =====================================================================================
// COMP 03 — AE_03_brasao-reveal (40 frames @ 30fps, ~1.33s, SEM ALFA)
// =====================================================================================
function buildComp03() {
  var comp = newComp("AE_03_brasao-reveal", 40);

  var bg = addSolidLayer(comp, "BG + glow", COLOR.bg, 100);
  var glow = bg.property("Effects").addProperty("ADBE Glo2");
  // Glow radial aproximando o radial-gradient do site — ajuste manualmente o Glow Radius/
  // Intensity olhando o resultado, valores abaixo são ponto de partida razoável.
  try { glow.property("Glow Radius").setValue(400); } catch (e1) {}
  try { glow.property("Glow Intensity").setValue(1.2); } catch (e2) {}

  // Coroa — reconstrução GEOMÉTRICA aproximada (não é cópia exata do logo.png original):
  // esfera no topo + estrela de 5 pontas + base com 2 swooshes simples.
  var crownGroup = comp.layers.addShape();
  crownGroup.name = "Coroa (vetor aproximado — REFINAR)";
  var contents = crownGroup.property("Contents");

  // Esfera no topo
  var sphereGrp = contents.addProperty("ADBE Vector Group");
  sphereGrp.name = "Esfera topo";
  var sphereShape = sphereGrp.property("Contents").addProperty("ADBE Vector Shape - Ellipse");
  sphereShape.property("Size").setValue([60, 60]);
  sphereShape.property("Position").setValue([0, -220]);
  var sphereFill = sphereGrp.property("Contents").addProperty("ADBE Vector Graphic - Fill");
  sphereFill.property("Color").setValue(COLOR.goldLight);

  // Estrela de 5 pontas (faixa central)
  var starGrp = contents.addProperty("ADBE Vector Group");
  starGrp.name = "Estrela faixa";
  var starShape = starGrp.property("Contents").addProperty("ADBE Vector Shape - Star");
  try { starShape.property("Points").setValue(5); } catch (e3) {}
  try { starShape.property("Outer Radius").setValue(90); } catch (e4) {}
  try { starShape.property("Inner Radius").setValue(36); } catch (e5) {}
  starShape.property("Position").setValue([0, -40]);
  var starFill = starGrp.property("Contents").addProperty("ADBE Vector Graphic - Fill");
  starFill.property("Color").setValue(COLOR.white);

  // Base com swoosh duplo — aproximado por 2 elipses achatadas sobrepostas
  for (var s = 0; s < 2; s++) {
    var swooshGrp = contents.addProperty("ADBE Vector Group");
    swooshGrp.name = "Swoosh base " + (s + 1);
    var swooshShape = swooshGrp.property("Contents").addProperty("ADBE Vector Shape - Ellipse");
    swooshShape.property("Size").setValue([360 - s * 40, 50 - s * 10]);
    swooshShape.property("Position").setValue([0, 120 + s * 30]);
    var swooshFill = swooshGrp.property("Contents").addProperty("ADBE Vector Graphic - Fill");
    swooshFill.property("Color").setValue(s === 0 ? COLOR.gold : COLOR.goldLight);
  }

  crownGroup.property("Transform").property("Position").setValue([W / 2, H * 0.30]);
  crownGroup.property("Transform").property("Scale").setValue([0, 0]);
  crownGroup.property("Transform").property("Opacity").setValue(0);

  var crownScale = crownGroup.property("Transform").property("Scale");
  crownScale.setValueAtTime(framesToSeconds(10), [0, 0]);
  crownScale.setValueAtTime(framesToSeconds(17), [108, 108]);
  crownScale.setValueAtTime(framesToSeconds(22), [100, 100]);
  easeKey(crownScale, 1, 33, 33);
  easeKey(crownScale, 2, 33, 33);

  var crownOp = crownGroup.property("Transform").property("Opacity");
  crownOp.setValueAtTime(framesToSeconds(10), 0);
  crownOp.setValueAtTime(framesToSeconds(16), 100);

  // Wordmark "IMPÉRIO" — 1 camada de texto POR LETRA (7 letras), stagger de 2 frames,
  // mais robusto de script do que Text Animators nativos.
  var word = "IMPÉRIO";
  var letterSpacing = 70; // px entre centros de letra, ajustar conforme fonte real
  var startX = W / 2 - (letterSpacing * (word.length - 1)) / 2;
  for (var i = 0; i < word.length; i++) {
    var letter = textLayer(comp, "Letra " + (i + 1) + " (" + word.charAt(i) + ")",
      word.charAt(i), 90, COLOR.goldLight, "Montserrat-Black");
    var baseY = H * 0.42;
    letter.property("Transform").property("Position").setValue([startX + i * letterSpacing, baseY]);
    var startFrame = 20 + i * 2;
    var endFrame = startFrame + 8;
    var posProp = letter.property("Transform").property("Position");
    posProp.setValueAtTime(framesToSeconds(startFrame), [startX + i * letterSpacing, baseY + 40]);
    posProp.setValueAtTime(framesToSeconds(endFrame), [startX + i * letterSpacing, baseY]);
    easeKey(posProp, 1, 10, 33);
    var opProp = letter.property("Transform").property("Opacity");
    opProp.setValueAtTime(framesToSeconds(startFrame), 0);
    opProp.setValueAtTime(framesToSeconds(endFrame), 100);
  }

  comp.comment = "Coroa é reconstrução geométrica aproximada — refinar forma manualmente se precisar de fidelidade exata ao logo.png.";
  return comp;
}

// =====================================================================================
// COMP 04 — AE_04_cta-kinetic (75 frames @ 30fps, ~2.5s, SEM ALFA)
// =====================================================================================
function buildComp04() {
  var comp = newComp("AE_04_cta-kinetic", 75);

  var bg = addSolidLayer(comp, "BG + glow (continuação Comp 03)", COLOR.bg, 100);
  var glow = bg.property("Effects").addProperty("ADBE Glo2");
  try { glow.property("Glow Radius").setValue(400); } catch (e1) {}
  try { glow.property("Glow Intensity").setValue(1.2); } catch (e2) {}

  // Brasão (coroa + wordmark) reposicionado pro topo — versão simplificada reaproveitando
  // a lógica da Comp 03 (esfera + estrela), já na posição/escala final de crest fixo.
  var crownGroup = comp.layers.addShape();
  crownGroup.name = "Coroa (posição final, topo)";
  var contents = crownGroup.property("Contents");
  var sphereGrp = contents.addProperty("ADBE Vector Group");
  var sphereShape = sphereGrp.property("Contents").addProperty("ADBE Vector Shape - Ellipse");
  sphereShape.property("Size").setValue([60, 60]);
  sphereShape.property("Position").setValue([0, -220]);
  sphereGrp.property("Contents").addProperty("ADBE Vector Graphic - Fill").property("Color").setValue(COLOR.goldLight);
  var starGrp = contents.addProperty("ADBE Vector Group");
  var starShape = starGrp.property("Contents").addProperty("ADBE Vector Shape - Star");
  try { starShape.property("Points").setValue(5); } catch (e3) {}
  try { starShape.property("Outer Radius").setValue(90); } catch (e4) {}
  try { starShape.property("Inner Radius").setValue(36); } catch (e5) {}
  starShape.property("Position").setValue([0, -40]);
  starGrp.property("Contents").addProperty("ADBE Vector Graphic - Fill").property("Color").setValue(COLOR.white);

  crownGroup.property("Transform").property("Position").setValue([W / 2, H / 2]);
  crownGroup.property("Transform").property("Scale").setValue([100, 100]);
  var crownPos = crownGroup.property("Transform").property("Position");
  var crownScale = crownGroup.property("Transform").property("Scale");
  crownPos.setValueAtTime(framesToSeconds(1), [W / 2, H / 2]);
  crownPos.setValueAtTime(framesToSeconds(10), [W / 2, H * 0.14]);
  crownScale.setValueAtTime(framesToSeconds(1), [100, 100]);
  crownScale.setValueAtTime(framesToSeconds(10), [55, 55]);
  easeKey(crownPos, 1, 33, 33);
  easeKey(crownScale, 1, 33, 33);

  // Headline "ESSA PODE SER A SUA VITÓRIA." — 1 camada POR PALAVRA (palavra de destaque
  // "VITÓRIA" em gold-light, resto em --text).
  var words = ["ESSA", "PODE", "SER", "A", "SUA", "VITÓRIA."];
  var totalWords = words.length;
  var staggerFrames = 2.4; // (20-8)/5 intervalos ~ pras 5 entradas caberem em 8-20
  var headlineY = H * 0.38;
  for (var w = 0; w < totalWords; w++) {
    var isHighlight = words[w].indexOf("VITÓRIA") === 0;
    var wLayer = textLayer(comp, "Headline palavra " + (w + 1) + " (" + words[w] + ")",
      words[w], 72, isHighlight ? COLOR.goldLight : COLOR.text, "Montserrat-ExtraBold");
    var wY = headlineY + w * 90; // empilhado verticalmente — ajustar pra layout em linha(s) conforme caber no quadro
    var startF = 8 + w * staggerFrames;
    var endF = startF + 6;
    wLayer.property("Transform").property("Position").setValue([W / 2, wY]);
    var wScale = wLayer.property("Transform").property("Scale");
    wScale.setValueAtTime(framesToSeconds(startF), [85, 85]);
    wScale.setValueAtTime(framesToSeconds(endF), [100, 100]);
    easeKey(wScale, 1, 33, 33);
    var wOp = wLayer.property("Transform").property("Opacity");
    wOp.setValueAtTime(framesToSeconds(startF), 0);
    wOp.setValueAtTime(framesToSeconds(endF), 100);
  }

  // CTA pill — shape (rounded rect) + texto por cima
  var ctaShape = comp.layers.addShape();
  ctaShape.name = "CTA pill (fundo)";
  var ctaContents = ctaShape.property("Contents");
  var ctaGrp = ctaContents.addProperty("ADBE Vector Group");
  var ctaRect = ctaGrp.property("Contents").addProperty("ADBE Vector Shape - Rect");
  ctaRect.property("Size").setValue([700, 110]);
  ctaRect.property("Roundness").setValue(55);
  var ctaFill = ctaGrp.property("Contents").addProperty("ADBE Vector Graphic - Fill");
  ctaFill.property("Color").setValue(COLOR.greenA); // gradiente real precisa de Gradient Fill — simplificado pra cor sólida aqui
  ctaShape.property("Transform").property("Position").setValue([W / 2, H * 0.70]);
  ctaShape.property("Transform").property("Scale").setValue([0, 0]);
  var ctaScale = ctaShape.property("Transform").property("Scale");
  ctaScale.setValueAtTime(framesToSeconds(30), [0, 0]);
  ctaScale.setValueAtTime(framesToSeconds(36), [108, 108]);
  ctaScale.setValueAtTime(framesToSeconds(40), [100, 100]);
  easeKey(ctaScale, 1, 33, 20);
  easeKey(ctaScale, 2, 20, 33);
  // Pulso contínuo — keyframes adicionais a cada 20 frames até o fim do hold (75)
  var pulseFrame = 45;
  var pulseToggle = true;
  while (pulseFrame < 75) {
    ctaScale.setValueAtTime(framesToSeconds(pulseFrame), pulseToggle ? [104, 104] : [100, 100]);
    pulseToggle = !pulseToggle;
    pulseFrame += 20;
  }

  var ctaText = textLayer(comp, "CTA texto", "VER O QUE ESTÁ DISPONÍVEL AGORA", 36, COLOR.ctaText, "Montserrat-Bold");
  ctaText.property("Transform").property("Position").setValue([W / 2, H * 0.70]);
  ctaText.property("Transform").property("Opacity").setValue(0);
  var ctaTextOp = ctaText.property("Transform").property("Opacity");
  ctaTextOp.setValueAtTime(framesToSeconds(36), 0);
  ctaTextOp.setValueAtTime(framesToSeconds(40), 100);

  comp.comment = "CTA pill usa cor sólida (greenA) — trocar por Gradient Fill greenA→greenB manualmente pra bater exato com o site.";
  return comp;
}

// ----------------------------------------------------------------------------- execução
// Cada comp isolada em try/catch — uma falhar não impede as outras 3 de serem criadas.
var erros = [];
function tentarBuild(nome, fn) {
  try { fn(); } catch (e) { erros.push(nome + ": " + e.toString() + " (linha " + (e.line || "?") + ")"); }
}
tentarBuild("Comp 01", buildComp01);
tentarBuild("Comp 02", buildComp02);
tentarBuild("Comp 03", buildComp03);
tentarBuild("Comp 04", buildComp04);

app.endUndoGroup();

if (erros.length) {
  alert("ATENÇÃO — " + erros.length + " comp(s) com erro parcial:\n\n" + erros.join("\n\n") +
    "\n\nAs comps que não deram erro foram criadas normalmente. Confira o painel Project.");
}

alert(
  "Execução concluída. Confira no painel Project quais das 4 comps foram criadas: AE_01_ignicao-punho, AE_02_poeira-vira-po-de-ouro, AE_03_brasao-reveal, AE_04_cta-kinetic.\n\n" +
  "PRÓXIMOS PASSOS MANUAIS:\n" +
  "1. Importe take1_conformado.mov e take1_still_punho.png, substitua o placeholder preto na Comp 01.\n" +
  "2. Confira se o Trapcode Particular foi aplicado na Comp 02 (ver comment da comp) — se caiu pro CC Particle World, ajuste ou troque manualmente.\n" +
  "3. A coroa é uma forma geométrica aproximada — refine pra bater com o logo.png real se precisar de fidelidade de marca.\n" +
  "4. Troque o fill sólido do CTA pill (Comp 04) por um Gradient Fill verde (greenA → greenB) — script usou cor sólida por simplicidade.\n" +
  "5. Confira o layout das palavras da headline (Comp 04) — estão empilhadas verticalmente por padrão, reorganize em 1-2 linhas conforme o enquadramento real pedir."
);
