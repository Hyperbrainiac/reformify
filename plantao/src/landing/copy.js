// Texto da página, copiado literalmente da seção 5 do documento `oferta` v3
// (ACE-2). Não reescrever aqui — mudança de texto volta para o Rafael.
import { RODAPE_OBRIGATORIO } from '../oferta.js';

export const copy = {
  h1: 'Seu cliente perguntou sobre a Reforma. Você responde hoje, com o artigo da lei na mão.',

  subhead:
    'Plantão de dúvidas sobre a Reforma Tributária do Consumo — IBS, CBS, Imposto Seletivo e as obrigações acessórias da transição — para escritórios de contabilidade. Resposta por escrito em até 4 horas úteis, com a norma de referência citada. A decisão continua sendo sua: a gente entrega a fundamentação pronta.',

  ctaPrimario: {
    texto: 'Mandar uma dúvida real — resposta grátis',
    apoio:
      'Sem cartão. Você manda uma dúvida de verdade, a gente responde por escrito com a fonte citada em até 1 dia útil, e você julga pelo resultado.',
  },

  problema: {
    titulo: 'Você já perdeu a tarde nisso.',
    paragrafos: [
      'O cliente manda áudio no WhatsApp perguntando o que muda para a empresa dele. Você sabe responder por cima — mas responder por cima, com o seu CRC atrás, não dá. Então você para o que estava fazendo, abre a lei, procura o dispositivo, cruza com o regime do cliente e volta duas horas depois.',
      'E aí chega a mesma pergunta de outro cliente.',
      'Isso não é falta de conhecimento. É falta de tempo de pesquisa. É exatamente o que a gente faz por você.',
    ],
  },

  comoFunciona: {
    titulo: 'Como funciona',
    passos: [
      {
        titulo: '1. Você manda a dúvida.',
        texto: 'Pelo WhatsApp ou Telegram, do jeito que você escreveria para um colega. Áudio serve.',
      },
      {
        titulo: '2. Alguém confirma que pegou — em 1 hora útil no Plano Escritório.',
        texto:
          'Não é robô: é a confirmação de que a sua dúvida entrou na fila, com o prazo dela. Se ela cair num ponto que ainda não está regulamentado ou que a gente precisa validar do zero, você fica sabendo nessa primeira hora, não no silêncio.',
      },
      {
        titulo: '3. A gente pesquisa e responde por escrito, com a fonte.',
        texto:
          'Em até 4 horas úteis no Plano Escritório, 1 dia útil no Plantão Reforma. Toda resposta traz a norma de referência, o link para o texto oficial e a data em que a gente conferiu. Quando o ponto ainda não estiver regulamentado, a gente escreve isso — em vez de dar um palpite.',
      },
      {
        titulo: '4. Você responde o seu cliente.',
        texto: 'Com o seu nome, a sua análise e a sua conclusão. A gente nunca aparece para ele.',
      },
    ],
  },

  prova: {
    titulo: 'A gente não tem 200 depoimentos. Tem isto aqui.',
    intro:
      'A ACE é nova e não vai fingir o contrário. O que a gente pode mostrar antes de você pagar qualquer coisa é o produto funcionando:',
    pergunta:
      'Meu cliente é do Simples Nacional e me perguntou se ele vai precisar destacar IBS e CBS na nota. O que eu respondo pra ele?',
    resposta: [
      'Depende de uma escolha que é dele — e as duas respostas são diferentes.',
      'Permanecendo no regime único (DAS): ele não destaca IBS e CBS como tributo próprio. Continua recolhendo dentro do DAS (LC 214/2025, art. 41, §2º). O que a nota dele precisa carregar é a alíquota aplicável ao cálculo do crédito do adquirente não optante, informada no documento fiscal (LC 123/2006, art. 23, §§ 1º-A e 2º, na redação da LC 227/2026). É crédito limitado ao que foi cobrado no regime único — não é crédito cheio.',
      'Optando por apurar IBS e CBS pelo regime regular (LC 214/2025, art. 41, §3º; LC 123/2006, art. 13, §9º, incluído pela LC 227/2026): aí sim os dois saem por fora do DAS, destacados na nota, e o adquirente aproveita crédito integral (LC 214/2025, art. 47, §2º, I).',
      'Em 2026, na prática: as alíquotas de teste (IBS 0,1% e CBS 0,9%) não se aplicam às operações dos optantes pelo Simples — LC 214/2025, art. 348, III, "c". Permanecendo no regime único, não há valor de IBS/CBS a destacar neste ano. Os anexos do Simples com IBS e CBS só valem a partir de 1º/01/2027.',
      'O que muda já: o leiaute, não a alíquota. Os grupos de IBS/CBS da NF-e/NFC-e estão na NT 2025.002, hoje na v1.51 (04/08/2026), com regras de validação em produção desde janeiro/2026. O trabalho de agora é o emissor dele.',
    ],
    fontes: [
      { texto: 'LC 214/2025, art. 41, §2º', url: 'https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm' },
      { texto: 'LC 123/2006, art. 23, §§ 1º-A e 2º', url: 'https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm' },
      { texto: 'LC 227/2026', url: 'https://www.planalto.gov.br/ccivil_03/leis/lcp/Lcp227.htm' },
      { texto: 'LC 214/2025, art. 41, §3º', url: 'https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm' },
      { texto: 'LC 214/2025, art. 47, §2º, I', url: 'https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm' },
      { texto: 'LC 214/2025, art. 348, III, "c"', url: 'https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm' },
      { texto: 'NT 2025.002', url: 'https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=04BIflQt1aY=' },
    ],
    dataVerificacao: '29/09/2026',
    rodape: RODAPE_OBRIGATORIO,
    fechamento: [
      'Esta resposta é o padrão, não uma vitrine. É assim que sai toda resposta: direto ao ponto, com a norma citada, o link para o texto oficial e a data de verificação. E quando o ponto ainda não estiver regulamentado — como a regra de preenchimento campo a campo, que depende de ato conjunto CGIBS/RFB — a gente escreve exatamente isso, em vez de inventar um artigo.',
      'Repare numa coisa: essa mesma resposta, escrita em janeiro, já estaria errada. A LC 227, de 13/01/2026, mudou a regra de crédito do Simples. E a NT 2025.002 mudou de versão 6 vezes só em 2026. É por isso que o alerta de atualização faz parte do plano: acompanhar isso é o nosso trabalho, não o seu.',
      'E é por isso que o primeiro passo é grátis: manda a sua dúvida, recebe a resposta, decide depois.',
    ],
  },

  planos: {
    titulo: 'Dois planos. Sem fidelidade em nenhum dos dois.',
    turmaFundadora:
      'Turma Fundadora: 10 vagas, no máximo 6 no Plano Escritório. É o teto real de atendimento com esse prazo, não escassez inventada — e é o que nos permite apurar a garantia de prazo resposta por resposta. Preço travado por 12 meses para quem entrar.',
    anual: 'Prefere anual? 10× o valor mensal, à vista — 2 meses grátis.',
    ctaPrimario: 'Começar pelo Plano Escritório',
    ctaSecundario: 'Começar pelo Plantão Reforma',
    apoio: 'Ainda com dúvida? Mande uma pergunta real e receba a resposta grátis primeiro.',
  },

  prazoPorExtenso: {
    titulo: 'O prazo, por extenso',
    intro: 'A gente prefere explicar o relógio a esconder ele.',
    bullets: [
      'A janela é seg a sex, das 9h às 18h, horário de Brasília.',
      'O relógio corre dentro da janela, e o que sobra do dia conta. Sua pergunta chega às 17h de uma sexta no Plano Escritório? 1 hora corre na sexta, 3 correm na segunda — vence às 12h de segunda.',
      'Pergunta que chega fora da janela começa a contar às 9h do próximo dia útil.',
      'Se a sua dúvida exigir validação técnica inédita, o prazo da resposta completa passa a 1 dia útil (Plano Escritório) ou 2 dias úteis (Plantão Reforma) — e você é avisado dentro da primeira hora, nunca pelo silêncio.',
      'Passou do teto de perguntas do mês? A gente continua respondendo. O prazo passa a 1 dia útil (Escritório) ou 2 dias úteis (Plantão) e a gente avisa na hora. Ninguém é cortado no meio do mês.',
    ],
    fechamento: 'A garantia de prazo corre contra a resposta completa com a fonte, no prazo que valia para aquela pergunta.',
  },

  garantia: {
    titulo: 'Garantia dupla de 30 dias.',
    itens: [
      {
        titulo: 'Estourou o prazo?',
        texto: 'Se qualquer resposta completa sua passar do prazo prometido no primeiro mês, devolvemos o mês inteiro. Não precisa reclamar — a gente apura e devolve.',
      },
      {
        titulo: 'Não gostou?',
        texto: 'Cancelou nos primeiros 30 dias, por qualquer motivo ou por nenhum, devolvemos 100%.',
      },
    ],
    fechamento: 'Sem fidelidade, nunca. Cancela pelo mesmo WhatsApp em que você tira as dúvidas.',
  },

  naoFazemos: {
    titulo: 'Melhor você saber agora.',
    bullets: [
      'Não emitimos parecer contábil nem parecer jurídico, e não assumimos responsabilidade técnica. Entregamos informação e orientação geral com a fonte citada.',
      'Não prometemos economia de imposto. Nenhum número, nenhuma estimativa, nenhum "você vai pagar X% a menos".',
      'Não configuramos ERP, não parametrizamos emissão de nota, não mexemos no seu sistema.',
      'Não revisamos apuração, SPED nem arquivo fiscal.',
      'Não falamos com o cliente do seu escritório. Nunca.',
      'Não pedimos e não guardamos dado fiscal de ninguém. Formule a dúvida sem anexar documento do cliente.',
      'Não damos palpite. Quando o ponto ainda não está regulamentado, a gente escreve que não está.',
    ],
    fechamento: 'Quem analisa o caso concreto, decide e assina é o contador. Sempre.',
  },

  faq: [
    {
      q: 'Isso substitui o meu trabalho?',
      a: 'Não. A gente entrega a pesquisa fundamentada; a análise do caso, a decisão e a assinatura são suas. E nunca falamos com o seu cliente.',
    },
    {
      q: 'Quem responde as perguntas?',
      a: 'Um time de pesquisa especializado em Reforma Tributária. Entregamos informação com a fonte citada — não parecer contábil nem jurídico. Você confere a norma e forma a sua conclusão.',
    },
    {
      q: 'Como conta o prazo de 4 horas úteis?',
      a: 'Seg a sex, das 9h às 18h (horário de Brasília). O relógio corre dentro da janela e o que sobra do dia conta: pergunta que chega às 17h de sexta vence às 12h de segunda. Pergunta que chega fora da janela começa a contar às 9h do próximo dia útil.',
    },
    {
      q: 'Qual é a diferença entre "1 hora útil" e "4 horas úteis" no Plano Escritório?',
      a: 'Em até 1 hora útil alguém de verdade confirma que pegou a sua dúvida e te diz qual é o prazo dela. Em até 4 horas úteis chega a resposta completa, por escrito, com a norma citada — e é contra esse prazo que a garantia corre.',
    },
    {
      q: 'E se a minha dúvida for sobre um ponto que ainda não foi regulamentado?',
      a: 'A gente te diz isso, com todas as letras, em vez de dar um palpite — e te avisa dentro da primeira hora. Nesses casos a resposta completa vai a 1 dia útil no Plano Escritório e 2 dias úteis no Plantão Reforma, porque ela passa por validação técnica antes de sair.',
    },
    {
      q: 'E se eu passar do limite de perguntas?',
      a: 'A gente continua respondendo — o teto é macio. O que muda é o prazo: passa a 1 dia útil no Escritório e 2 dias úteis no Plantão, e a gente te avisa na hora em que isso acontece. Ninguém é cortado no meio do mês, e isso não dispara a garantia de prazo.',
    },
    {
      q: 'Por que só 10 vagas?',
      a: 'Porque é o número de assinantes que a gente atende com o prazo prometido e consegue apurar a garantia resposta por resposta. Prometer para mais gente seria vender um prazo que a gente não cumpre. As vagas reabrem quando a capacidade crescer — e quem entrou na primeira turma mantém o preço por 12 meses.',
    },
    {
      q: 'Tem encontro ao vivo?',
      a: 'Não, e é de propósito. A gente entrega por escrito, com a fonte citada e a data de verificação — é o que você consegue reler, arquivar e repassar para a sua carteira. No Plano Escritório você recebe o resumo mensal escrito com as dúvidas que mais apareceram no mês.',
    },
    {
      q: 'Posso colocar a minha marca no material?',
      a: 'No Plano Escritório, sim. O kit mensal e o resumo mensal são editáveis e licenciados para você distribuir para a sua carteira com a sua marca.',
    },
    {
      q: 'Tem fidelidade? Como cancelo?',
      a: 'Não tem. Você cancela pelo mesmo WhatsApp, sem ligação de retenção.',
    },
    {
      q: 'Já assino uma base de legislação. Por que eu preciso disso?',
      a: 'Base de legislação te entrega o texto; você ainda precisa achar, ler e interpretar — e saber que ele mudou. A LC 227, de 13/01/2026, alterou dezenas de artigos da LC 214/2025 e da LC 123/2006. Aqui você faz a sua pergunta em português e recebe a resposta fundamentada, na redação vigente, dentro de um prazo.',
    },
    {
      q: 'Vocês guardam meus dados ou os do meu cliente?',
      a: 'Guardamos o mínimo para te atender: nome, e-mail, WhatsApp e o nome do escritório. Não pedimos e não armazenamos dado fiscal. Você pode pedir exclusão a qualquer momento pelo próprio canal.',
    },
    {
      q: 'Como pago?',
      a: 'Cartão ou Pix, assinatura mensal. Mensal ou anual (10× à vista).',
    },
  ],

  ctaFinal: {
    titulo: 'Manda a dúvida que o seu cliente te fez essa semana.',
    texto:
      'A gente responde grátis, por escrito, com a norma de referência citada e a data em que a gente conferiu. Depois você decide.',
    botao: 'Mandar minha dúvida',
  },

  rodapePagina:
    'ACE AI CORPORATION · Serviço de informação e orientação geral sobre a Reforma Tributária. Não constitui consultoria contábil, parecer jurídico ou assessoria fiscal individualizada. · Para sair da nossa lista, responda SAIR em qualquer mensagem.',
};

// [SPEC DIEGO — 3] Formulário: 7 campos, nada além. Sem dado fiscal.
export const CAMPOS_FORMULARIO = [
  { nome: 'nome', label: 'Nome', tipo: 'text', obrigatorio: true },
  { nome: 'whatsapp', label: 'WhatsApp', tipo: 'tel', obrigatorio: true },
  { nome: 'email', label: 'E-mail', tipo: 'email', obrigatorio: true },
  { nome: 'escritorio', label: 'Nome do escritório / empresa', tipo: 'text', obrigatorio: true },
  {
    nome: 'carteira',
    label: 'Quantos clientes na carteira?',
    tipo: 'select',
    obrigatorio: true,
    opcoes: ['Sou contador solo', '1–20', '21–50', '51–150', '150+'],
  },
  {
    nome: 'duvida',
    label: 'Sua dúvida sobre a Reforma',
    tipo: 'textarea',
    obrigatorio: true,
    minLength: 20,
  },
  {
    nome: 'autoriza',
    label: 'Autorizo o contato por WhatsApp. Posso pedir para sair a qualquer momento.',
    tipo: 'checkbox',
    obrigatorio: true,
  },
];
