// Integração real com o Mercado Pago (assinaturas / preapproval). Só é chamada
// quando CHECKOUT_MODO=producao e CHECKOUT_PROVEDOR=mercadopago — os dois
// gates de checkout.js (produção + PUBLICACAO_LIBERADA_CEO) já bloqueiam o
// resto. Nunca usar dependência externa: fetch nativo do Node.

const API_BASE = 'https://api.mercadopago.com';

function token() {
  const valor = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!valor) throw new Error('MERCADOPAGO_ACCESS_TOKEN ausente — não é possível cobrar de verdade');
  return valor;
}

// Cria a assinatura recorrente e devolve o link de checkout hospedado pelo
// Mercado Pago (init_point). O sessaoId vira external_reference — é assim que
// o webhook, mais tarde, volta a achar a sessão local sem confiar no corpo do POST.
//
// IMPORTANTE — validado contra a API real (ACE-6): ao contrário da API de
// Payment/Preference, o endpoint /preapproval NÃO aceita notification_url por
// objeto (testei enviando o campo: ele é ignorado, nunca volta na resposta).
// Para o webhook chegar de verdade em produção, é preciso cadastrar a URL
// https://<host>/checkout/webhook no Painel do Desenvolvedor do Mercado Pago,
// na aplicação dona deste token (application_id 3030941579181132), assinando
// pelo menos o tópico "assinaturas" (subscription_preapproval). Sem isso, um
// cliente pode pagar de verdade e nunca ter o acesso liberado — silenciosamente.
export async function criarAssinatura({ sessaoId, plano, email, backUrl }) {
  const resposta = await fetch(`${API_BASE}/preapproval`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      reason: `ACE AI — ${plano.nome}`,
      external_reference: sessaoId,
      payer_email: email,
      back_url: backUrl,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: plano.precoMes,
        currency_id: 'BRL',
      },
      status: 'pending',
    }),
  });

  if (!resposta.ok) {
    const detalhe = await resposta.text().catch(() => '');
    throw new Error(`mercadopago (criar) respondeu ${resposta.status}: ${detalhe}`);
  }

  const dados = await resposta.json();
  return { gatewayId: dados.id, initPoint: dados.init_point };
}

// Nunca confiar no status que vem no corpo do webhook — ele pode ser forjado
// por qualquer um que descubra a URL. A fonte de verdade é sempre esta
// consulta autenticada de volta ao Mercado Pago.
export async function consultarAssinatura(gatewayId) {
  const resposta = await fetch(`${API_BASE}/preapproval/${gatewayId}`, {
    headers: { Authorization: `Bearer ${token()}` },
  });

  if (!resposta.ok) {
    const detalhe = await resposta.text().catch(() => '');
    throw new Error(`mercadopago (consultar) respondeu ${resposta.status}: ${detalhe}`);
  }

  const dados = await resposta.json();
  return { status: dados.status, externalReference: dados.external_reference };
}
