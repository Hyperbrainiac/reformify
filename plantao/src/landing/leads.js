import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';

mkdirSync(config.dadosDir, { recursive: true });
const db = new DatabaseSync(path.join(config.dadosDir, 'leads.db'));

db.exec(`
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  email TEXT NOT NULL,
  escritorio TEXT NOT NULL,
  carteira TEXT NOT NULL,
  duvida TEXT NOT NULL,
  autoriza_contato INTEGER NOT NULL,
  origem TEXT NOT NULL,
  criado_em TEXT NOT NULL
);
`);

const CAMPOS_FISCAIS_PROIBIDOS = ['cpf', 'cnpj', 'faturamento', 'apuracao', 'sped'];

export function inserirLead(dados, origem) {
  for (const campo of CAMPOS_FISCAIS_PROIBIDOS) {
    if (campo in dados) {
      throw new Error(`campo fiscal proibido no formulário: ${campo}`);
    }
  }

  const stmt = db.prepare(`
    INSERT INTO leads (nome, whatsapp, email, escritorio, carteira, duvida, autoriza_contato, origem, criado_em)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(
    dados.nome,
    dados.whatsapp,
    dados.email,
    dados.escritorio,
    dados.carteira,
    dados.duvida,
    dados.autoriza ? 1 : 0,
    origem || 'landing',
    new Date().toISOString()
  );
  return info.lastInsertRowid;
}

export function listarLeads() {
  return db.prepare('SELECT * FROM leads ORDER BY id DESC').all();
}

export function contarLeads() {
  return db.prepare('SELECT COUNT(*) as n FROM leads').get().n;
}
