// Fonte única dos números da oferta. Espelha o documento `oferta` v3 da ACE-2.
// Qualquer alteração de preço, prazo ou vaga muda aqui — nunca direto na copy.

export const RODAPE_OBRIGATORIO =
  'Material informativo da ACE AI. Orientação geral, não é consultoria contábil nem parecer jurídico. A decisão técnica é do profissional responsável.';

export const oferta = {
  janela: 'seg a sex, das 9h às 18h (horário de Brasília)',
  regraContagem:
    'o relógio só corre dentro da janela, e o que sobra do dia conta',

  planos: {
    plantao: {
      id: 'plantao',
      nome: 'Plantão Reforma',
      precoMes: 297,
      precoAnual: 2970,
      aceite: '4 horas úteis',
      prazoResposta: '1 dia útil',
      prazoValidacaoInedita: '2 dias úteis',
      perguntasMes: 10,
      usuariosCanal: 1,
    },
    escritorio: {
      id: 'escritorio',
      nome: 'Plano Escritório',
      precoMes: 897,
      precoAnual: 8970,
      aceite: '1 hora útil',
      prazoResposta: '4 horas úteis',
      prazoValidacaoInedita: '1 dia útil',
      perguntasMes: 20,
      usuariosCanal: 5,
    },
  },

  turmaFundadora: {
    vagasTotais: 10,
    vagasMaxEscritorio: 6,
    precoTravadoMeses: 12,
  },

  garantia: {
    diasArrependimento: 30,
    diasPrazo: 30,
  },
};

// v3 fechou todos os blocos ⚠️MARINA/⚠️BIA da v2 — não há mais placeholder pendente.
export function pendencias() {
  return [];
}

// Só o CEO liga isto (ACE-6). Publicar a copy (tirar noindex) é independente
// de liberar cobrança real — são dois gates separados de propósito.
export const PUBLICACAO_LIBERADA_CEO = false;
