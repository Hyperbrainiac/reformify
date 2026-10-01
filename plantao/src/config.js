// Config lida do ambiente. Nenhum segredo aqui — só flags e URLs.

function isPreview() {
  // Padrão é sempre preview/noindex. Só sai do ar-secreto se alguém setar
  // explicitamente LANDING_PREVIEW=false — decisão do CEO, não deste arquivo.
  const raw = process.env.LANDING_PREVIEW;
  if (raw === undefined) return true;
  return raw.toLowerCase() !== 'false';
}

export const config = {
  port: Number(process.env.PORT || process.env.LANDING_PORT || 8788),
  host: '0.0.0.0',
  preview: isPreview(),
  urlBase:
    process.env.LANDING_URL_BASE ||
    (process.env.RENDER_EXTERNAL_URL
      ? process.env.RENDER_EXTERNAL_URL
      : null),
  checkout: {
    modo: process.env.CHECKOUT_MODO || 'sandbox', // 'sandbox' | 'producao'
    provedor: process.env.CHECKOUT_PROVEDOR || 'simulado',
  },
  canal: {
    // Chat id do grupo/DM do Telegram onde a Bia opera o plantão (não é
    // segredo, mas também não é hardcode — fica por ambiente). O token do
    // bot (TELEGRAM_BOT_TOKEN) é lido direto do ambiente em canal/telegram.js,
    // mesmo padrão do RESEND_API_KEY e do MERCADOPAGO_ACCESS_TOKEN.
    staffChatId: process.env.TELEGRAM_STAFF_CHAT_ID || null,
  },
  dadosDir: process.env.LANDING_DADOS_DIR || 'plantao/dados',
};
