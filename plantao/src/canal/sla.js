// Relógio de horário comercial do plantão: seg–sex, 9h–18h, horário de
// Brasília. Brasil não tem mais horário de verão desde 2019, então o offset
// BRT = UTC-3 é fixo — não precisa de tabela de fuso.
//
// Por que isto existe (ACE-14): diferença crua de timestamp conta noite e fim
// de semana e dispara devolução falsa. Pergunta às 17h de sexta respondida às
// 10h de segunda são 2 horas úteis (1h sobrando de sexta + 1h de segunda),
// não 65 horas corridas.

const OFFSET_BRT_MS = -3 * 3600_000;
const JANELA_INICIO_H = 9;
const JANELA_FIM_H = 18;

function paraBrt(dataIso) {
  return new Date(new Date(dataIso).getTime() + OFFSET_BRT_MS);
}

function paraIsoReal(dataBrt) {
  return new Date(dataBrt.getTime() - OFFSET_BRT_MS).toISOString();
}

// Usa os getters de UTC sobre o instante já deslocado para BRT — trata os
// campos "UTC" desse Date deslocado como se fossem o relógio de parede de
// Brasília. Evita depender do fuso horário do host rodando o processo.
function ehDiaUtil(dataBrt) {
  const dia = dataBrt.getUTCDay();
  return dia >= 1 && dia <= 5;
}

function inicioDoDiaBrt(dataBrt) {
  return new Date(Date.UTC(dataBrt.getUTCFullYear(), dataBrt.getUTCMonth(), dataBrt.getUTCDate()));
}

function janelaInicioDoDia(dataBrt) {
  return new Date(inicioDoDiaBrt(dataBrt).getTime() + JANELA_INICIO_H * 3600_000);
}

function janelaFimDoDia(dataBrt) {
  return new Date(inicioDoDiaBrt(dataBrt).getTime() + JANELA_FIM_H * 3600_000);
}

// Quantas horas úteis existem entre dois instantes (ISO, qualquer fuso de
// entrada — Date já normaliza). Conta só a fatia seg-sex 9h-18h de cada dia.
export function horasUteisEntre(inicioIso, fimIso) {
  const inicio = paraBrt(inicioIso);
  const fim = paraBrt(fimIso);
  if (fim <= inicio) return 0;

  let totalMs = 0;
  let cursorDia = inicioDoDiaBrt(inicio);
  const fimDia = inicioDoDiaBrt(fim);

  while (cursorDia <= fimDia) {
    if (ehDiaUtil(cursorDia)) {
      const janelaInicio = janelaInicioDoDia(cursorDia);
      const janelaFim = janelaFimDoDia(cursorDia);
      const efetivoInicio = inicio > janelaInicio ? inicio : janelaInicio;
      const efetivoFim = fim < janelaFim ? fim : janelaFim;
      if (efetivoFim > efetivoInicio) totalMs += efetivoFim - efetivoInicio;
    }
    cursorDia = new Date(cursorDia.getTime() + 24 * 3600_000);
  }

  return totalMs / 3600_000;
}

// Primeiro instante de expediente igual ou posterior ao dado (pula fim de
// semana e horário fora da janela, avança para o próximo dia útil às 9h).
function proximoInicioUtil(dataBrt) {
  let cursor = dataBrt;
  for (let i = 0; i < 14; i++) {
    if (ehDiaUtil(cursor)) {
      const inicio = janelaInicioDoDia(cursor);
      const fim = janelaFimDoDia(cursor);
      if (cursor < inicio) return inicio;
      if (cursor < fim) return cursor;
    }
    cursor = janelaInicioDoDia(new Date(inicioDoDiaBrt(cursor).getTime() + 24 * 3600_000));
  }
  throw new Error('proximoInicioUtil não convergiu — verifique a janela de expediente');
}

// Soma N horas úteis a partir de um instante e devolve o ISO (fuso real) do
// resultado. Usado para o prazo final e para o alerta de metade do SLA.
export function somarHorasUteis(inicioIso, horasUteis) {
  let restanteMs = horasUteis * 3600_000;
  let cursor = proximoInicioUtil(paraBrt(inicioIso));

  while (restanteMs > 0) {
    const fimJanela = janelaFimDoDia(cursor);
    const disponivelMs = fimJanela - cursor;
    if (restanteMs <= disponivelMs) {
      cursor = new Date(cursor.getTime() + restanteMs);
      restanteMs = 0;
    } else {
      restanteMs -= disponivelMs;
      cursor = proximoInicioUtil(janelaInicioDoDia(new Date(inicioDoDiaBrt(cursor).getTime() + 24 * 3600_000)));
    }
  }

  return paraIsoReal(cursor);
}

export function estourou(entradaIso, respostaIso, prazoHorasUteis) {
  return horasUteisEntre(entradaIso, respostaIso) > prazoHorasUteis;
}

// Tamanho do "dia útil" para converter prazos como "1 dia útil" (oferta.js)
// em horas úteis — um dia útil não é 24h, é só a janela de expediente.
const HORAS_UTEIS_POR_DIA = JANELA_FIM_H - JANELA_INICIO_H;

// Converte o texto de prazo da oferta ("4 horas úteis", "1 dia útil", "2 dias
// úteis") para horas úteis. Existe porque `parseFloat(plano.prazoResposta)`
// lia só o dígito e tratava "1 dia útil" como 1 HORA em vez de 9 horas úteis
// (janela 9h-18h) — subestimava o prazo do Plantão Reforma em 9x e disparava
// estouro/devolução automática que a empresa não devia (exatamente o risco
// que a ACE-14 aponta).
export function prazoTextoParaHorasUteis(texto) {
  const m = /^(\d+(?:[.,]\d+)?)\s*(hora|dia)/i.exec(String(texto).trim());
  if (!m) throw new Error(`prazo em formato desconhecido: "${texto}"`);
  const valor = parseFloat(m[1].replace(',', '.'));
  return m[2].toLowerCase() === 'dia' ? valor * HORAS_UTEIS_POR_DIA : valor;
}
