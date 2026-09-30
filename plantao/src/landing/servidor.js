import http from 'node:http';
import { config } from '../config.js';
import { paginaLandingHtml } from './html.js';
import { inserirLead, contarLeads } from './leads.js';
import { CAMPOS_FORMULARIO } from './copy.js';
import { pendencias } from '../oferta.js';
import {
  iniciarSessao,
  obterSessao,
  processarWebhookPagamento,
  resumoCheckout,
  CheckoutProducaoBloqueadoError,
} from './checkout.js';
import { enviarBoasVindas, resumoEmail } from './email.js';
import { consultarAssinatura } from './mercadopago.js';

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
      if ((req.method === 'GET' || req.method === 'HEAD') && url.pathname === '/') {
        const html = paginaLandingHtml({ preview: config.preview });
        return enviarHtml(res, 200, req.method === 'HEAD' ? '' : html);
      }

      if ((req.method === 'GET' || req.method === 'HEAD') && url.pathname === '/robots.txt') {
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end(req.method === 'HEAD' ? '' : (config.preview ? 'User-agent: *\nDisallow: /\n' : 'User-agent: *\nAllow: /\n'));
      }

      if ((req.method === 'GET' || req.method === 'HEAD') && url.pathname === '/saude') {
        return enviarJson(res, 200, {
          ok: true,
          preview: config.preview,
          noindex: config.preview,
          pendencias: pendencias(),
          leads: contarLeads(),
          checkout: {
            modo: config.checkout.modo,
            provedor: config.checkout.provedor,
            resumo: resumoCheckout(),
          },
          email: resumoEmail(),
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
        const contentType = req.headers['content-type'] || '';
        let plano;
        let dadosCliente;
        if (contentType.includes('application/json')) {
          const body = JSON.parse((await lerCorpo(req)) || '{}');
          plano = url.searchParams.get('plano') || body.plano;
          dadosCliente = { nome: body.nome, email: body.email };
        } else {
          const body = await lerCorpo(req);
          const dados = parseFormUrlEncoded(body);
          plano = url.searchParams.get('plano') || dados.plano;
          dadosCliente = { nome: dados.nome, email: dados.email };
        }

        try {
          const sessao = await iniciarSessao(plano, dadosCliente);
          if (contentType.includes('application/json')) return enviarJson(res, 201, sessao);
          if (sessao.initPoint) {
            // Produção real: manda o cliente direto para o checkout hospedado
            // pelo Mercado Pago. Formulário é POST comum (sem JS), o navegador
            // segue o redirect sozinho — funciona igual no celular.
            res.writeHead(302, { Location: sessao.initPoint });
            return res.end();
          }
          return enviarHtml(
            res,
            201,
            `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>Checkout — ACE AI</title></head>
            <body style="font-family:sans-serif;max-width:520px;margin:40px auto;padding:0 20px">
              <p>Sessão de checkout criada (modo ${config.checkout.modo}). Sessão: ${sessao.id} — plano ${sessao.plano.nome} (R$ ${sessao.plano.precoMes}/mês).</p>
              <p><a href="/">Voltar</a></p>
            </body></html>`
          );
        } catch (e) {
          const status = e instanceof CheckoutProducaoBloqueadoError ? 403 : 400;
          if (contentType.includes('application/json')) return enviarJson(res, status, { ok: false, erro: e.message });
          return enviarHtml(res, status, `<p>Não deu para iniciar o checkout: ${e.message}</p><p><a href="/">Voltar</a></p>`);
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
          let resultado;
          if (config.checkout.modo === 'producao' && config.checkout.provedor === 'mercadopago') {
            // Nunca confia no status do corpo do webhook (qualquer um pode
            // forjar um POST). Usa o data.id da notificação só para achar a
            // assinatura e reconsulta o status de verdade na API do Mercado Pago.
            const gatewayId = evento?.data?.id;
            if (!gatewayId) return enviarJson(res, 400, { ok: false, erro: 'notificação sem data.id' });
            const eventId = String(evento.id ?? gatewayId);
            const { status, externalReference } = await consultarAssinatura(gatewayId);
            const statusMapeado = status === 'authorized' ? 'aprovado' : 'recusado';
            resultado = processarWebhookPagamento(externalReference, eventId, statusMapeado);
          } else {
            resultado = processarWebhookPagamento(evento.sessaoId, evento.eventId, evento.status);
          }
          let email;
          if (!resultado.duplicado && resultado.sessao.status === 'pago') {
            email = await enviarBoasVindas(resultado.sessao);
          }
          return enviarJson(res, 200, { ok: true, ...resultado, email });
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
