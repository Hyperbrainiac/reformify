import { criarServidor } from './servidor.js';
import { config } from '../config.js';
import { verificarEEnviarAlertasSla } from '../canal/alertas.js';

const servidor = criarServidor();
servidor.listen(config.port, config.host, () => {
  // eslint-disable-next-line no-console
  console.log(`Landing no ar em http://${config.host}:${config.port} (preview=${config.preview})`);
});

// Job de alerta de metade do SLA (ACE-14 item 4): roda dentro do próprio
// processo do servidor (já fica de pé 24/7 para o webhook) em vez de
// contratar um serviço de cron à parte — menor coisa que funciona. Checagem
// a cada 10 min é granularidade suficiente mesmo para o prazo mais curto da
// oferta (Escritório: metade de 4h úteis = 2h).
const INTERVALO_VERIFICACAO_SLA_MS = 10 * 60_000;

function rodarVerificacaoSla() {
  verificarEEnviarAlertasSla().catch((e) => {
    // Falha visível: se o push quebrar, isso precisa gritar no log do
    // serviço (Render) — não pode falhar em silêncio, é exatamente o tipo
    // de falha que a garantia de devolução depende de não acontecer.
    // eslint-disable-next-line no-console
    console.error(`[canal] falha ao verificar alertas de SLA: ${e.message}`);
  });
}

setInterval(rodarVerificacaoSla, INTERVALO_VERIFICACAO_SLA_MS);
rodarVerificacaoSla();
