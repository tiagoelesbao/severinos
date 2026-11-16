# Como instalar a skill Proposta Comercial

> **Jeito mais fácil:** abra o Claude, o Codex ou o ChatGPT, arraste ESTE arquivo para dentro da conversa e escreva:
> **"Me ajuda a instalar isso, um passo de cada vez."**
> A IA vai ler este arquivo e te guiar até o fim.

---

## Para a IA que está lendo este arquivo

Você vai ajudar uma pessoa que nunca instalou nada numa IA. Trate a instalação como se estivesse ao lado dela, apontando a tela.

1. **Comece perguntando:** "Você vai usar no Claude, no Codex ou no ChatGPT? E está no computador ou no celular?" Só depois escolha o caminho.
2. **Um passo por mensagem.** Espere a pessoa responder "pronto" ou "feito" antes de mandar o próximo. Lista de 7 passos de uma vez faz a pessoa se perder no terceiro.
3. **Seja exato e simples:** diga o nome do botão e onde ele fica na tela (canto de cima, canto de baixo, lado esquerdo). Evite termos técnicos. Se precisar usar um, explique em meia frase.
4. **Os menus dos aplicativos mudam de tempos em tempos.** Se a pessoa não achar um botão, peça para ela descrever o que está vendo ou mandar um print, e adapte. Não insista num caminho que não existe na tela dela.
5. **Se um caminho não funcionar** (o plano não permite, a opção não aparece), passe para o próximo caminho da lista com tranquilidade. O "Caminho de emergência" funciona sempre, em qualquer plano.
6. **No celular,** prefira o caminho de Projeto ou o de emergência. Instalar skill no Claude é mais fácil pelo computador.
7. **No final, teste junto:** peça para a pessoa abrir uma conversa nova (dentro do projeto, se for o caso) e colar o conteúdo do arquivo `exemplo-para-testar.txt`, que está nesta mesma pasta. Quando a resposta chegar, mostre que funcionou e comemore.

---

## Qual caminho é o seu?

- **Usa o Claude no site ou no aplicativo?** Vá para "No Claude".
- **Usa o ChatGPT?** Vá para "No ChatGPT".
- **Usa o Codex?** Vá para "No Codex".
- **Usa o Claude Code?** Vá para "No Claude Code".
- **Nada funcionou ou não sabe qual usa?** Vá para o "Caminho de emergência", no final: funciona em qualquer IA.

---

## No Claude (site ou aplicativo)

### Caminho 1 — Instalar como skill (o melhor, no computador)

Funciona assim: depois de instalada, é só pedir "monta uma proposta" em qualquer conversa e o Claude usa a skill sozinho.

1. Abra **claude.ai** no navegador (ou o aplicativo do Claude no computador) e entre na sua conta.
2. Clique no seu nome ou na sua foto, no **canto de baixo, do lado esquerdo**.
3. Clique em **Configurações** (pode aparecer como *Settings*).
4. Clique em **Capacidades** (pode aparecer como *Capabilities*).
5. Confira se a opção **Execução de código e criação de arquivos** está ligada. Se não estiver, ligue.
6. Procure a parte **Skills** e clique em **Enviar skill** (pode aparecer como *Upload skill*).
7. Escolha o arquivo **`proposta-comercial.zip`**, que está dentro da pasta `para-o-claude`.
8. Confira se a skill apareceu na lista e está **ligada**.

**Atenção com o zip:** o arquivo `.zip` deve ser enviado do jeito que está, sem abrir. Se o seu computador abriu sozinho e virou uma pasta, clique com o botão direito na pasta `para-o-claude/proposta-comercial` e escolha **Comprimir** (no Mac) ou **Enviar para > Pasta compactada** (no Windows). Isso cria o zip de novo.

**Não apareceu a parte Skills?** Pode ser o seu plano ou a sua versão do aplicativo. Sem problema: vá para o Caminho 2.

### Caminho 2 — Criar um Projeto no Claude

1. No menu do lado esquerdo, clique em **Projetos** e depois em **Criar projeto** (ou *New project*).
2. Dê o nome **Proposta Comercial** e confirme.
3. Dentro do projeto, procure **Instruções do projeto** (pode aparecer como *Set project instructions*) e clique.
4. Abra o arquivo **`instrucoes-para-colar.txt`** desta pasta, selecione tudo, copie e cole ali.
5. Clique em **Salvar**.

Para usar: abra uma conversa **dentro desse projeto**. Conversas fora do projeto não usam as instruções.

---

## No ChatGPT (site ou aplicativo)

### Caminho 1 — Criar um Projeto (o melhor)

1. Abra **chatgpt.com** (ou o aplicativo) e entre na sua conta.
2. No menu do lado esquerdo, clique em **Novo projeto** (fica na parte *Projetos*).
3. Dê o nome **Proposta Comercial** e clique em **Criar projeto**.
4. Dentro do projeto, clique nos **três pontinhos** ou na **engrenagem**, no canto de cima, e escolha **Instruções** (pode aparecer como *Instructions*).
5. Abra o arquivo **`instrucoes-para-colar.txt`** desta pasta, selecione tudo, copie e cole ali.
6. Clique em **Salvar**.

Para usar: abra uma conversa **dentro desse projeto**.

### Caminho 2 — Criar um GPT só seu (precisa de plano pago)

1. No menu do lado esquerdo, clique em **GPTs** e depois em **Criar** (*Create*).
2. Clique na aba **Configurar** (*Configure*).
3. Em **Nome**, escreva **Proposta Comercial**.
4. Em **Instruções**, cole todo o texto do arquivo **`instrucoes-para-colar.txt`**.
5. Clique em **Criar** e escolha **Somente eu**.

---

## No Codex (aplicativo, terminal ou extensão do editor)

O Codex consegue instalar sozinho: ele tem acesso aos arquivos do computador. A pessoa só precisa abrir o Codex **nesta pasta** e pedir.

### Caminho 1 — Instalar como skill (o melhor)

1. Abra o Codex (o aplicativo, o terminal ou a extensão do editor) e escolha **esta pasta** como pasta de trabalho.
2. Escreva: **"Lê o COMO-INSTALAR.md e instala a skill pra mim."**
3. Quando o Codex pedir permissão para copiar os arquivos, aceite.
4. Feche e abra o Codex de novo.

*Para a IA (Codex):* copie a pasta `para-o-codex/proposta-comercial/` inteira (com `SKILL.md` e `agents/openai.yaml`) para `~/.codex/skills/proposta-comercial/`. Crie a pasta `~/.codex/skills/` se ela não existir. Se já existir uma skill com esse nome, pergunte antes de substituir. No final, peça para a pessoa reiniciar o Codex e testar com o `exemplo-para-testar.txt`.

### Caminho 2 — Usar o AGENTS.md (se a skill não aparecer)

O `AGENTS.md` é um arquivo de instruções que o Codex lê sozinho sempre que abre uma pasta.

1. Crie uma pasta para trabalhar com seus clientes, por exemplo **Propostas**.
2. Copie o arquivo **`para-o-codex/AGENTS.md`** para dentro dela.
3. Abra o Codex nessa pasta. Pronto: ele já segue as instruções.

*Para a IA (Codex):* se a pessoa quiser que valha em qualquer pasta, ADICIONE o conteúdo de `para-o-codex/AGENTS.md` ao final de `~/.codex/AGENTS.md`. Nunca apague nem substitua o que já existe nesse arquivo: ele pode ter instruções da pessoa ou de outras skills.

---

## No Claude Code (terminal ou extensão do editor)

1. Abra o Claude Code **nesta pasta**.
2. Escreva: **"Lê o COMO-INSTALAR.md e instala a skill pra mim."**
3. Aceite quando ele pedir permissão e abra uma sessão nova depois.

*Para a IA (Claude Code):* copie a pasta `para-o-claude/proposta-comercial/` para `~/.claude/skills/proposta-comercial/`. Se já existir uma skill com esse nome, pergunte antes de substituir.

---

## Caminho de emergência (funciona sempre, em qualquer IA)

1. Abra uma conversa nova.
2. Abra o arquivo **`instrucoes-para-colar.txt`**, copie tudo e cole na conversa. Envie.
3. Depois mande as informações do seu cliente.

O único chato desse caminho: precisa colar o texto toda vez que abrir uma conversa nova.
