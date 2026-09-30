import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { config } from '../config.js';
import { oferta, PUBLICACAO_LIBERADA_CEO } from '../oferta.js';

mkdirSync(config.dadosDir, { recursive: true });
const db = new DatabaseSync(path.join(config.dadosDir, 'checkout.db'));

db.exec(`
CREATE TABLE IF NOT EXISTS sessoes (
  id TEXT PRIMARY KEY,
  plano TEXT NOT NULL,
  status TEXT NOT NULL,
  criado_em TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS eventos_webhook (
  event_id TEXT PRIMARY KEY,
  sessao_id TEXT NOT NULL,
  processado_em TEXT NOT NULL
);
`);

export class CheckoutProducaoBloqueadoError extends Error {}

export function iniciarSessao(planoId) {
  if (!oferta.planos[planoId]) {
    throw new Error(`plano desconhecido: ${planoId}`);
  }
  if (config.checkout.modo === 'producao' && !PUBLICACAO_LIBERADA_CEO) {
    // Idempotência de cobrança / caminho do dinheiro: nunca cobra real sem o
    // gate do CEO (ACE-6). O guard vive aqui, não na landing.
    throw new CheckoutProducaoBloqueadoError(
      'Cobrança real bloqueada até o CEO liberar em ACE-6 (PUBLICACAO_LIBERADA_CEO=false).'
    );
  }

  const id = crypto.randomUUID();
  db.prepare('INSERT INTO sessoes (id, plano, status, criado_em) VALUES (?, ?, ?, ?)').run(
    id,
    planoId,
    'pendente',
    new Date().toISOString()
  );
  return { id, plano: oferta.planos[planoId] };
}

export function obterSessao(id) {
  return db.prepare('SELECT * FROM sessoes WHERE id = ?').get(id);
}

// Idempotência de cobrança: o mesmo event_id nunca paga a sessão duas vezes,
// mesmo que o provedor (real ou simulado) reenvie o webhook.
export function processarWebhookPagamento(sessaoId, eventId) {
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

  if (sessao.status !== 'pago') {
    db.prepare("UPDATE sessoes SET status = 'pago' WHERE id = ?").run(sessaoId);
  }

  return { sessao: obterSessao(sessaoId), duplicado: false };
}

export function contarEventosWebhook() {
  return db.prepare('SELECT COUNT(*) as n FROM eventos_webhook').get().n;
}
