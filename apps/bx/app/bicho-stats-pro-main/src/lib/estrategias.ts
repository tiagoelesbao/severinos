export type Estrategia = {
  id: string;
  nivel: "Básico" | "Intermediário" | "Avançado";
  titulo: string;
  resumo: string;
  passos: string[];
  dica: string;
};

export const ESTRATEGIAS: Estrategia[] = [
  {
    id: "fundamentos",
    nivel: "Básico",
    titulo: "Entenda o tabuleiro antes de apostar",
    resumo:
      "Cada grupo tem 4 dezenas e cada extração tem 5 prêmios. Saber isso muda como você monta o jogo.",
    passos: [
      "Decore que o grupo 25 (Vaca) cobre 97, 98, 99 e 00 — é o único fora da sequência.",
      "Escolha se joga no 1º prêmio (paga mais, sai menos) ou do 1º ao 5º (sai mais, paga menos).",
      "Anote sempre em qual extração você jogou: PPT, PTM, PT, PTV, PTN e Coruja têm padrões diferentes.",
      "Comece com um valor fixo por extração e não aumente no impulso.",
    ],
    dica: "Antes de escolher o bicho, escolha o horário. O horário define o tipo de padrão que você vai ler.",
  },
  {
    id: "banca",
    nivel: "Básico",
    titulo: "Gestão de banca: a estratégia que segura todas as outras",
    resumo: "Quem quebra não é quem erra o bicho, é quem aposta sem regra de valor.",
    passos: [
      "Separe um valor mensal que você pode perder por inteiro sem afetar contas.",
      "Divida por 30 dias e nunca ultrapasse o valor do dia, mesmo depois de um prêmio.",
      "Use no máximo 3 apostas por extração — mais que isso dilui o retorno.",
      "Depois de um acerto grande, guarde metade e jogue só com a outra metade.",
    ],
    dica: "Meta realista: sobreviver 30 dias jogando. Quem sobrevive, aprende o padrão; quem quebra na semana 1, não.",
  },
  {
    id: "quentes",
    nivel: "Intermediário",
    titulo: "Como usar os bichos quentes sem cair na armadilha",
    resumo:
      "Bicho quente é aquele com frequência acima da média no período. Ele serve para confirmar tendência, não para garantir nada.",
    passos: [
      "Abra o ranking de frequência em 30 dias e depois em 7 dias.",
      "Marque os bichos que aparecem no topo dos dois períodos — esses têm tendência consistente.",
      "Filtre pelo horário em que você costuma jogar e repita a leitura.",
      "Jogue o quente confirmado como aposta principal e uma segunda dezena de apoio.",
    ],
    dica: "Se um bicho é quente só em 7 dias e frio em 30, é ruído. Espere confirmar.",
  },
  {
    id: "atraso",
    nivel: "Intermediário",
    titulo: "Atrasômetro: a hora de atacar o bicho parado",
    resumo:
      "Bichos muito atrasados tendem a voltar ao ritmo médio. A estratégia é entrar na janela certa, não no primeiro dia de atraso.",
    passos: [
      "Veja o atraso médio histórico do bicho (quantos sorteios ele costuma ficar sem sair).",
      "Só considere o bicho quando o atraso atual passar de 1,5x a média dele.",
      "Entre com valor pequeno e repita por no máximo 5 extrações seguidas.",
      "Se sair, encerre o ciclo e volte à sua aposta padrão.",
    ],
    dica: "Atraso não é dívida do sorteio com você. É só uma janela estatística — respeite o limite de tentativas.",
  },
  {
    id: "montagem",
    nivel: "Intermediário",
    titulo: "Montagem de jogo: grupo, dezena, centena e milhar juntos",
    resumo: "Combinar tipos de aposta equilibra chance de acerto e tamanho do prêmio.",
    passos: [
      "Base (60% do valor): grupo do 1º ao 5º — é o que te mantém no jogo.",
      "Meio (30%): dezena mais frequente dentro do grupo escolhido.",
      "Topo (10%): uma milhar ou centena que mais repetiu no seu horário.",
      "Revise a combinação toda semana com os dados atualizados.",
    ],
    dica: "Nunca coloque a maior parte no prêmio mais difícil. O topo é bônus, não a aposta.",
  },
  {
    id: "horarios",
    nivel: "Avançado",
    titulo: "Leitura cruzada por horário",
    resumo:
      "Cada extração tem seu próprio ranking. Cruzar horários revela bichos que só são quentes em um período do dia.",
    passos: [
      "Compare o ranking do PPT com o do PTN no mesmo período.",
      "Liste os bichos que aparecem no topo de um e no fundo do outro.",
      "Jogue esse bicho apenas no horário em que ele é forte.",
      "Refaça a comparação a cada 15 dias — o padrão desloca.",
    ],
    dica: "Muita gente joga o mesmo bicho o dia inteiro. É aí que a vantagem de quem lê por horário aparece.",
  },
  {
    id: "ciclos",
    nivel: "Avançado",
    titulo: "Ciclos e repetição de dezena",
    resumo: "Dezenas repetem em blocos curtos. Identificar o bloco ativo dá vantagem de curto prazo.",
    passos: [
      "Liste as 10 dezenas mais sorteadas nos últimos 7 dias.",
      "Marque as que também apareceram ontem e anteontem — é o bloco ativo.",
      "Jogue duas dezenas do bloco por 3 extrações.",
      "Se o bloco morrer (nenhuma sair em 3 extrações), abandone e refaça a lista.",
    ],
    dica: "Bloco ativo dura pouco. A disciplina de abandonar rápido vale mais que a escolha inicial.",
  },
  {
    id: "plano",
    nivel: "Avançado",
    titulo: "Seu plano semanal em 5 passos",
    resumo: "O jeito de sair do lugar é ter rotina, não sorte.",
    passos: [
      "Domingo: revise o ranking de 30 dias e escolha 3 bichos base.",
      "Segunda: confira o atrasômetro e defina 1 bicho de ciclo.",
      "Durante a semana: jogue só nos horários onde esses bichos são fortes.",
      "Anote cada aposta e cada resultado no app.",
      "Sexta: compare o que você apostou com o que saiu e ajuste a lista.",
    ],
    dica: "Sem registro não existe estratégia — existe memória seletiva.",
  },
];
