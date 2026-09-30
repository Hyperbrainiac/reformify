// Teste ponta a ponta: sobe o servidor real (sem mock) e bate nas rotas com fetch.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const dir = mkdtempSync(path.join(tmpdir(), 'reformify-teste-'));
process.env.LANDING_DADOS_DIR = dir;
process.env.LANDING_PORT = '0';
process.env.PORT = '0';

let falhas = 0;
let total = 0;

function checar(nome, condicao) {
  total++;
  if (!condicao) {
    falhas++;
    console.error(`FALHA: ${nome}`);
  }
}

async function main() {
  process.env.LANDING_PREVIEW = 'true';
  const { criarServidor } = await import('../src/landing/servidor.js');
  const servidor = criarServidor();
  await new Promise((resolve) => servidor.listen(0, '127.0.0.1', resolve));
  const { port } = servidor.address();
  const base = `http://127.0.0.1:${port}`;

  // --- Preview / noindex ---
  const home = await fetch(`${base}/`);
  const html = await home.text();
  checar('home responde 200', home.status === 200);
  checar('noindex no header em modo preview', home.headers.get('x-robots-tag')?.includes('noindex'));
  checar('noindex na meta tag em modo preview', html.includes('noindex'));

  const robots = await fetch(`${base}/robots.txt`);
  const robotsTxt = await robots.text();
  checar('robots.txt bloqueia em preview', robotsTxt.includes('Disallow: /'));

  // --- Seções e conteúdo ---
  checar('H1 presente', html.includes('Seu cliente perguntou sobre a Reforma'));
  checar('seção PROVA sem rótulo de tempo fabricado', !html.includes('Resposta enviada em 2h47') && !html.includes('Pergunta recebida'));
  checar('seção PROVA com resposta-modelo real', html.includes('Simples Nacional'));
  checar('seção O PRAZO, POR EXTENSO presente', html.includes('O prazo, por extenso'));
  checar('tabela de planos com os dois preços', html.includes('R$ 297') && html.includes('R$ 897'));
  checar('10 vagas da Turma Fundadora', html.includes('10 vagas'));
  checar('resumo mensal escrito presente (v3)', html.includes('Resumo mensal escrito'));
  checar('encontro ao vivo ausente (removido na v3)', !html.includes('Encontro ao vivo'));
  checar('norma de referência citada (não "artigo da lei citado" nos 5 pontos v3)', html.includes('norma de referência'));
  checar('nenhum placeholder MARINA/BIA', !/⚠️\s*(MARINA|BIA)/.test(html));
  const perguntasFaq = html.match(/<summary>/g) || [];
  checar('FAQ com 13 perguntas', perguntasFaq.length === 13);
  checar('formulário sem CPF/CNPJ/faturamento', !/name="(cpf|cnpj|faturamento)"/i.test(html));
  checar('rodapé obrigatório de disclaimer presente', html.includes('não é consultoria contábil nem parecer jurídico'));

  // --- Publicação (LANDING_PREVIEW=false) ---
  // Precisa de outro processo porque config é lido no import; testamos via processo filho.

  // --- Formulário / lead ---
  const corpoLead = new URLSearchParams({
    nome: 'Ana Contadora',
    whatsapp: '11999998888',
    email: 'ana@escritorio.com.br',
    escritorio: 'Ana Contabilidade',
    carteira: '21–50',
    duvida: 'Preciso saber se meu cliente do Simples precisa destacar IBS/CBS na nota.',
    autoriza: 'on',
  });
  const respLead = await fetch(`${base}/api/lead`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: corpoLead.toString(),
  });
  checar('lead válido aceito (201)', respLead.status === 201);

  const saudeDepoisLead = await fetch(`${base}/saude`).then((r) => r.json());
  checar('lead gravado (contador incrementou)', saudeDepoisLead.leads === 1);
  checar('sem pendências (v3 fechou os placeholders)', Array.isArray(saudeDepoisLead.pendencias) && saudeDepoisLead.pendencias.length === 0);

  const corpoLeadInvalido = new URLSearchParams({ nome: 'Sem resto' });
  const respLeadInvalido = await fetch(`${base}/api/lead`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: corpoLeadInvalido.toString(),
  });
  checar('lead incompleto rejeitado (400)', respLeadInvalido.status === 400);

  // --- Checkout sandbox: sem e-mail não inicia ---
  const sessaoSemEmail = await fetch(`${base}/checkout/iniciar?plano=escritorio`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome: 'Ana Contadora' }),
  });
  checar('checkout sem e-mail é rejeitado (400)', sessaoSemEmail.status === 400);

  // --- Checkout sandbox + webhook idempotente (pagamento e e-mail) ---
  const sessaoResp = await fetch(`${base}/checkout/iniciar?plano=escritorio`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome: 'Ana Contadora', email: 'ana@contabilidaderibeiro.com.br' }),
  });
  const sessao = await sessaoResp.json();
  checar('sessão de checkout sandbox criada', sessaoResp.status === 201 && sessao.id);
  checar('valor vem da oferta, não do cliente', sessao.plano.precoMes === 897);

  const eventId = 'evt_teste_1';
  const webhook1 = await fetch(`${base}/checkout/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessaoId: sessao.id, eventId, status: 'aprovado' }),
  });
  const webhook1Body = await webhook1.json();
  checar('webhook paga a sessão', webhook1.status === 200 && webhook1Body.sessao.status === 'pago' && webhook1Body.duplicado === false);
  checar('e-mail de boas-vindas disparado na liberação', webhook1Body.email?.enviado === true);

  const webhook2 = await fetch(`${base}/checkout/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessaoId: sessao.id, eventId, status: 'aprovado' }),
  });
  const webhook2Body = await webhook2.json();
  checar('webhook repetido não cobra de novo (idempotência)', webhook2.status === 200 && webhook2Body.duplicado === true);

  const webhook3 = await fetch(`${base}/checkout/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessaoId: sessao.id, eventId: 'evt_teste_2', status: 'aprovado' }),
  });
  const webhook3Body = await webhook3.json();
  checar('evento novo pós-liberação não reenvia e-mail', webhook3Body.email?.duplicado === true);

  // --- Falha de pagamento visível (Bia acompanha pelo /saude) ---
  const sessaoFalhaResp = await fetch(`${base}/checkout/iniciar?plano=plantao`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome: 'Bruno Contador', email: 'bruno@escritorio.com.br' }),
  });
  const sessaoFalha = await sessaoFalhaResp.json();
  await fetch(`${base}/checkout/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessaoId: sessaoFalha.id, eventId: 'evt_falha_1', status: 'recusado' }),
  });

  const saudeFinal = await fetch(`${base}/saude`).then((r) => r.json());
  checar('checkout: 2 sessões pagas registradas', saudeFinal.checkout.resumo.pagas === 1);
  checar('falha de pagamento visível no /saude para a Bia', saudeFinal.checkout.resumo.falhas === 1);
  checar('exatamente 1 e-mail de boas-vindas enviado', saudeFinal.email.total === 1);

  servidor.close();

  // --- Guard de produção + publicação (processo filho, env limpo) ---
  const { execFileSync } = await import('node:child_process');
  const dirProducao = mkdtempSync(path.join(tmpdir(), 'reformify-teste-prod-'));
  try {
    const saidaGuard = execFileSync(
      process.execPath,
      ['-e', `
        process.env.LANDING_DADOS_DIR = ${JSON.stringify(dirProducao)};
        const { iniciarSessao, CheckoutProducaoBloqueadoError } = await import('${new URL('../src/landing/checkout.js', import.meta.url)}');
        try {
          iniciarSessao('escritorio');
          console.log('NAO_BLOQUEOU');
        } catch (e) {
          console.log(e instanceof CheckoutProducaoBloqueadoError ? 'BLOQUEOU' : 'ERRO_ERRADO:' + e.message);
        }
      `, '--input-type=module'],
      { env: { ...process.env, CHECKOUT_MODO: 'producao', LANDING_PREVIEW: 'true' }, encoding: 'utf8' }
    ).trim();
    checar('checkout em modo produção é bloqueado sem liberação do CEO (ACE-6)', saidaGuard === 'BLOQUEOU');

    const saidaPublicado = execFileSync(
      process.execPath,
      ['-e', `
        const { config } = await import('${new URL('../src/config.js', import.meta.url)}');
        console.log(JSON.stringify({ preview: config.preview }));
      `, '--input-type=module'],
      { env: { ...process.env, LANDING_PREVIEW: 'false' }, encoding: 'utf8' }
    ).trim();
    checar('LANDING_PREVIEW=false tira o preview (config)', JSON.parse(saidaPublicado).preview === false);
  } finally {
    rmSync(dirProducao, { recursive: true, force: true });
  }

  rmSync(dir, { recursive: true, force: true });

  console.log(`\n${total - falhas}/${total} verificações passaram.`);
  if (falhas > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
