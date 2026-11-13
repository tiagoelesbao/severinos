import { Resource } from '../../types';

export const LEAD_GENERATION_RESOURCES: Resource[] = [
  {
    id: 'res-ai-sales-team',
    slug: 'ai-sales-team',
    title: 'Monte uma Equipe de Vendas com IA Usando o Claude',
    category: 'LEAD GENERATION',
    description: 'A equipe exata de vendas por IA: o Claude encontra seus potenciais clientes com o Apify, pesquisa cada lead, cria os rascunhos de e-mail no seu Gmail, mantém seu pipeline atualizado e agenda as reuniões. Nada é enviado sem sua aprovação.',
    subtitle: 'Eu não faço mais prospecção — eu aprovo. O Claude encontra os leads, pesquisa cada um, escreve a abordagem, mantém o pipeline atualizado e agenda as calls. E nada sai sem passar por mim.',
    estimatedReadTime: '8 min de leitura',
    difficulty: 'Intermediate',
    updatedDate: 'Agosto de 2026',
    isFeatured: true,
    tags: ['Apify', 'API do Claude', 'Gmail', 'Outbound', 'CRM', 'Cal.com'],
    whatYouWillDo: [
      'Puxar uma lista atualizada do seu comprador exato quando quiser — raspada, não comprada.',
      'Abrir o Gmail com abordagens personalizadas já esperando nos rascunhos, escritas na sua voz. Você lê e envia.',
      'Manter o pipeline em dia e a agenda enchendo enquanto a IA faz o trabalho braçal.'
    ],
    beforeYouStart: [
      'Um plano pago do Claude em claude.ai. A montagem pede um computador; depois de pronta você roda do celular.',
      'Uma conta de Gmail — os rascunhos caem lá.',
      'Uma conta gratuita no Apify (apify.com) — é o que raspa os leads.',
      'Algum lugar para rastrear negócios. Um CRM se você tiver; uma planilha resolve no primeiro dia.',
      'Opcional: uma conta no Cal.com, se você quiser agendamento automático.',
      'Uma coisa antes de montar: isso não roda sozinho em segundo plano. Você dispara cada etapa com uma mensagem, como uma rotina de manhã. Ainda assim transforma horas de prospecção em minutos de aprovação.'
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Conecte o Claude às suas ferramentas',
        description: 'Vá em claude.ai → Configurações → Conectores.\n\nConecte o Gmail e dê acesso quando ele pedir — é assim que os rascunhos entram na sua conta.\n\nAdicione o Apify: clique em "Adicionar conector personalizado" e cole `https://mcp.apify.com`, depois entre com sua conta Apify.\n\nConectores são o que fazem o Claude realmente executar — raspar leads reais e escrever rascunhos reais — em vez de só te explicar como fazer.'
      },
      {
        stepNumber: 2,
        title: 'Crie o projeto e defina a regra única',
        description: 'No claude.ai, vá em Projetos → Novo projeto. Nomeie "Equipe de Vendas IA". Abra as instruções do projeto e cole o bloco preenchido.\n\nA regra no topo é o sistema inteiro. A IA faz todas as etapas da prospecção menos a que importa — apertar enviar. Essa fica com você. Sem spam, sem queimar lead, sem acordar com um e-mail que você não autorizou.',
        copyableText: `Você é meu assistente de vendas outbound. Você toca o pipeline. Eu fecho.

MEU NEGÓCIO: [o que você vende, para quem, e o resultado que gera — 2 ou 3 frases]

MEU COMPRADOR: [setor, porte, cidade/região, e o sinal que diz que precisam de mim]

MINHA VOZ: [cole 2 ou 3 e-mails reais que você escreveu, para bater com o jeito que você fala]

MEU LINK DE AGENDA: [seu link do Cal.com ou calendário]

A REGRA ÚNICA: Você nunca envia nada. Todo e-mail vai para o meu Gmail como
rascunho e espera por mim. Se eu não aprovei, não sai. Nunca use nenhuma ação
de envio, jamais.

COMO VOCÊ TRABALHA:
1. Encontrar leads que batem com meu comprador usando o Apify.
2. Pesquisar cada lead antes de escrever uma palavra — site, LinkedIn, Instagram, avaliações.
3. Escrever o primeiro e-mail e os follow-ups como rascunhos no Gmail, personalizados a partir da pesquisa.
4. Quando chegar resposta, ler interesse, aderência e timing, mover o lead para o estágio certo e rascunhar minha resposta.
5. Quando alguém quiser uma call, oferecer meu link de agenda.

Mantenha um pipeline vivo: cada lead, seu estágio e a próxima ação.
Me mostre sempre que eu pedir.`
      },
      {
        stepNumber: 3,
        title: 'Encontre os leads',
        description: 'No projeto, mande o pedido.\n\nSeja específico sobre o comprador: setor, porte, localização e um sinal de que precisam de você. "Donos de empresa" traz lixo. "Clínicas de estética em Curitiba com mais de uma unidade" traz comprador. O Claude escolhe o scraper certo do Apify — Google Maps, diretórios, LinkedIn.',
        copyableText: `Encontre 25 [seu comprador — ex: "donos de clínica de estética em Curitiba com 2+ unidades"].
Use um scraper do Apify para puxar nome, empresa, site e e-mail de cada um.
Me mostre a lista como tabela e adicione ao pipeline como "novo".`
      },
      {
        stepNumber: 4,
        title: 'Pesquise cada prospect',
        description: 'É isso que faz a abordagem acertar. A personalização vem de pesquisa real, não de um campo com o primeiro nome.\n\nCinco por vez mantém os resumos afiados.',
        copyableText: `Pesquise os próximos 5 leads do pipeline. Para cada um, leia o site,
o LinkedIn, o Instagram e as avaliações.

Me dê um resumo curto: o que vendem, com o que estão claramente
sofrendo, qualquer coisa específica que valha mencionar, e o ângulo
exato para abrir meu e-mail.`
      },
      {
        stepNumber: 5,
        title: 'Rascunhe a abordagem no Gmail',
        description: 'O Claude escreve e salva em rascunho — nada sai.\n\nDepois abra o Gmail → Rascunhos. Leia cada um, edite o que quiser e envie você mesmo. É o portão de aprovação funcionando.',
        copyableText: `Escreva o primeiro e-mail para cada lead pesquisado, usando o ângulo
de abertura do resumo dele e a minha voz. Menos de 120 palavras,
um único pedido claro. Salve cada um como rascunho no meu Gmail.
Não envie nada.

# Follow-ups seguem a mesma lógica:
Para todo lead que eu enviei e não respondeu em 3 dias, rascunhe um
follow-up curto na mesma thread. Duas frases no máximo. Só rascunho.`
      },
      {
        stepNumber: 6,
        title: 'Qualifique as respostas e atualize o pipeline',
        description: 'O Claude mantém o pipeline dentro do projeto e move os negócios conforme as respostas chegam.\n\nUm detalhe que engana muita gente: ele não fica olhando sua caixa de entrada sozinho. A mensagem abaixo é o que dispara essa etapa — faça dela parte da sua rotina de manhã.',
        copyableText: `Cheque minha caixa de entrada por respostas de leads do pipeline.

Para cada resposta me diga três coisas: interessado ou não,
boa aderência ou não, agora ou depois.

Mova o lead para o estágio certo, rascunhe minha resposta e
me mostre a tabela de pipeline atualizada.`
      },
      {
        stepNumber: 7,
        title: 'Agende as calls',
        description: 'A versão simples já está montada: seu link de agenda está nas instruções, então quando um lead demonstra interesse a resposta rascunhada já oferece o seu calendário. Isso funciona desde o primeiro dia.\n\nA versão completa conecta o Cal.com para o Claude checar sua disponibilidade real e marcar o horário ele mesmo: no Cal.com, vá em Configurações → Desenvolvedor → Chaves de API, crie uma chave e adicione o Cal.com como conector.\n\nÉ bom ter, não é obrigatório — a versão com link marca call do mesmo jeito.'
      }
    ],
    troubleshooting: [
      'Os leads voltam lixo → sua descrição de comprador está vaga demais. Some setor + porte + localização + um sinal de compra e rode de novo.',
      'Os rascunhos soam como IA → você pulou a parte da voz nas instruções. Cole 2 ou 3 e-mails que você realmente enviou. Ele precisa das suas frases, não de uma descrição do seu tom.',
      'O Claude se ofereceu para enviar um e-mail → lembre: só rascunho, nunca enviar. A regra nas instruções do projeto vale para todo chat dali; se escapar, reafirme e ela trava de novo.',
      'Nada acontece com as respostas → o Claude não vigia sua caixa sozinho. "Cheque minha caixa por respostas de leads do pipeline" é a mensagem que roda essa etapa.',
      'O Apify começou a cobrar → o plano gratuito cobre execuções pequenas. Comece com 25 leads, não 2.000; uma raspagem grande custa alguns dólares.'
    ],
    goDeeperLinks: [
      { label: 'Loja de scrapers do Apify', url: 'https://apify.com/store' },
      { label: 'A Lista de Leads de $600', url: '#/recursos/claude-chrome-lead-list' },
      { label: 'Rode todo o seu CRM no Claude', url: '#/recursos/connect-claude-to-gohighlevel' }
    ]
  },
  {
    id: 'res-1',
    slug: 'claude-chrome-lead-list',
    title: 'A Lista de Leads de $600',
    category: 'LEAD GENERATION',
    description: 'Extraia ~300 empresas locais qualificadas — nome, telefone, e-mail, site e o motivo pelo qual precisam do seu serviço — com Claude e o conector Apify, em um único prompt.',
    subtitle: 'Puxar lead à mão é o trabalho mais chato que existe. É exatamente o que se paga R$ 3 mil por mês para alguém ficar catando. Conecte o Apify uma vez, cole um prompt, e alguns minutos depois você tem centenas de leads ranqueados por quem mais precisa de você — com o motivo do lado do telefone.',
    estimatedReadTime: '8 min de leitura',
    difficulty: 'Intermediate',
    updatedDate: 'Agosto de 2026',
    isFeatured: true,
    tags: ['Apify', 'API do Claude', 'Scraping', 'Cold Email', 'Lead Gen'],
    promptText: `Use o Google Maps Scraper do Apify para puxar todos os [NICHO] em [SUA CIDADE].
Para cada um, pegue nome, nota, número de avaliações, telefone, e-mail e site.
Pule qualquer um permanentemente fechado.

Depois ranqueie do mais quente para o mais frio — qualquer um abaixo de 4,3 de
nota ou sem site vai para o topo, porque são os que precisam de mim.

Coloque numa tabela e salve como leads.md`,
    whatYouWillDo: [
      'Puxar cerca de 300 leads locais reais em um arquivo: nome, nota, telefone, e-mail, site.',
      'Ganhar uma coluna "Por Que Precisam de Você" — o motivo de cada empresa precisar de ajuda, que já serve de abertura da sua abordagem.',
      'Ter a lista inteira ranqueada do mais quente ao mais frio, para você começar a ligar de cima.',
      'Reaproveitar o mesmo prompt para qualquer nicho em qualquer cidade.'
    ],
    beforeYouStart: [
      'Uma conta no Claude — o conector funciona dentro do próprio Claude.',
      'Uma conta gratuita no Apify — o plano gratuito inclui US$ 5 de uso por mês, sem cartão. Uma rodada de 300 leads custa cerca de US$ 1,50, então isso sai de graça.',
      'Cerca de 5 minutos.'
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Conecte o Apify ao Claude',
        description: 'Abra o Claude → Configurações → Conectores. Busque Apify, clique em Conectar e entre com sua conta.\n\nPronto — o Claude passa a poder usar todo scraper do Apify, incluindo o de Google Maps que este guia usa.\n\nSe o Apify não aparecer no diretório, adicione como conector personalizado com a URL `https://mcp.apify.com`. Ele faz o login pelo navegador, sem chave de API para colar.'
      },
      {
        stepNumber: 2,
        title: 'Cole este prompt',
        description: 'Não mude nada além do nicho e da cidade.\n\nPor que a linha do ranking importa: uma empresa sem site ou com nota baixa é justamente a que precisa de marketing. Esse prompt não só coleta leads — ele ordena por quem tem mais chance de dizer sim.',
        copyableText: `Use o Google Maps Scraper do Apify para puxar todos os [NICHO] em [SUA CIDADE].
Para cada um, pegue nome, nota, número de avaliações, telefone, e-mail e site.
Pule qualquer um permanentemente fechado.

Depois ranqueie do mais quente para o mais frio — qualquer um abaixo de 4,3 de
nota ou sem site vai para o topo, porque são os que precisam de mim.

Coloque numa tabela e salve como leads.md`
      },
      {
        stepNumber: 3,
        title: 'Deixe rodar',
        description: 'O Claude dispara o scraper, as linhas começam a chegar e em alguns minutos você tem a tabela completa.\n\nSe quiser os 300 completos, diga "puxe pelo menos 300 lugares" — o scraper vem com um padrão mais baixo se você não pedir.'
      },
      {
        stepNumber: 4,
        title: 'A regra da honestidade — não pule esta linha',
        description: 'Se um e-mail não é público, a célula fica em branco. Nunca deixe a IA adivinhar um.\n\nE-mail falso parece certo e volta no segundo em que você envia. Mais ou menos uma em cada dez empresas não tem e-mail público, e tudo bem: uma lista curta e real vence uma longa e falsa.\n\nPara garantir, acrescente ao prompt: "se não houver e-mail listado, deixe em branco — não adivinhe".'
      },
      {
        stepNumber: 5,
        title: 'Trabalhe a lista',
        description: 'Comece pelo topo — o ranking já colocou as empresas mais carentes primeiro.\n\nA coluna "Por Que Precisam de Você" é a sua abertura: "vi que o site de vocês está fora do ar" vence qualquer template frio.\n\nOrdene pela coluna de e-mail para os brancos ficarem agrupados — esses você ataca por telefone ou formulário de contato.'
      },
      {
        stepNumber: 6,
        title: 'Torne seu',
        description: 'As duas únicas coisas que você muda são o nicho e a cidade:\n\n"telhadistas em Curitiba"\n"clínicas de estética em Belo Horizonte"\n"dentistas em Florianópolis"\n\nUm trabalho chato, eliminado.'
      },
      {
        stepNumber: 7,
        title: 'Alternativa sem configurar nada',
        description: 'Se você preferir não conectar nada, a extensão do Claude no Chrome faz uma versão menor: abra os resultados do Google Maps numa aba e uma planilha em branco em outra, abra o painel lateral do Claude na aba do Maps e peça para ele descer a lista puxando Nome, Site, Telefone, Endereço e E-mail para a planilha — deixando em branco onde não houver e-mail público.\n\nVocê consegue de 20 a 40 linhas em alguns minutos em vez de 300, e sem ranking. Serve para uma investida no mesmo dia, mas a rota do Apify acima é a máquina de verdade.'
      }
    ],
    troubleshooting: [
      'O Apify não aparece no diretório de conectores → adicione a URL de conector personalizado do passo 1.',
      'A execução trava ou dá timeout → peça menos lugares (100 em vez de 300) e rode duas vezes.',
      'Quase nenhum e-mail → é o nicho, não a ferramenta. Alguns setores não publicam e-mail. Telefone e site continuam vindo — não afrouxe a regra da honestidade para forçar.',
      'A lista veio cheia de franquia de rede nacional → acrescente ao prompt para descartar redes; a decisão nelas não é local.',
      'Créditos do Apify acabando rápido → reduza o limite de resultados e faça recortes menores e mais específicos. Sai mais barato e a lista fica melhor.'
    ],
    goDeeperLinks: [
      { label: 'Loja de scrapers do Apify', url: 'https://apify.com/store' },
      { label: 'Monte uma Equipe de Vendas com IA', url: '#/recursos/ai-sales-team' }
    ]
  }
];
