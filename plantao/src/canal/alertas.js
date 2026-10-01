// Push de alerta de SLA (ACE-14 item 4). alertasMetadeSla/painel já existiam
// como consulta passiva — a Bia precisava abrir o painel para saber que uma
// pergunta estava na metade do prazo. Isto empurra um aviso pro chat de staff
// assim que isso acontece, sem precisar checar nada. "Relatório me conta o
// estrago depois; alerta me deixa agir antes" — é o próprio texto do pedido.
import { config } from '../config.js';
import { enviarMensagem } from './telegram.js';
import { alertasParaNotificar, marcarAlertado } from './conversas.js';

function montarTextoAlerta(m) {
  return [
    `⏰ SLA na metade do prazo — pergunta #${m.id}`,
    `Cliente: ${m.cliente_nome} (chat ${m.chat_id})`,
    `Entrou: ${m.entrada_em}`,
    `Prazo de resposta com fonte: ${m.prazoHoras}h úteis — já se passaram ${m.horasUteisDecorridas.toFixed(1)}h úteis sem resposta com fonte.`,
    'Responda em reply com "FONTE:" para marcar a resposta que conta para o SLA.',
  ].join('\n');
}

// Falha visível: sem staffChatId configurado não há pra onde empurrar o
// aviso — melhor reportar isso explicitamente do que falhar em silêncio.
export async function verificarEEnviarAlertasSla(agoraIso = new Date().toISOString()) {
  if (!config.canal.staffChatId) {
    return { enviados: 0, ignorado: 'TELEGRAM_STAFF_CHAT_ID não configurado' };
  }

  const pendentes = alertasParaNotificar(agoraIso);
  for (const m of pendentes) {
    await enviarMensagem(config.canal.staffChatId, montarTextoAlerta(m));
    marcarAlertado(m.id);
  }

  return { enviados: pendentes.length };
}
