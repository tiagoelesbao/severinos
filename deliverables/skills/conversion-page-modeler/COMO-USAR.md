# Como usar — Modelador de Páginas de Alta Conversão

Esta skill ensina o Claude a **modelar páginas de alta conversão de big players e
adaptar para qualquer marca** — o entregável-promessa do criativo.

## 1. Subir a skill no Claude (1 vez)
1. No Claude, abra **Configurações → Habilidades** (Skills).
2. Clique em **+** (adicionar) → **Fazer upload de habilidade**.
3. Arraste o arquivo **`conversion-page-modeler.zip`** para a área de upload
   ("Arraste e solte ou clique para enviar").
4. Pronto. A skill aparece na lista de **Habilidades pessoais** e ativa
   automaticamente quando o assunto for modelar página de conversão.

> Requisitos atendidos: o zip contém um `SKILL.md` com nome + descrição em YAML
> (frontmatter), conforme exigido pela tela de upload.

## 2. Usar no chat (o fluxo que você grava)
Abra uma conversa nova e mande, por exemplo:

> "Quero modelar uma página de alta conversão para o meu produto, usando como
> referência [cole a URL/print de uma página de um big player do seu nicho]."

O Claude vai conduzir um diálogo guiado:
1. **Coleta** — referência, seu produto/oferta, público e marca.
2. **Brand Kit** — paleta, fontes e tom da sua marca.
3. **Scan da referência** — engenharia reversa da estrutura de conversão.
4. **Mapeamento** — seu produto, linguagem e objeções.
5. **Geração** — entrega o **mapa da página + copy completa + um HTML pronto**
   para abrir no navegador, na cara da sua marca.

No fim, peça variações de headline (A/B), ajustes de seção ou a versão de anúncio.

## 3. Roteiro de gravação (casado com o Plano-de-Criativo.md)
Grave a tela mostrando, na ordem do criativo:
- **Tomada 2 (brand kit):** o Claude definindo cores/fontes da marca.
- **Tomada 3 (scan):** o Claude dissecando a página de referência.
- **Tomada 4 (playbook):** o Claude aplicando a estrutura de conversão.
- **Tomada 5 (tour do resultado):** abra o HTML gerado no navegador e percorra
  home → seções → oferta → CTA.
Esses são exatamente os inserts/b-roll que o `Plano-de-Criativo.md` pede.

## Conteúdo do pacote
```
conversion-page-modeler/
├── SKILL.md                         # instruções da skill (frontmatter YAML + fluxo)
├── references/
│   ├── page-anatomy.md              # anatomia da página de alta conversão
│   ├── conversion-playbook.md       # princípios de conversão
│   ├── brand-kit.md                 # extração de brand kit → CSS
│   └── objection-handling.md        # mapeamento de objeções
├── assets/
│   └── landing-page-template.html   # template responsivo que a skill preenche
└── COMO-USAR.md                     # este guia
```

## Princípio
A skill **modela** (estrutura, gatilhos, padrões) — nunca copia texto literal nem
inventa prova. O que faltar de evidência real vem marcado como `[A PREENCHER]`.
Página honesta converte mais e protege a marca.
