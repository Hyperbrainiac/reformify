// Registro de conversa do plantão (ACE-4) + instrumentação de SLA (ACE-14).
// Uma linha por pergunta: quem perguntou, o quê, quando entrou, quando foi o
// aceite, quando saiu a resposta com fonte, e se estourou o prazo útil. Este
// registro é ativo da empresa — a Bia e a Marina trabalham em cima dele, não
// é log de depuração.
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import { oferta } from '../oferta.js';
import { horasUteisEntre, somarHorasUteis, estourou } from './sla.js';

mkdirSync(config.dadosDir, { recursive: true });
const db = new DatabaseSync(path.join(config.dadosDir, 'canal.db'));

db.exec(`
CREATE TABLE IF NOT EXISTS mensagens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  canal TEXT NOT NULL DEFAULT 'telegram',
  chat_id TEXT NOT NULL,
  cliente_nome TEXT NOT NULL,
  plano TEXT,
  pergunta TEXT NOT NULL,
  entrada_em TEXT NOT NULL,
  staff_msg_id TEXT,
  aceite_texto TEXT,
  aceite_em TEXT,
  resposta_fonte_texto TEXT,
  resposta_fonte_em TEXT,
  escalou_marina INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS updates_processados (
  update_id INTEGER PRIMARY KEY,
  processado_em TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS onboarding_enviado (
  chat_id TEXT PRIMARY KEY,
  enviado_em TEXT NOT NULL
);
`);

// Idempotência de entrega: o Telegram reenvia updates que não foram
// confirmados a tempo. Sem isto, a mesma pergunta vira duas linhas e o
// aceite/resposta duplica para o cliente.
export function jaProcessadoUpdate(updateId) {
  return Boolean(db.prepare('SELECT 1 FROM updates_processados WHERE update_id = ?').get(updateId));
}

export function marcarUpdateProcessado(updateId) {
  db.prepare('INSERT OR IGNORE INTO updates_processados (update_id, processado_em) VALUES (?, ?)').run(
    updateId,
    new Date().toISOString()
  );
}

export function jaTeveOnboarding(chatId) {
  return Boolean(db.prepare('SELECT 1 FROM onboarding_enviado WHERE chat_id = ?').get(chatId));
}

export function marcarOnboarding(chatId) {
  db.prepare('INSERT OR IGNORE INTO onboarding_enviado (chat_id, enviado_em) VALUES (?, ?)').run(
    chatId,
    new Date().toISOString()
  );
}

export function registrarPergunta({ chatId, clienteNome, pergunta, plano = null }) {
  const info = db
    .prepare(
      'INSERT INTO mensagens (chat_id, cliente_nome, plano, pergunta, entrada_em) VALUES (?, ?, ?, ?, ?)'
    )
    .run(chatId, clienteNome, plano, pergunta, new Date().toISOString());
  return Number(info.lastInsertRowid);
}

export function definirStaffMsgId(mensagemId, staffMsgId) {
  db.prepare('UPDATE mensagens SET staff_msg_id = ? WHERE id = ?').run(staffMsgId, mensagemId);
}

export function obterMensagemPorStaffMsgId(staffMsgId) {
  return db
    .prepare('SELECT * FROM mensagens WHERE staff_msg_id = ? ORDER BY id DESC LIMIT 1')
    .get(staffMsgId);
}

export function obterMensagem(id) {
  return db.prepare('SELECT * FROM mensagens WHERE id = ?').get(id);
}

export function marcarAceite(mensagemId, texto) {
  db.prepare('UPDATE mensagens SET aceite_texto = ?, aceite_em = ? WHERE id = ?').run(
    texto,
    new Date().toISOString(),
    mensagemId
  );
}

// resultado é calculado contra o prazo do plano — se o plano ainda não foi
// identificado (cliente não ligado a uma sessão de checkout), usa o prazo
// mais curto (Escritório) para não deixar passar um estouro de verdade.
export function marcarRespostaFonte(mensagemId, texto, { escalouMarina = false } = {}) {
  const agora = new Date().toISOString();
  db.prepare(
    'UPDATE mensagens SET resposta_fonte_texto = ?, resposta_fonte_em = ?, escalou_marina = ? WHERE id = ?'
  ).run(texto, agora, escalouMarina ? 1 : 0, mensagemId);
  return obterMensagem(mensagemId);
}

function prazoRespostaHoras(planoId) {
  const plano = oferta.planos[planoId] || oferta.planos.escritorio;
  return parseFloat(plano.prazoResposta);
}

export function pendentes() {
  return db.prepare('SELECT * FROM mensagens WHERE resposta_fonte_em IS NULL ORDER BY entrada_em ASC').all();
}

// Falha visível (ACE-14 item 4): lista quem já passou da metade do prazo útil
// sem resposta com fonte — é o que evita o estouro, em vez de só constatar
// depois no relatório mensal.
export function alertasMetadeSla(agoraIso = new Date().toISOString()) {
  return pendentes()
    .map((m) => {
      const prazo = prazoRespostaHoras(m.plano);
      const metadeIso = somarHorasUteis(m.entrada_em, prazo / 2);
      const horasDecorridas = horasUteisEntre(m.entrada_em, agoraIso);
      return { ...m, prazoHoras: prazo, metadeEm: metadeIso, horasUteisDecorridas: horasDecorridas };
    })
    .filter((m) => m.horasUteisDecorridas >= m.prazoHoras / 2);
}

export function contarMensagens() {
  return db.prepare('SELECT COUNT(*) as n FROM mensagens').get().n;
}

export function contarPendentes() {
  return db.prepare('SELECT COUNT(*) as n FROM mensagens WHERE resposta_fonte_em IS NULL').get().n;
}

// Relatório mensal por cliente (ACE-14 item 5): base da devolução automática
// e insumo do painel de MRR/churn da ACE-7.
export function relatorioMensal(mesIso) {
  const linhas = db
    .prepare("SELECT * FROM mensagens WHERE substr(entrada_em, 1, 7) = ? ORDER BY chat_id, entrada_em")
    .all(mesIso);

  const porCliente = new Map();
  for (const m of linhas) {
    if (!porCliente.has(m.chat_id)) {
      porCliente.set(m.chat_id, {
        chatId: m.chat_id,
        clienteNome: m.cliente_nome,
        perguntas: 0,
        comAceite: 0,
        comRespostaFonte: 0,
        estourou: 0,
        tempoAceiteHorasTotal: 0,
        tempoRespostaHorasTotal: 0,
      });
    }
    const agg = porCliente.get(m.chat_id);
    agg.perguntas += 1;
    const prazo = prazoRespostaHoras(m.plano);
    if (m.aceite_em) {
      agg.comAceite += 1;
      agg.tempoAceiteHorasTotal += horasUteisEntre(m.entrada_em, m.aceite_em);
    }
    if (m.resposta_fonte_em) {
      agg.comRespostaFonte += 1;
      agg.tempoRespostaHorasTotal += horasUteisEntre(m.entrada_em, m.resposta_fonte_em);
      if (estourou(m.entrada_em, m.resposta_fonte_em, prazo)) agg.estourou += 1;
    }
  }

  return Array.from(porCliente.values()).map((agg) => ({
    ...agg,
    tempoMedioAceiteHoras: agg.comAceite ? agg.tempoAceiteHorasTotal / agg.comAceite : null,
    tempoMedioRespostaHoras: agg.comRespostaFonte ? agg.tempoRespostaHorasTotal / agg.comRespostaFonte : null,
  }));
}
