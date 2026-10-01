// Rodar UMA VEZ, à mão, depois que TELEGRAM_BOT_TOKEN e LANDING_URL_BASE
// estiverem setados de verdade no ambiente (nunca em arquivo). Aponta o
// Telegram para o endpoint /canal/telegram/webhook do serviço em produção.
//
// Uso: TELEGRAM_BOT_TOKEN=xxx LANDING_URL_BASE=https://reformify-landing.onrender.com node plantao/scripts/configurar-webhook-telegram.mjs
import { configurarWebhook } from '../src/canal/telegram.js';

const urlBase = process.env.LANDING_URL_BASE;
if (!urlBase) {
  console.error('LANDING_URL_BASE ausente — defina a URL pública do serviço antes de registrar o webhook.');
  process.exit(1);
}

const resultado = await configurarWebhook(urlBase);
console.log(JSON.stringify(resultado, null, 2));
