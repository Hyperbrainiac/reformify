import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { config } from '../config.js';
import { oferta, PUBLICACAO_LIBERADA_CEO } from '../oferta.js';
import { criarAssinatura } from './mercadopago.js';

mkdirSync(config.dadosDir, { recursive: true });
const db = new DatabaseSync(path.join(config.dadosDir, 'checkout.db'));

db.exec(`
CREATE TABLE IF NOT EXISTS sessoes (
  id TEXT PRIMARY KEY,
  plano TEXT NOT NULL,
  email TEXT NOT NULL,
  nome TEXT NOT NULL,
  status TEXT NOT NULL,
  criado_em TEXT NOT NULL,
  gateway_id TEXT
);
CREATE TABLE IF NOT EXISTS eventos_webhook (
  event_id TEXT PRIMARY KEY,
  sessao_id TEXT NOT NULL,
  processado_em TEXT NOT NULL
);
`);

export class CheckoutProducaoBloqueadoError extends Error {}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Sem e-mail não há para onde mandar o acesso depois do pagamento — o
// gateway cobra, mas ninguém entra no plantão. Bloqueado aqui, não na landing.
export async function iniciarSessao(planoId, dadosCliente = {}) {
  if (!oferta.planos[planoId]) {
    throw new Error(`plano desconhecido: ${planoId}`);
  }
  if (config.checkout.modo === 'producao' && !PUBLICACAO_LIBERADA_CEO) {
    // Idempotência de cobrança / caminho do dinheiro: nunca cobra real sem o
    // gate do CEO (ACE-6). O guard vive aqui, não na landing — e vem antes de
    // qualquer validação de payload, porque produção bloqueada é sempre um 403.
    throw new CheckoutProducaoBloqueadoError(
      'Cobrança real bloqueada até o CEO liberar em ACE-6 (PUBLICACAO_LIBERADA_CEO=false).'
    );
  }
  const email = (dadosCliente.email || '').trim();
  const nome = (dadosCliente.nome || '').trim();
  if (!nome) {
    throw new Error('nome obrigatório para iniciar o checkout');
  }
  if (!EMAIL_REGEX.test(email)) {
    throw new Error('e-mail inválido ou ausente para iniciar o checkout');
  }

  const id = crypto.randomUUID();
  const plano = oferta.planos[planoId];
  db.prepare('INSERT INTO sessoes (id, plano, email, nome, status, criado_em) VALUES (?, ?, ?, ?, ?, ?)').run(
    id,
    planoId,
    email,
    nome,
    'pendente',
    new Date().toISOString()
  );

  if (config.checkout.modo === 'producao' && config.checkout.provedor === 'mercadopago') {
    // Único ramo que fala com o gateway de verdade — só chega aqui com o gate
    // do CEO já liberado (checagem acima). Sandbox nunca passa por aqui.
    try {
      const { gatewayId, initPoint } = await criarAssinatura({
        sessaoId: id,
        plano,
        email,
        backUrl: config.urlBase ? `${config.urlBase}/` : undefined,
      });
      db.prepare('UPDATE sessoes SET gateway_id = ? WHERE id = ?').run(gatewayId, id);
      return { id, plano, initPoint };
    } catch (e) {
      db.prepare("UPDATE sessoes SET status = 'falhou' WHERE id = ?").run(id);
      throw e;
    }
  }

  return { id, plano };
}

export function obterSessao(id) {
  return db.prepare('SELECT * FROM sessoes WHERE id = ?').get(id);
}

// Idempotência de cobrança: o mesmo event_id nunca paga (nem falha) a sessão
// duas vezes, mesmo que o provedor (real ou simulado) reenvie o webhook.
export function processarWebhookPagamento(sessaoId, eventId, statusEvento = 'aprovado') {
  const sessao = obterSessao(sessaoId);
  if (!sessao) {
    throw new Error(`sessão inexistente: ${sessaoId}`);
  }

  const jaProcessado = db.prepare('SELECT 1 FROM eventos_webhook WHERE event_id = ?').get(eventId);
  if (jaProcessado) {
    return { sessao, duplicado: true };
  }

  db.prepare('INSERT INTO eventos_webhook (event_id, sessao_id, processado_em) VALUES (?, ?, ?)').run(
    eventId,
    sessaoId,
    new Date().toISOString()
  );

  const statusFinal = statusEvento === 'aprovado' ? 'pago' : 'falhou';
  if (sessao.status !== 'pago') {
    db.prepare('UPDATE sessoes SET status = ? WHERE id = ?').run(statusFinal, sessaoId);
  }
  if (statusFinal === 'falhou') {
    // Falha visível: fica no /saude para a Bia acompanhar, não só no log.
    // eslint-disable-next-line no-console
    console.error(`[checkout] pagamento falhou — sessão=${sessaoId} evento=${eventId}`);
  }

  return { sessao: obterSessao(sessaoId), duplicado: false };
}

export function contarEventosWebhook() {
  return db.prepare('SELECT COUNT(*) as n FROM eventos_webhook').get().n;
}

export function resumoCheckout() {
  const total = db.prepare('SELECT COUNT(*) as n FROM sessoes').get().n;
  const pagas = db.prepare("SELECT COUNT(*) as n FROM sessoes WHERE status = 'pago'").get().n;
  const falhas = db.prepare("SELECT COUNT(*) as n FROM sessoes WHERE status = 'falhou'").get().n;
  return { total, pagas, falhas };
}
