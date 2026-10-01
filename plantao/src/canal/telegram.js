// Transporte Telegram (Bot API). Zero dependência: fetch nativo do Node,
// igual ao padrão do Mercado Pago em mercadopago.js. Sem TELEGRAM_BOT_TOKEN
// setado (nunca em arquivo — só variável de ambiente/secret), cai no modo
// simulado e só loga — mesmo padrão do e-mail em email.js.
const API_BASE = 'https://api.telegram.org';

function token() {
  return process.env.TELEGRAM_BOT_TOKEN || null;
}

export function telegramConfigurado() {
  return Boolean(token());
}

export async function enviarMensagem(chatId, texto) {
  const t = token();
  if (!t) {
    // eslint-disable-next-line no-console
    console.log(`[telegram:simulado] para=${chatId}\n${texto}\n`);
    return { ok: true, provedor: 'simulado', messageId: null };
  }

  const resposta = await fetch(`${API_BASE}/bot${t}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: texto, disable_web_page_preview: true }),
  });

  if (!resposta.ok) {
    const detalhe = await resposta.text().catch(() => '');
    throw new Error(`telegram sendMessage respondeu ${resposta.status}: ${detalhe}`);
  }

  const dados = await resposta.json();
  return { ok: true, provedor: 'telegram', messageId: dados.result?.message_id ?? null };
}

// Chamado uma vez (à mão, via script) depois que o token chegar, para apontar
// o Telegram para o nosso endpoint. Não roda sozinho no boot do servidor.
export async function configurarWebhook(urlBase) {
  const t = token();
  if (!t) throw new Error('TELEGRAM_BOT_TOKEN ausente — não é possível registrar o webhook');

  const resposta = await fetch(`${API_BASE}/bot${t}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: `${urlBase}/canal/telegram/webhook` }),
  });

  if (!resposta.ok) {
    const detalhe = await resposta.text().catch(() => '');
    throw new Error(`telegram setWebhook respondeu ${resposta.status}: ${detalhe}`);
  }

  return resposta.json();
}
