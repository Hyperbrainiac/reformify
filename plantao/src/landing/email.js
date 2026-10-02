import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import { oferta, RODAPE_OBRIGATORIO } from '../oferta.js';

mkdirSync(config.dadosDir, { recursive: true });
const db = new DatabaseSync(path.join(config.dadosDir, 'emails.db'));

db.exec(`
CREATE TABLE IF NOT EXISTS emails_enviados (
  sessao_id TEXT PRIMARY KEY,
  destinatario TEXT NOT NULL,
  status TEXT NOT NULL,
  enviado_em TEXT NOT NULL
);
`);

function montarBoasVindas(sessao) {
  const plano = oferta.planos[sessao.plano];
  const assunto = `Pagamento confirmado — acesso ao ${plano.nome} liberado`;
  const corpo = [
    `Oi, ${sessao.nome}.`,
    '',
    `Seu pagamento do ${plano.nome} (R$ ${plano.precoMes}/mês) foi confirmado e o seu acesso já está liberado.`,
    '',
    `Prazo de resposta: ${plano.prazoResposta} (1ª confirmação em ${plano.aceite}).`,
    `Garantia: estourou o prazo prometido no primeiro mês, devolvemos o mês; cancelou nos primeiros ${oferta.garantia.diasArrependimento} dias, devolvemos 100%.`,
    '',
    'Em breve alguém do time entra em contato pelo mesmo WhatsApp/Telegram informado para liberar o canal do plantão.',
    '',
    RODAPE_OBRIGATORIO,
    'Para sair da nossa lista, responda SAIR em qualquer mensagem.',
  ].join('\n');
  return { assunto, corpo };
}

// Provedor real só entra com RESEND_API_KEY setado via secret (nunca em arquivo).
// Sem a chave, cai no provedor simulado — mesmo padrão do checkout sandbox.
async function despacharEmail({ destinatario, assunto, corpo }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // eslint-disable-next-line no-console
    console.log(`[email:simulado] para=${destinatario} assunto="${assunto}"\n${corpo}\n`);
    return { ok: true, provedor: 'simulado' };
  }

  const resposta = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM || 'Reformify <plantao@ace.ai>',
      to: [destinatario],
      subject: assunto,
      text: corpo,
    }),
  });

  if (!resposta.ok) {
    const detalhe = await resposta.text().catch(() => '');
    throw new Error(`resend respondeu ${resposta.status}: ${detalhe}`);
  }
  return { ok: true, provedor: 'resend' };
}

function jaEnviado(sessaoId) {
  return db.prepare('SELECT 1 FROM emails_enviados WHERE sessao_id = ?').get(sessaoId);
}

// Idempotência independente da do webhook: mesmo que o gateway reenvie o
// evento com um event_id novo, o e-mail de boas-vindas só sai uma vez por sessão.
export async function enviarBoasVindas(sessao) {
  if (jaEnviado(sessao.id)) {
    return { enviado: false, duplicado: true };
  }

  const { assunto, corpo } = montarBoasVindas(sessao);
  try {
    const resultado = await despacharEmail({ destinatario: sessao.email, assunto, corpo });
    db.prepare(
      'INSERT INTO emails_enviados (sessao_id, destinatario, status, enviado_em) VALUES (?, ?, ?, ?)'
    ).run(sessao.id, sessao.email, resultado.provedor, new Date().toISOString());
    return { enviado: true, duplicado: false, provedor: resultado.provedor };
  } catch (e) {
    // Falha visível: fica no /saude para a Bia acompanhar. Não derruba o
    // webhook de pagamento — o acesso já foi liberado, o e-mail pode ser reenviado à mão.
    // eslint-disable-next-line no-console
    console.error(`[email] falha ao enviar boas-vindas — sessão=${sessao.id} erro=${e.message}`);
    db.prepare(
      'INSERT INTO emails_enviados (sessao_id, destinatario, status, enviado_em) VALUES (?, ?, ?, ?)'
    ).run(sessao.id, sessao.email, 'falhou', new Date().toISOString());
    return { enviado: false, duplicado: false, erro: e.message };
  }
}

export function resumoEmail() {
  const total = db.prepare('SELECT COUNT(*) as n FROM emails_enviados').get().n;
  const falhas = db.prepare("SELECT COUNT(*) as n FROM emails_enviados WHERE status = 'falhou'").get().n;
  return { total, falhas };
}
