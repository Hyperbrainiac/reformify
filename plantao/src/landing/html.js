import { copy, CAMPOS_FORMULARIO } from './copy.js';

const CAMPO_NOME = CAMPOS_FORMULARIO.find((c) => c.nome === 'nome');
const CAMPO_EMAIL = CAMPOS_FORMULARIO.find((c) => c.nome === 'email');
import { oferta } from '../oferta.js';

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

const CSS = `
:root{--bg:#0b0f14;--bg-soft:#0f1520;--fg:#e9edf1;--muted:#9aa7b2;--accent:#2fd06a;--accent-2:#22b8d8;--accent-fg:#06210f;--card:#131a22;--border:#22303b;font-size:16px}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font-family:-apple-system,system-ui,Segoe UI,Roboto,Arial,sans-serif;line-height:1.5}
.wrap{max-width:720px;margin:0 auto;padding:0 20px}
.topo{padding:20px 0;display:flex;align-items:center;gap:10px}
.marca{display:flex;align-items:center;gap:8px;font-weight:800;font-size:1.15rem;letter-spacing:-.02em;color:var(--fg);text-decoration:none}
.marca .ponto{width:10px;height:10px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent-2));flex:none}
header.hero{position:relative;padding:28px 0 36px;text-align:left;border-radius:16px;overflow:hidden}
header.hero::before{content:"";position:absolute;inset:-40% -10% auto -10%;height:260px;background:radial-gradient(60% 100% at 30% 0%,rgba(47,208,106,.22),transparent 70%),radial-gradient(50% 100% at 90% 10%,rgba(34,184,216,.16),transparent 70%);pointer-events:none;z-index:0}
header.hero>*{position:relative;z-index:1}
.selo{display:inline-block;background:var(--card);border:1px solid var(--border);color:var(--accent);font-size:.78rem;font-weight:700;letter-spacing:.02em;padding:5px 12px;border-radius:999px;margin-bottom:14px}
h1{font-size:1.9rem;line-height:1.25;margin:0 0 16px;letter-spacing:-.01em}
.subhead{color:var(--muted);font-size:1.05rem;margin:0 0 24px}
section{padding:32px 0;border-top:1px solid var(--border)}
section h2{font-size:1.4rem;margin:0 0 16px;letter-spacing:-.01em}
.btn{display:inline-block;width:100%;text-align:center;background:var(--accent);color:var(--accent-fg);font-weight:700;padding:16px 20px;border-radius:10px;text-decoration:none;font-size:1.05rem;min-height:44px;border:none;cursor:pointer;box-shadow:0 8px 20px -10px rgba(47,208,106,.55);transition:transform .15s ease,box-shadow .15s ease}
.btn:hover{transform:translateY(-1px);box-shadow:0 10px 24px -8px rgba(47,208,106,.6)}
.btn.secundario{background:transparent;color:var(--fg);border:1px solid var(--border);box-shadow:none}
.btn-apoio{color:var(--muted);font-size:.9rem;margin-top:10px;text-align:center}
.passo{margin-bottom:20px;padding:14px 16px;background:var(--card);border:1px solid var(--border);border-radius:10px}
.passo b{display:block;margin-bottom:4px;color:var(--accent)}
blockquote{border-left:3px solid var(--accent);margin:16px 0;padding:4px 0 4px 16px;color:var(--fg)}
blockquote p{margin:0 0 12px}
.pergunta-real{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:16px;margin-bottom:16px;font-style:italic}
.fonte-verificacao{color:var(--muted);font-size:.85rem;margin-top:12px}
.rodape-disclaimer{color:var(--muted);font-size:.8rem;border-top:1px dashed var(--border);margin-top:16px;padding-top:12px}
table.planos{width:100%;border-collapse:collapse;margin:16px 0;font-size:.92rem;border-radius:10px;overflow:hidden}
table.planos th,table.planos td{border:1px solid var(--border);padding:10px 8px;text-align:left;vertical-align:top}
table.planos th{background:var(--card)}
table.planos th:nth-child(3){background:linear-gradient(180deg,rgba(47,208,106,.18),var(--card));color:var(--fg)}
table.planos td:nth-child(3){background:rgba(47,208,106,.05)}
.preco{font-size:1.3rem;font-weight:700;color:var(--accent)}
.cta-grupo{display:flex;flex-direction:column;gap:10px;margin-top:20px}
ul.check{list-style:none;padding:0;margin:0}
ul.check li{padding:8px 0 8px 28px;position:relative}
ul.check li::before{content:"—";position:absolute;left:0;color:var(--accent)}
details{border:1px solid var(--border);border-radius:8px;margin-bottom:10px;padding:4px 12px;background:var(--bg-soft)}
details summary{padding:12px 0;font-weight:600;cursor:pointer;min-height:44px;display:flex;align-items:center}
details p{color:var(--muted);margin:0 0 12px}
form.lead{display:flex;flex-direction:column;gap:14px}
form.lead label{font-weight:600;font-size:.95rem}
form.lead input,form.lead select,form.lead textarea{width:100%;padding:12px;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--fg);font-size:1rem;min-height:44px}
form.lead input:focus,form.lead select:focus,form.lead textarea:focus{outline:2px solid var(--accent);outline-offset:1px}
form.lead textarea{min-height:88px}
.checkbox-linha{display:flex;align-items:flex-start;gap:10px;font-weight:400;font-size:.9rem;color:var(--muted)}
.checkbox-linha input{width:auto;min-height:auto;margin-top:3px}
footer{padding:32px 0 48px;color:var(--muted);font-size:.85rem;text-align:center}
.msg{padding:14px;border-radius:8px;margin-bottom:16px}
.msg.ok{background:#123321;color:#8fe6ab;border:1px solid #1f5c39}
.msg.erro{background:#331212;color:#e68f8f;border:1px solid #5c1f1f}
a{color:var(--accent)}
@media (min-width:640px){h1{font-size:2.4rem}.cta-grupo{flex-direction:row}.btn{width:auto;flex:1}}
`;

function secaoProblema() {
  return `
  <section id="problema">
    <h2>${esc(copy.problema.titulo)}</h2>
    ${copy.problema.paragrafos.map((p) => `<p>${esc(p)}</p>`).join('\n')}
  </section>`;
}

function secaoComoFunciona() {
  return `
  <section id="como-funciona">
    <h2>${esc(copy.comoFunciona.titulo)}</h2>
    ${copy.comoFunciona.passos
      .map(
        (p) => `<div class="passo"><b>${esc(p.titulo)}</b><span>${esc(p.texto)}</span></div>`
      )
      .join('\n')}
  </section>`;
}

function secaoProva() {
  const p = copy.prova;
  return `
  <section id="prova">
    <h2>${esc(p.titulo)}</h2>
    <p>${esc(p.intro)}</p>
    <div class="pergunta-real">&ldquo;${esc(p.pergunta)}&rdquo;</div>
    <blockquote>
      ${p.resposta.map((par) => `<p>${esc(par)}</p>`).join('\n')}
      <p class="fonte-verificacao">Fontes: ${p.fontes
        .map((f) => `<a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.texto)}</a>`)
        .join(' · ')}</p>
      <p class="fonte-verificacao">Verificado em ${esc(p.dataVerificacao)}.</p>
      <p class="rodape-disclaimer">${esc(p.rodape)}</p>
    </blockquote>
    ${p.fechamento.map((par) => `<p>${esc(par)}</p>`).join('\n')}
  </section>`;
}

function linhaPlano(plano) {
  return `<td><span class="preco">R$ ${plano.precoMes}</span>/mês</td>`;
}

// Sem isto o clique no plano não carrega e-mail nenhum: o pagamento até
// pode ser aprovado, mas não há para onde mandar o acesso depois.
function formularioCheckout(planoId, textoBotao, classeBotao) {
  return `<form class="lead" method="post" action="/checkout/iniciar?plano=${planoId}">
    <div><label for="nome-${planoId}">${esc(CAMPO_NOME.label)}</label><input type="text" id="nome-${planoId}" name="nome" required/></div>
    <div><label for="email-${planoId}">${esc(CAMPO_EMAIL.label)}</label><input type="email" id="email-${planoId}" name="email" required/></div>
    <button class="btn${classeBotao ? ' ' + classeBotao : ''}" type="submit">${esc(textoBotao)}</button>
  </form>`;
}

function secaoPlanos() {
  const { plantao, escritorio } = oferta.planos;
  const p = copy.planos;
  return `
  <section id="planos">
    <h2>${esc(p.titulo)}</h2>
    <table class="planos">
      <tr><th></th><th>${esc(plantao.nome)}</th><th>${esc(escritorio.nome)} ⭐</th></tr>
      <tr><td>Preço</td>${linhaPlano(plantao)}${linhaPlano(escritorio)}</tr>
      <tr><td>1ª resposta humana</td><td>${esc(plantao.aceite)}</td><td><b>${esc(escritorio.aceite)}</b></td></tr>
      <tr><td>Resposta completa com a fonte</td><td>${esc(plantao.prazoResposta)}</td><td><b>${esc(escritorio.prazoResposta)}</b></td></tr>
      <tr><td>Perguntas/mês (teto macio)</td><td>${plantao.perguntasMes}</td><td>${escritorio.perguntasMes}</td></tr>
      <tr><td>Pessoas no canal</td><td>${plantao.usuariosCanal}</td><td>${escritorio.usuariosCanal}</td></tr>
      <tr><td>Norma de referência citada</td><td>✅</td><td>✅</td></tr>
      <tr><td>Base Reforma</td><td>✅</td><td>✅</td></tr>
      <tr><td>Alertas de atualização</td><td>✅</td><td>✅</td></tr>
      <tr><td>Kit white-label mensal</td><td>—</td><td>✅</td></tr>
      <tr><td>Resumo mensal escrito</td><td>—</td><td>✅</td></tr>
      <tr><td>Checklist de transição por cliente</td><td>—</td><td>✅</td></tr>
      <tr><td>Prioridade na fila</td><td>—</td><td>✅</td></tr>
      <tr><td>Garantia de prazo</td><td>✅</td><td>✅</td></tr>
    </table>
    <p>${esc(p.turmaFundadora)}</p>
    <p>${esc(p.anual)}</p>
    <div class="cta-grupo">
      ${formularioCheckout('escritorio', p.ctaPrimario)}
      ${formularioCheckout('plantao', p.ctaSecundario, 'secundario')}
    </div>
    <p class="btn-apoio">${esc(p.apoio)} <a href="#amostra-gratis">Mandar dúvida</a></p>
  </section>`;
}

function secaoPrazo() {
  const p = copy.prazoPorExtenso;
  return `
  <section id="prazo">
    <h2>${esc(p.titulo)}</h2>
    <p>${esc(p.intro)}</p>
    <ul class="check">${p.bullets.map((b) => `<li>${esc(b)}</li>`).join('\n')}</ul>
    <p>${esc(p.fechamento)}</p>
  </section>`;
}

function secaoGarantia() {
  const g = copy.garantia;
  return `
  <section id="garantia">
    <h2>${esc(g.titulo)}</h2>
    ${g.itens.map((i) => `<p><b>${esc(i.titulo)}</b> ${esc(i.texto)}</p>`).join('\n')}
    <p>${esc(g.fechamento)}</p>
  </section>`;
}

function secaoNaoFazemos() {
  const n = copy.naoFazemos;
  return `
  <section id="nao-fazemos">
    <h2>${esc(n.titulo)}</h2>
    <ul class="check">${n.bullets.map((b) => `<li>${esc(b)}</li>`).join('\n')}</ul>
    <p>${esc(n.fechamento)}</p>
  </section>`;
}

function secaoFaq() {
  return `
  <section id="faq">
    <h2>Perguntas frequentes</h2>
    ${copy.faq
      .map(
        (item) => `<details><summary>${esc(item.q)}</summary><p>${esc(item.a)}</p></details>`
      )
      .join('\n')}
  </section>`;
}

function secaoFormulario(mensagem) {
  const campos = CAMPOS_FORMULARIO.map((c) => {
    if (c.tipo === 'select') {
      return `<div><label for="${c.nome}">${esc(c.label)}</label><select id="${c.nome}" name="${c.nome}" ${c.obrigatorio ? 'required' : ''}>
        <option value="" disabled selected>Selecione</option>
        ${c.opcoes.map((o) => `<option value="${esc(o)}">${esc(o)}</option>`).join('')}
      </select></div>`;
    }
    if (c.tipo === 'textarea') {
      return `<div><label for="${c.nome}">${esc(c.label)}</label><textarea id="${c.nome}" name="${c.nome}" ${c.obrigatorio ? 'required' : ''} ${c.minLength ? `minlength="${c.minLength}"` : ''}></textarea></div>`;
    }
    if (c.tipo === 'checkbox') {
      return `<div class="checkbox-linha"><input type="checkbox" id="${c.nome}" name="${c.nome}" ${c.obrigatorio ? 'required' : ''}/><label for="${c.nome}">${esc(c.label)}</label></div>`;
    }
    return `<div><label for="${c.nome}">${esc(c.label)}</label><input type="${c.tipo}" id="${c.nome}" name="${c.nome}" ${c.obrigatorio ? 'required' : ''}/></div>`;
  }).join('\n');

  return `
  <section id="amostra-gratis">
    <h2>${esc(copy.ctaFinal.titulo)}</h2>
    <p>${esc(copy.ctaFinal.texto)}</p>
    ${mensagem === 'ok' ? `<div class="msg ok">Recebemos sua dúvida. Respondemos por escrito, com a norma citada, em até 1 dia útil.</div>` : ''}
    ${mensagem === 'erro' ? `<div class="msg erro">Não deu para enviar — confira os campos obrigatórios e tente de novo.</div>` : ''}
    <form class="lead" method="post" action="/api/lead">
      ${campos}
      <button class="btn" type="submit">${esc(copy.ctaFinal.botao)}</button>
    </form>
  </section>`;
}

export function paginaLandingHtml({ preview, mensagem } = {}) {
  const robotsMeta = preview
    ? '<meta name="robots" content="noindex, nofollow, noarchive, nosnippet">'
    : '<meta name="robots" content="index, follow">';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${robotsMeta}
<title>Reformify — Plantão Reforma Tributária</title>
<style>${CSS}</style>
</head>
<body>
<div class="wrap">
  <div class="topo">
    <span class="marca"><span class="ponto"></span>Reformify</span>
  </div>
  <header class="hero">
    <span class="selo">Plantão Reforma Tributária</span>
    <h1>${esc(copy.h1)}</h1>
    <p class="subhead">${esc(copy.subhead)}</p>
    <a class="btn" href="#amostra-gratis">${esc(copy.ctaPrimario.texto)}</a>
    <p class="btn-apoio">${esc(copy.ctaPrimario.apoio)}</p>
  </header>
  ${secaoProblema()}
  ${secaoComoFunciona()}
  ${secaoProva()}
  ${secaoPlanos()}
  ${secaoPrazo()}
  ${secaoGarantia()}
  ${secaoNaoFazemos()}
  ${secaoFaq()}
  ${secaoFormulario(mensagem)}
  <footer>${esc(copy.rodapePagina)}</footer>
</div>
</body>
</html>`;
}
