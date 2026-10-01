// Testa o canal de plantão (ACE-4) e a instrumentação de SLA (ACE-14) de
// ponta a ponta contra o servidor real, com a API do Telegram mockada (sem
// token de verdade e sem gastar nada) — mesmo padrão de teste-mercadopago.mjs.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const dir = mkdtempSync(path.join(tmpdir(), 'reformify-teste-canal-'));
process.env.LANDING_DADOS_DIR = dir;
process.env.LANDING_PORT = '0';
process.env.PORT = '0';
process.env.LANDING_PREVIEW = 'true';
process.env.TELEGRAM_BOT_TOKEN = 'TEST-fake-token';
process.env.TELEGRAM_STAFF_CHAT_ID = '-100999';

let falhas = 0;
let total = 0;
function checar(nome, condicao) {
  total++;
  if (!condicao) {
    falhas++;
    console.error(`FALHA: ${nome}`);
  }
}

const chamadasTelegram = [];
let proximoMessageId = 5000;
const fetchReal = globalThis.fetch;
function instalarMockTelegram() {
  globalThis.fetch = async (url, opts = {}) => {
    if (!String(url).startsWith('https://api.telegram.org')) return fetchReal(url, opts);
    const corpo = JSON.parse(opts.body);
    chamadasTelegram.push({ url: String(url), corpo });
    if (String(url).includes('/sendMessage')) {
      const messageId = proximoMessageId++;
      chamadasTelegram.at(-1).messageId = messageId;
      return { ok: true, json: async () => ({ ok: true, result: { message_id: messageId } }), text: async () => '' };
    }
    throw new Error(`fetch mockado chamado com url inesperada: ${url}`);
  };
}
instalarMockTelegram();

async function main() {
  // --- Relógio de horário comercial (ACE-14 item 3) — o caso do próprio pedido:
  // pergunta às 17h de sexta, resposta às 10h de segunda = 2 horas úteis, não 65 corridas.
  const { horasUteisEntre, somarHorasUteis } = await import('../src/canal/sla.js');
  const sexta17h = '2026-10-02T20:00:00.000Z'; // sexta 17h BRT = 20h UTC
  const segunda10h = '2026-10-05T13:00:00.000Z'; // segunda 10h BRT = 13h UTC
  const horas = horasUteisEntre(sexta17h, segunda10h);
  checar('sexta 17h -> segunda 10h = 2 horas úteis (não 65 corridas)', Math.abs(horas - 2) < 0.001);

  const prazoFinal = somarHorasUteis(sexta17h, 4);
  checar('sexta 17h + 4h úteis cai na segunda 12h BRT (15h UTC)', prazoFinal === '2026-10-05T15:00:00.000Z');

  const dentroDoExpediente = horasUteisEntre('2026-09-30T13:00:00.000Z', '2026-09-30T15:00:00.000Z'); // quarta 10h-12h BRT
  checar('2h corridas dentro do expediente = 2h úteis', Math.abs(dentroDoExpediente - 2) < 0.001);

  // --- Fluxo completo via servidor real ---
  const { criarServidor } = await import('../src/landing/servidor.js');
  const servidor = criarServidor();
  await new Promise((resolve) => servidor.listen(0, '127.0.0.1', resolve));
  const { port } = servidor.address();
  const base = `http://127.0.0.1:${port}`;

  async function enviarUpdate(update) {
    const resp = await fetch(`${base}/canal/telegram/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    });
    return { status: resp.status, body: await resp.json() };
  }

  // 1) Cliente manda a primeira pergunta.
  const updatePergunta = {
    update_id: 1,
    message: {
      message_id: 10,
      chat: { id: 123456 },
      from: { first_name: 'Ana', last_name: 'Contadora' },
      text: 'A partir de quando o IBS substitui o ICMS de verdade?',
    },
  };
  const respPergunta = await enviarUpdate(updatePergunta);
  checar('pergunta do cliente processada com 200', respPergunta.status === 200 && respPergunta.body.ok);
  checar('pergunta vira registro com id', typeof respPergunta.body.mensagemId === 'number');

  const chamadasAteAqui = chamadasTelegram.length;
  checar('onboarding + encaminhamento para staff = 2 mensagens enviadas', chamadasAteAqui === 2);
  const [chamadaOnboarding, chamadaEncaminhamento] = chamadasTelegram;
  checar('onboarding vai para o próprio cliente', chamadaOnboarding.corpo.chat_id === '123456');
  checar('onboarding contém o rodapé/disclaimer', chamadaOnboarding.corpo.text.includes('não é consultoria contábil'));
  checar('encaminhamento vai para o chat de staff da Bia', chamadaEncaminhamento.corpo.chat_id === '-100999');
  checar('encaminhamento contém a pergunta original', chamadaEncaminhamento.corpo.text.includes('IBS substitui o ICMS'));

  const staffMsgId = chamadaEncaminhamento.messageId;

  // 2) Update repetido (Telegram reenviando) não deve gerar nova pergunta nem nova mensagem.
  const respDuplicada = await enviarUpdate(updatePergunta);
  checar('update_id repetido é idempotente (duplicado=true)', respDuplicada.body.duplicado === true);
  checar('nenhuma chamada extra ao Telegram para update duplicado', chamadasTelegram.length === chamadasAteAqui);

  // 3) Segunda pergunta do mesmo cliente não repete onboarding.
  const updateSegundaPergunta = {
    update_id: 2,
    message: { message_id: 11, chat: { id: 123456 }, from: { first_name: 'Ana' }, text: 'E o crédito acumulado?' },
  };
  await enviarUpdate(updateSegundaPergunta);
  checar('onboarding não repete na segunda pergunta do mesmo cliente', chamadasTelegram.length === chamadasAteAqui + 1);

  // 4) Bia responde no chat de staff, em reply à primeira pergunta — isso é o "aceite".
  const updateAceite = {
    update_id: 3,
    message: {
      message_id: 20,
      chat: { id: -100999 },
      from: { first_name: 'Bia' },
      text: 'Recebi, te respondo com a fonte ainda hoje.',
      reply_to_message: { message_id: staffMsgId },
    },
  };
  const respAceite = await enviarUpdate(updateAceite);
  checar('resposta da Bia sem FONTE: conta como aceite', respAceite.body.tipo === 'aceite');
  checar('aceite foi repassado ao cliente de verdade', chamadasTelegram.at(-1).corpo.chat_id === '123456');

  // 5) Bia responde com "FONTE:" — marca a resposta que conta para o SLA.
  const updateResposta = {
    update_id: 4,
    message: {
      message_id: 21,
      chat: { id: -100999 },
      from: { first_name: 'Bia' },
      text: 'FONTE: muda em 2033 (regime pleno), art. 1º da EC 132/2023 — link oficial.',
      reply_to_message: { message_id: staffMsgId },
    },
  };
  const respResposta = await enviarUpdate(updateResposta);
  checar('resposta com prefixo FONTE: marca resposta_fonte', respResposta.body.tipo === 'resposta_fonte');
  checar('prefixo FONTE: é removido antes de mandar ao cliente', !chamadasTelegram.at(-1).corpo.text.toLowerCase().startsWith('fonte'));

  // 6) Painel da Bia reflete o estado.
  const painel = await fetch(`${base}/canal/painel`).then((r) => r.json());
  checar('painel mostra 1 pendente (a segunda pergunta, sem resposta ainda)', painel.pendentes.length === 1);
  checar('painel mostra 2 mensagens no total', painel.totalMensagens === 2);

  // 7) /saude expõe o canal (falha visível).
  const saude = await fetch(`${base}/saude`).then((r) => r.json());
  checar('/saude reporta canal configurado=true com o token de teste', saude.canal.configurado === true);
  checar('/saude reporta 1 pendente', saude.canal.pendentes === 1);

  servidor.close();
  rmSync(dir, { recursive: true, force: true });

  console.log(`\n${total - falhas}/${total} verificações passaram.`);
  if (falhas > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
