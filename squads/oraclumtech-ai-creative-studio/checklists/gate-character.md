# Gate de Estágio — Character (`gate-character`)

> **Estágio:** `character` · **Dono:** `@character-lead` · **Executor:** `agent` (direção) + `human` (geração das reference sheets)
> **Roda:** ao fim do design de personagem, antes de liberar `stills`.
> **Artefato validado:** `{job}/09-character/character-bible.yaml` + `{job}/09-character/reference-sheets/`
> **Libera:** estágio `stills`
> **Não se avalia aqui:** a consistência do personagem no vídeo montado — isso é do gate
> de pipeline. Aqui se valida se existe uma **âncora reproduzível** de identidade.

| Marca | Efeito |
|:---|:---|
| `BLOQUEANTE` | Reprovou → o estágio não fecha |
| `ATENÇÃO` | Reprovou → fecha com ressalva registrada em `job.json` |

---

## Itens

- [ ] **CH-01** · `BLOQUEANTE` — Existe ficha para cada personagem que aparece em destaque.
  **Teste:** conferir contra `templates/character-bible-tmpl.yaml`; todo personagem com fala ou plano próprio tem ficha.
  **Falha se:** há personagem sem ficha.

- [ ] **CH-02** · `BLOQUEANTE` — A âncora de consistência está declarada **com valor**.
  **Teste:** a ficha registra o mecanismo (reference sheet, seed travada, imagem-âncora) **e** o valor concreto (arquivo, seed, checkpoint).
  **Falha se:** o mecanismo está citado sem o valor — o próximo episódio ou o próximo lote não reproduz o personagem.

- [ ] **CH-03** · `BLOQUEANTE` — Existe reference sheet aprovada em disco.
  **Teste:** há imagens em `reference-sheets/` cobrindo, no mínimo, frontal e 3/4; para vídeo, também perfil.
  **Falha se:** não há folha de referência, ou ela tem um único ângulo.

- [ ] **CH-04** · `BLOQUEANTE` — Traços descritos em termos verificáveis.
  **Teste:** formato de rosto, cor e corte de cabelo, tom de pele, faixa etária, biotipo, marcas distintivas.
  **Falha se:** a descrição é impressionista ("pessoa simpática de uns 30 anos").

- [ ] **CH-05** · `BLOQUEANTE` — Wardrobe base declarado e vinculado ao art-spec.
  **Teste:** a ficha aponta a roupa padrão e as variações permitidas por cena.
  **Falha se:** ausente, ou contradiz o `art-spec.yaml`.

- [ ] **CH-06** · `BLOQUEANTE` — Voz do personagem declarada quando ele fala.
  **Teste:** voz/preset, idioma, ritmo, entonação de referência.
  **Falha se:** ausente — a voz muda entre episódios/lotes.

- [ ] **CH-07** · `BLOQUEANTE NON-WAIVABLE` — Declaração de não-semelhança com pessoa real.
  **Teste:** a ficha registra que o personagem não guarda semelhança com pessoa real identificável; quando inspirado em arquétipo real, registra o afastamento deliberado (nome fictício, bordão original, semelhança física afastada).
  **Falha se:** ausente, ou a folha de referência produz alguém reconhecível.
  **Por quê:** é o gatilho D-IMG do `@fact-checker`, e não aceita waiver.

- [ ] **CH-08** · `BLOQUEANTE` — Para creator sintético de UGC: identidade coerente com o avatar do brief.
  **Teste:** idade, contexto socioeconômico e ambiente batem com o avatar declarado.
  **Falha se:** o creator contradiz o público que a peça quer atingir.

- [ ] **CH-09** · `ATENÇÃO` — Traços de comportamento declarados.
  **Teste:** bordão, tique, postura, jeito de falar.
  **Falha se:** ausente em personagem de série — é o que o público reconhece antes do rosto.

- [ ] **CH-10** · `ATENÇÃO` — A ficha reusa a âncora de episódios/lotes anteriores.
  **Teste:** comparar com as fichas anteriores do mesmo personagem.
  **Falha se:** criou âncora nova sem registrar o motivo.

- [ ] **CH-11** · `ATENÇÃO` — Armadilhas do modelo registradas para este personagem.
  **Teste:** a ficha traz o que costuma derivar (idade aparente, formato de olhos, cor de cabelo sob certas luzes).
  **Falha se:** ausente — cada operador redescobre o problema sozinho.

---

## Registro

| Campo | Valor |
|:---|:---|
| Personagens com ficha (qtd) | |
| Âncora declarada (mecanismo + valor) | |
| Reference sheets (ângulos) | |
| Declaração de não-semelhança | sim · não |
| Itens reprovados (IDs) | |

## Veredito

- **APROVADO** — nenhum `BLOQUEANTE` reprovado → libera `stills`.
- **REPROVADO** — devolve ao `@character-lead`.
