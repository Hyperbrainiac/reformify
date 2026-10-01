// Orquestra um Update do Telegram (webhook). Dois fluxos:
//  - cliente manda pergunta -> registra, dispara onboarding (1ª vez) e
//    encaminha para o chat de staff da Bia;
//  - Bia responde (no chat de staff, em reply à mensagem encaminhada) ->
//    repassa o texto ao cliente e marca aceite ou resposta-com-fonte.
//
// "FONTE:" no início da resposta da Bia é o comando que marca qual mensagem
// conta para o SLA (ACE-14 item 2) — qualquer outra resposta é só o aceite.
import { config } from '../config.js';
import { enviarMensagem } from './telegram.js';
import { montarBoasVindasCanal } from './onboarding.js';
import {
  jaProcessadoUpdate,
  marcarUpdateProcessado,
  registrarPergunta,
  definirStaffMsgId,
  obterMensagemPorStaffMsgId,
  marcarAceite,
  marcarRespostaFonte,
  jaTeveOnboarding,
  marcarOnboarding,
} from './conversas.js';

const PREFIXO_FONTE = /^fonte:?\s*/i;

export async function processarUpdateTelegram(update) {
  if (!update || typeof update.update_id !== 'number') {
    throw new Error('update do Telegram sem update_id');
  }

  if (jaProcessadoUpdate(update.update_id)) {
    return { ok: true, duplicado: true };
  }
  marcarUpdateProcessado(update.update_id);

  const msg = update.message;
  if (!msg || !msg.text) {
    return { ok: true, ignorado: 'update sem mensagem de texto' };
  }

  const chatId = String(msg.chat.id);
  const staffChatId = config.canal.staffChatId;

  if (staffChatId && chatId === String(staffChatId)) {
    return processarRespostaDaBia(msg);
  }

  return processarMensagemCliente(msg, chatId);
}

async function processarMensagemCliente(msg, chatId) {
  const nome = [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(' ').trim() || chatId;
  const id = registrarPergunta({ chatId, clienteNome: nome, pergunta: msg.text });

  if (!jaTeveOnboarding(chatId)) {
    await enviarMensagem(chatId, montarBoasVindasCanal(null));
    marcarOnboarding(chatId);
  }

  let staffMsgId = null;
  if (config.canal.staffChatId) {
    const encaminhado = await enviarMensagem(
      config.canal.staffChatId,
      `#${id} — ${nome} (chat ${chatId}):\n${msg.text}\n\nResponda em reply a esta mensagem. Prefixo "FONTE:" marca resposta com fonte; qualquer outro reply conta como aceite.`
    );
    staffMsgId = encaminhado.messageId != null ? String(encaminhado.messageId) : null;
    if (staffMsgId) definirStaffMsgId(id, staffMsgId);
  }

  return { ok: true, mensagemId: id, staffMsgId };
}

async function processarRespostaDaBia(msg) {
  const replyId = msg.reply_to_message?.message_id != null ? String(msg.reply_to_message.message_id) : null;
  if (!replyId) {
    return { ok: true, ignorado: 'resposta sem reply_to_message — não dá para saber qual cliente' };
  }

  const mensagem = obterMensagemPorStaffMsgId(replyId);
  if (!mensagem) {
    return { ok: true, ignorado: `nenhuma pergunta aberta ligada à mensagem de staff ${replyId}` };
  }

  const ehFonte = PREFIXO_FONTE.test(msg.text);
  const texto = msg.text.replace(PREFIXO_FONTE, '').trim();

  await enviarMensagem(mensagem.chat_id, texto);

  if (ehFonte) {
    marcarRespostaFonte(mensagem.id, texto);
  } else if (!mensagem.aceite_em) {
    marcarAceite(mensagem.id, texto);
  }

  return { ok: true, mensagemId: mensagem.id, tipo: ehFonte ? 'resposta_fonte' : 'aceite' };
}
