import { Resource } from '../../types';

export const AI_CONTENT_RESOURCES: Resource[] = [
  {
    id: 'res-4',
    slug: 'ai-content-team-blueprint',
    title: 'O Blueprint da Equipe de Conteúdo com 6 Agentes IA',
    category: 'AI CONTENT',
    description: 'As seis funções que rodam meu pipeline de conteúdo, o que cada uma faz, a ordem de transição e os prompts para você construir a sua própria equipe.',
    subtitle: 'Uma equipe de conteúdo como a minha custa uns R$ 150 mil por mês para contratar. A minha custa o preço de uma assinatura, porque os seis são o Claude.',
    estimatedReadTime: '15 min de leitura',
    difficulty: 'Intermediate',
    updatedDate: 'Julho de 2026',
    isFeatured: true,
    tags: ['Estratégia de Conteúdo', 'Multi-Agente', 'YouTube', 'LinkedIn', 'Instagram'],
    promptText: `Marcus  →  Vance  →  Riley  →  Owen  →  Hayes
(dados)  (estratégia) (ideias) (roteiro) (publicação)
                    ↑
                  Sasha
             (roda o pipeline)

Cada um só recebe o que o anterior produziu. É esse o truque:
a Riley não adivinha o que brainstormar, ela lê a diretriz do Vance.
O Vance não adivinha o que a semana precisa, ele lê os números do Marcus.`,
    whatYouWillDo: [
      'Parar de ser o gargalo de toda peça de conteúdo.',
      'Entregar análise, estratégia, ideias e roteiros para agentes que já conhecem seu negócio.',
      'Acordar na segunda com a semana já planejada.'
    ],
    beforeYouStart: [
      'Claude Code instalado — os agentes viram skills.',
      'Seu documento de voz de marca, para o roteirista ler antes de escrever.',
      'Acesso às suas métricas, para o primeiro agente ter de onde puxar número.'
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Por que seis, e por que nessa ordem',
        description: 'A maioria constrói um "agente de conteúdo" gigante que faz tudo mal. A correção é chata: um trabalho para cada um, e uma ordem fixa de passagem.\n\nCada agente só recebe o que o anterior produziu. É esse o truque inteiro. Sem a ordem, você tem seis chats que se repetem.'
      },
      {
        stepNumber: 2,
        title: 'Marcus — Analista de Dados',
        description: 'Puxa seus números de todas as plataformas. Diz quais ganchos estão funcionando agora, acompanha o que os concorrentes fazem, sinaliza o que repetir e o que matar.\n\nEle vem primeiro porque tudo depois dele é chute sem ele.',
        copyableText: `Você é o Marcus, meu analista de dados. Você é dono das métricas
de desempenho nas minhas redes.

Seu trabalho:
- Puxar minhas métricas e achar o que está funcionando de verdade,
  não o que parece que está
- Comparar cada post com a MINHA linha de base, não com média de mercado
- Identificar os ganchos e formatos específicos que geraram os ganhos
- Sinalizar o que está performando mal e eu deveria parar de fazer

Regras:
- Nunca reporte um número que você não puxou. Sem estimativa, sem "cerca de".
- Comece pelo que mudou desde a semana passada, não por um despejo de dados.
- Termine todo relatório com as 3 coisas que mais importam nesta semana.`
      },
      {
        stepNumber: 3,
        title: 'Vance — Estrategista',
        description: 'Lê o relatório do Marcus e define a semana. Quantos reels, quantos carrosséis, quanto de formato longo. Qual chamada usar, com base em onde você realmente precisa de lead.',
        copyableText: `Você é o Vance, meu estrategista de conteúdo. Você transforma o
relatório de desempenho do Marcus em uma diretriz semanal que o
resto do time executa.

Seu trabalho:
- Ler o último relatório de desempenho antes de decidir qualquer coisa
- Definir o mix da semana: quantos de cada formato, e por quê
- Escolher a chamada com base em onde o funil está mais fraco agora
- Escrever uma diretriz curta o bastante para a ideadora agir na hora

Regras:
- Toda decisão cita um número do relatório. Nada de achismo.
- Se o dado não sustenta uma mudança, escreva "igual à semana passada" e siga.`
      },
      {
        stepNumber: 4,
        title: 'Riley — Ideadora',
        description: 'Pega a diretriz e brainstorma amplo. Transforma o que está em alta em algo filmável. Embasa cada ideia num post que já venceu e depois trava os vencedores da semana.',
        copyableText: `Você é a Riley, minha ideadora de conteúdo. Você transforma a
diretriz semanal do Vance em ideias travadas e prontas para produção.

Seu trabalho:
- Brainstormar muito mais ideias que o necessário, depois cortar forte
- Toda ideia precisa ser embasada por um vencedor real — um post
  com números reais
- Casar tendências com formatos que já funcionaram para mim
- Travar o conjunto final e escrever cada ideia de forma que o
  roteirista consiga começar do zero

Regras:
- Nenhuma ideia passa sem comprovante. Cite o post em que se baseia.
- Recrie estruturas comprovadas. Nunca comece de página em branco.`
      },
      {
        stepNumber: 5,
        title: 'Owen — Roteirista',
        description: 'Pega as ideias travadas e escreve o roteiro. Opções de gancho, lista de planos, legenda. Entrega algo que você filma sem pensar.',
        copyableText: `Você é o Owen, meu roteirista. Você transforma ideias travadas em
roteiros prontos para filmar.

Seu trabalho:
- Escrever o roteiro completo: opções de gancho, plano a plano,
  chamada, legenda
- Usar estruturas de gancho que já se provaram
- Cortar toda palavra que não está trabalhando
- Entregar algo que dê para filmar sem nenhuma decisão adicional

Regras:
- Escreva na minha voz. Leia meu guia de voz antes de cada roteiro.
- Use o gancho comprovado literalmente. Reescreva todo o resto.
- Nomeie coisas reais. Nunca "a ferramenta" quando você quer dizer
  um produto específico.`
      },
      {
        stepNumber: 6,
        title: 'Hayes — Gerente de Publicação',
        description: 'Coloca na fila o que você aprovou, agenda nos canais, confirma que de fato foi ao ar e audita os funis de DM toda semana.',
        copyableText: `Você é o Hayes, meu gerente de publicação. Você é dono de tudo
depois que o vídeo existe.

Seu trabalho:
- Colocar na fila o conteúdo aprovado e agendar em todos os canais
- Verificar que os posts realmente foram publicados — não assuma
  que o agendador funcionou
- Auditar os funis de comentário para DM semanalmente e sinalizar
  o que estiver quebrado
- Manter o registro do que saiu e quando

Regras:
- Nunca publique sem aprovação explícita daquela peça específica.
- "Agendado" não é "publicado". Confirme os dois.`
      },
      {
        stepNumber: 7,
        title: 'Sasha — Head de Conteúdo',
        description: 'Roda o pipeline inteiro. Mantém todo registro honesto, junta o reporte de todo mundo num relatório só, garante que nada fique parado.',
        copyableText: `Você é a Sasha, minha head de conteúdo. Você é dona da integridade
do pipeline e da reunião semanal.

Seu trabalho:
- Auditar o pipeline: o que está travado, o que está velho,
  o que está mal classificado
- Rodar a síntese semanal — juntar a saída de cada agente num resumo
- Me dizer o que está bloqueado e quem está bloqueando
- Ser a porta de entrada quando eu não sei de qual agente preciso

Regras:
- Reporte o estado real, incluindo as partes que parecem ruins.
- Nunca marque como pronto algo que não está pronto.`
      },
      {
        stepNumber: 8,
        title: 'Como construir de verdade',
        description: 'Cada agente é uma pasta com um arquivo markdown: `~/.claude/skills/marcus/SKILL.md`. Cole o prompt lá, adicione nome e descrição no topo, e vira `/marcus` no Claude Code.\n\nJeito mais rápido: abra o Claude Code, cole um dos prompts acima e diga "transforma isso num skill e salva". Ele monta o arquivo. Faça seis vezes.\n\n**Comece pelo Marcus e pelo Owen.** Análise e roteiro são onde as horas realmente vão — você sente esses dois na hora. Adicione o resto quando os dois estiverem se pagando.'
      }
    ],
    troubleshooting: [
      'O agente ignora suas instruções → o arquivo dele provavelmente não está carregando. Rode /context e veja o que está lá de verdade.',
      'Todos soam iguais → seus prompts estão genéricos demais. A descrição do trabalho precisa ser específica a ponto de dois deles não poderem trocar de lugar.',
      'A passagem entre agentes não acontece → eles não leem a mente um do outro. O que um produz tem que ser escrito em algum lugar que o próximo leia: um arquivo, um quadro, uma tabela.',
      'Você construiu os seis e não usa nenhum → normal. Apague quatro, use dois, e traga de volta só o que fizer falta.',
      'Tom repetitivo em tudo → falta o guia de voz na base. Adjetivo não ensina tom; texto seu ensina.'
    ],
    goDeeperLinks: [
      { label: 'Máquina de pesquisa de concorrentes — o que alimenta o Marcus', url: '#/recursos/claude-competitor-research-machine' },
      { label: '5 comandos secretos do Claude Code', url: '#/recursos/5-secret-claude-code-commands' }
    ]
  },
  {
    id: 'res-12',
    slug: 'make-claude-write-undetectable',
    title: 'O Humanizador 0% — Faça o Claude Escrever sem Tom de IA',
    category: 'AI CONTENT',
    description: 'Três prompts para remover o tom artificial dos textos do Claude e salvá-lo na skill /human para que ele escreva exatamente como você sempre.',
    subtitle: 'Três prompts fazem o Claude parar de escrever como robô, e depois você transforma isso num comando /human para nunca mais digitar nada disso. Uns cinco minutos.',
    estimatedReadTime: '7 min de leitura',
    difficulty: 'Beginner',
    updatedDate: 'Agosto de 2026',
    tags: ['Copywriting', 'Detecção de IA', 'Criação de Conteúdo', 'Prompts'],
    promptText: `Vá nesta página, liste todo padrão que denuncia escrita de IA,
e nunca mais faça nenhum deles:
https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing`,
    whatYouWillDo: [
      'Fazer o Claude escrever de um jeito que soa como você, não como IA.',
      'Construir um skill /human que você digita antes de escrever qualquer coisa.',
      'Conferir qualquer texto contra um detector em segundos.'
    ],
    beforeYouStart: [
      'Uma conta no claude.ai — o plano gratuito funciona.',
      'Um detector de IA para conferir o resultado. O ZeroGPT (zerogpt.com) é gratuito e não pede login.'
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Primeiro, veja o problema',
        description: 'Pegue um parágrafo que você sabe que foi escrito por IA e cole no ZeroGPT. Mande detectar. Volta alto — normalmente entre 80% e 100% de IA.\n\nÉ esse número que vamos matar. Deixe a aba aberta; você volta nela no fim para provar que a correção funcionou.'
      },
      {
        stepNumber: 2,
        title: 'Mande o Claude humanizar',
        description: 'Abra uma conversa nova e envie a linha abaixo. Isso define a regra para o chat inteiro — toda resposta depois disso recebe o tratamento.',
        copyableText: `Humanize todo o meu texto daqui pra frente para parar de soar como IA.`
      },
      {
        stepNumber: 3,
        title: 'Faça o Claude achar e banir cada vício',
        description: 'Esta é a parte que quase todo mundo pula. Em vez de adivinhar o que soa robótico, você entrega a lista real.\n\nO Claude lê a página, lista os vícios de volta — travessão em excesso, enchimento tipo "no mundo de hoje", a cadência de três, "não é só X, é Y", palavras como "aprofundar" e "robusto" — e se compromete a nunca mais usar. Um prompt faz a listagem e o banimento juntos.',
        copyableText: `Vá nesta página, liste todo padrão que denuncia escrita de IA,
e nunca mais faça nenhum deles:
https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing`
      },
      {
        stepNumber: 4,
        title: 'Trave como skill /human',
        description: 'Para nunca mais redigitar nada disso, transforme a conversa inteira num comando. No mesmo chat, digite uma barra, escolha o Skill Creator no menu e envie o pedido.\n\nQuando aparecer "skill criado" ou "empacotado com sucesso", terminou.',
        copyableText: `Construa um skill de humanizador pessoal a partir de tudo que
acabamos de fazer, para eu nunca mais ter que explicar isso.`
      },
      {
        stepNumber: 5,
        title: 'Como usar',
        description: 'Antes de escrever qualquer coisa, comece a mensagem com `/human` e adicione seu texto ou seu pedido.\n\nPegue a saída, cole de volta no ZeroGPT e rode. Deve cair para 0%, ou perto disso. Mesmo detector, mesmo teste, resultado oposto.',
        copyableText: `/human escreva uma introdução de 3 frases para minha newsletter sobre ferramentas de IA`
      },
      {
        stepNumber: 6,
        title: 'Conversa franca sobre detectores',
        description: 'Detectores mudam o tempo todo, então não trate 0% como verdade absoluta. Eles discordam entre si e erram nos dois sentidos.\n\nO ponto não é vencer um verificador — é tirar o tom robótico para o texto soar como você tendo dito aquilo. O `/human` é a sua passada de polimento antes de qualquer coisa sair.'
      }
    ],
    troubleshooting: [
      'O Skill Creator não aparece no menu de barra → atualize o app do Claude ou use o claude.ai no navegador. Digite só a barra e dê um segundo para o menu carregar.',
      'O detector ainda acusa → rode /human mais uma vez no mesmo texto, ou diga qual linha ainda soa estranha. Teste um segundo detector antes de confiar na nota.',
      'Travessões voltam ao longo de um chat longo → lembre o Claude uma vez: "você está usando travessão de novo, para". O skill segura a regra, mas thread longa dá deriva.',
      'Ficou informal demais → o skill herdou o tom do chat em que foi criado. Recrie a partir de uma conversa em que o tom estava certo.',
      'A skill não é acionada → a descrição precisa conter as palavras que você usa de verdade: "escreva", "revise", "reescreve esse texto".'
    ],
    goDeeperLinks: [
      { label: 'ZeroGPT', url: 'https://www.zerogpt.com' },
      { label: 'Prompts que eu provavelmente não deveria entregar', url: '#/recursos/5-secret-claude-prompts' }
    ]
  },
  {
    id: 'res-11',
    slug: 'create-videos-in-claude-code-with-remotion',
    title: 'Crie Vídeos no Claude Code com o Remotion',
    category: 'AI CONTENT',
    description: 'A configuração exata que uso para criar e editar vídeos de forma programática no Claude Code — instale o Remotion skill e gere seu primeiro vídeo via código.',
    subtitle: 'Dá para fazer e editar vídeo de verdade digitando um prompt no Claude Code, e ele escreve o código que renderiza. Sem timeline, sem arrastar clipe.',
    estimatedReadTime: '14 min de leitura',
    difficulty: 'Advanced',
    updatedDate: 'Julho de 2026',
    tags: ['Remotion', 'Vídeo React', 'Claude Code', 'Automação de Vídeo'],
    promptText: `/remotion-create Faça um card de título animado de 5 segundos
que diz "Editores morreram" — texto subindo, fundo em gradiente.

Não sabe qual skill chamar? Use /remotion-best-practices,
que puxa todos os outros.`,
    whatYouWillDo: [
      'Gerar vídeos animados a partir de um prompt — cards de título, gráficos, explicativos, demos de produto.',
      'Editar filmagem real de forma programática — legendas, b-roll, zooms, sobreposições.',
      'Renderizar tudo em um MP4 limpo, pronto para postar.'
    ],
    beforeYouStart: [
      'Node.js — confira com `node -v` no terminal. Sem número de versão? Pegue a LTS em nodejs.org.',
      'Claude Code instalado. Se `claude` não roda, instale isso primeiro.',
      'Você não precisa saber React. O Claude escreve o código; você é o diretor.'
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Crie o projeto Remotion',
        description: 'Um comando. Escolha um template inicial quando ele perguntar — o "Hello World" simples serve. Isso te dá uma pasta com tudo que o Remotion precisa. Depois entre nela.',
        copyableText: `npx create-video@latest`
      },
      {
        stepNumber: 2,
        title: 'Adicione o skill oficial do Remotion',
        description: 'Esta é a peça que muda tudo: existe um skill oficial do Remotion que ensina o framework ao Claude Code — animações, legendas, áudio, renderização, tudo.\n\nSem ele, o Claude escreve React comum, com estado e temporizador, que compila e roda mas produz vídeo quebrado. Rode de dentro da pasta do projeto.',
        copyableText: `npx skills add remotion-dev/skills`
      },
      {
        stepNumber: 3,
        title: 'Abra o Claude Code e faça o primeiro vídeo',
        description: 'Abra o Claude Code nessa pasta e diga o que você quer. Ele escreve a composição e te conta o que construiu.\n\nSe não souber qual skill chamar, use `/remotion-best-practices` — ele puxa todos os outros.',
        copyableText: `/remotion-create Faça um card de título animado de 5 segundos
que diz "Editores morreram" — texto subindo, fundo escuro com gradiente sutil`
      },
      {
        stepNumber: 4,
        title: 'Veja ao vivo',
        description: 'Abre o Remotion Studio no navegador e você vê o vídeo rodando.\n\nQuer mais rápido, maior, outra cor? Diga ao Claude — "aumenta o texto e deixa a animação mais seca" — e acompanhe a atualização. É esse o ciclo: pede, olha, ajusta.',
        copyableText: `npx remotion studio`
      },
      {
        stepNumber: 5,
        title: 'Renderize o MP4 final',
        description: 'Quando estiver certo, renderize. Sai na pasta `out/` como MP4, pronto para postar.',
        copyableText: `npx remotion render`
      },
      {
        stepNumber: 6,
        title: 'Editar filmagem real, não só animação',
        description: 'Mesma ideia, um passo além. Jogue seu clipe bruto na pasta `public/` do projeto e diga o que quer feito: "coloque legendas estilo TikTok", "dá zoom quando eu falar o gancho", "põe esse print na tela aos 10 segundos".\n\nO Remotion tem suporte a legenda, b-roll e zoom embutido, e o skill sabe usar. Você dirige, ele edita.'
      },
      {
        stepNumber: 7,
        title: 'Onde isso realmente compensa',
        description: 'Vídeo programático não substitui editor para uma peça única e caprichada. O ganho está na repetição com variação: cem vídeos com o mesmo layout e dados diferentes, vinte anúncios com o mesmo formato e ganchos distintos.\n\nQuando chegar aí, peça um script que leia um arquivo de dados e rode o render em lote, no máximo duas renderizações em paralelo — renderização é pesada.'
      }
    ],
    troubleshooting: [
      '"npx: command not found" → o Node não está instalado ou não está no PATH. Reinstale a LTS e abra um terminal novo.',
      'O comando do skill não aparece no Claude Code → confirme que você rodou `npx skills add` dentro da pasta do projeto, depois reinicie o Claude Code para ele carregar.',
      'O Studio não abre / porta em uso → algo já está na porta 3000. Feche ou rode `npx remotion studio --port 3001`.',
      'Renderização lenta ou travando em vídeo longo → renderize uma composição curta primeiro para confirmar, depois faça a completa. Render 4K longo consome muita memória.',
      'O vídeo saiu estranho → não conserte à mão. Descreva o problema em português ao Claude e deixe ele corrigir o código. É esse o ponto.'
    ],
    goDeeperLinks: [
      { label: 'Documentação do Remotion', url: 'https://www.remotion.dev/docs' },
      { label: 'Skills de IA do Remotion', url: 'https://www.remotion.dev/docs/ai/skills' }
    ]
  }
];
