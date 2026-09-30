import http from 'node:http';
import { config } from '../config.js';
import { paginaLandingHtml } from './html.js';
import { inserirLead, contarLeads } from './leads.js';
import { CAMPOS_FORMULARIO } from './copy.js';
import { pendencias } from '../oferta.js';
import { iniciarSessao, obterSessao, processarWebhookPagamento, CheckoutProducaoBloqueadoError } from './checkout.js';

function lerCorpo(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) req.destroy();
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function parseFormUrlEncoded(body) {
  const params = new URLSearchParams(body);
  return Object.fromEntries(params.entries());
}

function validarLead(dados) {
  const erros = [];
  for (const campo of CAMPOS_FORMULARIO) {
    const valor = dados[campo.nome];
    if (campo.obrigatorio && !valor) erros.push(`${campo.nome} obrigatório`);
    if (campo.tipo === 'textarea' && campo.minLength && valor && valor.length < campo.minLength) {
      erros.push(`${campo.nome} muito curto`);
    }
  }
  return erros;
}

function enviarHtml(res, status, html) {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': config.preview ? 'noindex, nofollow, noarchive' : 'index, follow' });
  res.end(html);
}

function enviarJson(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

export function criarServidor() {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');

    try {
      if (req.method === 'GET' && url.pathname === '/') {
        return enviarHtml(res, 200, paginaLandingHtml({ preview: config.preview }));
      }

      if (req.method === 'GET' && url.pathname === '/robots.txt') {
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end(config.preview ? 'User-agent: *\nDisallow: /\n' : 'User-agent: *\nAllow: /\n');
      }

      if (req.method === 'GET' && url.pathname === '/saude') {
        return enviarJson(res, 200, {
          ok: true,
          preview: config.preview,
          noindex: config.preview,
          pendencias: pendencias(),
          leads: contarLeads(),
          checkout: {
            modo: config.checkout.modo,
            provedor: config.checkout.provedor,
          },
        });
      }

      if (req.method === 'POST' && url.pathname === '/api/lead') {
        const contentType = req.headers['content-type'] || '';
        const body = await lerCorpo(req);
        const dados = contentType.includes('application/json') ? JSON.parse(body || '{}') : parseFormUrlEncoded(body);
        const erros = validarLead(dados);
        if (erros.length) {
          if (contentType.includes('application/json')) return enviarJson(res, 400, { ok: false, erros });
          return enviarHtml(res, 400, paginaLandingHtml({ preview: config.preview, mensagem: 'erro' }));
        }

        const origem = req.headers.referer || 'direto';
        const id = inserirLead(
          {
            nome: dados.nome,
            whatsapp: dados.whatsapp,
            email: dados.email,
            escritorio: dados.escritorio,
            carteira: dados.carteira,
            duvida: dados.duvida,
            autoriza: dados.autoriza === 'on' || dados.autoriza === true || dados.autoriza === 'true',
          },
          origem
        );

        if (contentType.includes('application/json')) return enviarJson(res, 201, { ok: true, id });
        return enviarHtml(res, 201, paginaLandingHtml({ preview: config.preview, mensagem: 'ok' }));
      }

      if (req.method === 'POST' && url.pathname === '/checkout/iniciar') {
        const plano = url.searchParams.get('plano');
        try {
          const sessao = iniciarSessao(plano);
          return enviarJson(res, 201, sessao);
        } catch (e) {
          if (e instanceof CheckoutProducaoBloqueadoError) return enviarJson(res, 403, { ok: false, erro: e.message });
          return enviarJson(res, 400, { ok: false, erro: e.message });
        }
      }

      // GET também aceito para permitir clicar direto no link da tabela de planos.
      if (req.method === 'GET' && url.pathname === '/checkout/iniciar') {
        const plano = url.searchParams.get('plano');
        try {
          const sessao = iniciarSessao(plano);
          return enviarJson(res, 201, sessao);
        } catch (e) {
          if (e instanceof CheckoutProducaoBloqueadoError) return enviarJson(res, 403, { ok: false, erro: e.message });
          return enviarJson(res, 400, { ok: false, erro: e.message });
        }
      }

      if (req.method === 'GET' && url.pathname.startsWith('/checkout/sessao/')) {
        const id = url.pathname.split('/').pop();
        const sessao = obterSessao(id);
        if (!sessao) return enviarJson(res, 404, { ok: false, erro: 'sessão não encontrada' });
        return enviarJson(res, 200, sessao);
      }

      if (req.method === 'POST' && url.pathname === '/checkout/webhook') {
        const body = await lerCorpo(req);
        const evento = JSON.parse(body || '{}');
        try {
          const resultado = processarWebhookPagamento(evento.sessaoId, evento.eventId);
          return enviarJson(res, 200, { ok: true, ...resultado });
        } catch (e) {
          return enviarJson(res, 400, { ok: false, erro: e.message });
        }
      }

      enviarHtml(res, 404, '<h1>404</h1>');
    } catch (e) {
      enviarJson(res, 500, { ok: false, erro: e.message });
    }
  });
}
