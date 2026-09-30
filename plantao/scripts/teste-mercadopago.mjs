// Testa a integração real do Mercado Pago com a API mockada (sem gastar
// nada e sem precisar do token de verdade). Não passa pelo gate de produção
// de iniciarSessao (ACE-6, PUBLICACAO_LIBERADA_CEO) — esse gate é coberto à
// parte em teste-landing.mjs e continua false. Aqui valida só o contrato com
// o Mercado Pago: forma do request, leitura do status real (nunca confiar no
// corpo do webhook) e idempotência do lado do gateway real.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const dir = mkdtempSync(path.join(tmpdir(), 'reformify-teste-mp-'));
process.env.LANDING_DADOS_DIR = dir;
process.env.LANDING_PORT = '0';
process.env.PORT = '0';
process.env.LANDING_PREVIEW = 'true';
process.env.CHECKOUT_MODO = 'producao';
process.env.CHECKOUT_PROVEDOR = 'mercadopago';
process.env.MERCADOPAGO_ACCESS_TOKEN = 'TEST-fake-token';

let falhas = 0;
let total = 0;
function checar(nome, condicao) {
  total++;
  if (!condicao) {
    falhas++;
    console.error(`FALHA: ${nome}`);
  }
}

const chamadas = [];
const fetchReal = globalThis.fetch;
function instalarMockMercadoPago() {
  globalThis.fetch = async (url, opts = {}) => {
    if (!String(url).startsWith('https://api.mercadopago.com')) return fetchReal(url, opts);
    chamadas.push({ url: String(url), opts });
    if (/\/preapproval\/[^/]+$/.test(String(url))) {
      return { ok: true, json: async () => ({ status: 'authorized', external_reference: 'sessao-mp-1' }), text: async () => '' };
    }
    if (String(url).endsWith('/preapproval')) {
      return { ok: true, json: async () => ({ id: 'mp-preap-123', init_point: 'https://www.mercadopago.com/checkout/fake' }), text: async () => '' };
    }
    throw new Error(`fetch mockado chamado com url inesperada: ${url}`);
  };
}
instalarMockMercadoPago();

async function main() {
  const { criarAssinatura, consultarAssinatura } = await import('../src/landing/mercadopago.js');

  // --- criarAssinatura: forma do request e do resultado ---
  const plano = { nome: 'Plano Escritório', precoMes: 897 };
  const criada = await criarAssinatura({
    sessaoId: 'sess-x',
    plano,
    email: 'ana@escritorio.com.br',
    backUrl: 'https://reformify-landing.onrender.com/',
  });
  checar('criarAssinatura devolve gatewayId', criada.gatewayId === 'mp-preap-123');
  checar('criarAssinatura devolve initPoint do Mercado Pago', criada.initPoint === 'https://www.mercadopago.com/checkout/fake');

  const chamadaCriar = chamadas[0];
  checar('POST vai para /preapproval', chamadaCriar.url === 'https://api.mercadopago.com/preapproval');
  checar('Authorization Bearer com o token do ambiente', chamadaCriar.opts.headers.Authorization === 'Bearer TEST-fake-token');
  const corpoCriar = JSON.parse(chamadaCriar.opts.body);
  checar('external_reference é a sessão local (não um id do Mercado Pago)', corpoCriar.external_reference === 'sess-x');
  checar('valor cobrado vem do plano da oferta, não de input externo', corpoCriar.auto_recurring.transaction_amount === 897);
  checar('moeda BRL e cobrança mensal', corpoCriar.auto_recurring.currency_id === 'BRL' && corpoCriar.auto_recurring.frequency_type === 'months');

  // --- consultarAssinatura: nunca confia em status enviado por fora ---
  const consultada = await consultarAssinatura('mp-preap-999');
  checar('consultarAssinatura lê o status real da API (authorized)', consultada.status === 'authorized');
  checar('consultarAssinatura devolve a external_reference para achar a sessão local', consultada.externalReference === 'sessao-mp-1');

  // --- erro do gateway não é engolido ---
  const chamadasAntes = chamadas.length;
  globalThis.fetch = async () => ({ ok: false, status: 401, text: async () => 'invalid token' });
  let erroCapturado = null;
  try {
    await criarAssinatura({ sessaoId: 'sess-y', plano, email: 'x@x.com' });
  } catch (e) {
    erroCapturado = e;
  }
  checar('token inválido/erro do gateway vira exceção visível (não sessão fantasma)', erroCapturado?.message.includes('mercadopago (criar) respondeu 401'));
  instalarMockMercadoPago();
  checar('nenhuma chamada extra vazou durante o teste de erro', chamadas.length === chamadasAntes);

  // --- Webhook end-to-end: servidor real, sessão pré-existente, notificação do Mercado Pago ---
  const { criarServidor } = await import('../src/landing/servidor.js');
  const servidor = criarServidor();
  await new Promise((resolve) => servidor.listen(0, '127.0.0.1', resolve));
  const { port } = servidor.address();
  const base = `http://127.0.0.1:${port}`;

  // Insere a sessão direto no banco — o gate de produção de iniciarSessao
  // (ACE-6) segue testado à parte e continua bloqueando; aqui simulamos o
  // estado de "assinatura já criada no Mercado Pago, esperando confirmação".
  const dbSessoes = new DatabaseSync(path.join(dir, 'checkout.db'));
  dbSessoes.prepare(
    'INSERT INTO sessoes (id, plano, email, nome, status, criado_em, gateway_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run('sessao-mp-1', 'escritorio', 'ana@escritorio.com.br', 'Ana Contadora', 'pendente', new Date().toISOString(), 'mp-preap-999');

  const webhook1 = await fetch(`${base}/checkout/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'notif-abc', type: 'subscription_preapproval', data: { id: 'mp-preap-999' } }),
  });
  const webhook1Body = await webhook1.json();
  checar('webhook do Mercado Pago libera a sessão certa via external_reference (não confia no corpo)', webhook1Body.sessao?.id === 'sessao-mp-1' && webhook1Body.sessao?.status === 'pago');
  checar('e-mail de boas-vindas disparado na confirmação real', webhook1Body.email?.enviado === true);

  const webhook2 = await fetch(`${base}/checkout/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'notif-abc', type: 'subscription_preapproval', data: { id: 'mp-preap-999' } }),
  });
  const webhook2Body = await webhook2.json();
  checar('notificação repetida do Mercado Pago não cobra/libera de novo', webhook2Body.duplicado === true);

  const webhookSemDataId = await fetch(`${base}/checkout/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'notif-invalida' }),
  });
  checar('notificação sem data.id é rejeitada (400), não derruba o servidor', webhookSemDataId.status === 400);

  servidor.close();
  rmSync(dir, { recursive: true, force: true });

  console.log(`\n${total - falhas}/${total} verificações passaram.`);
  if (falhas > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
