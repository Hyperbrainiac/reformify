import { oferta, RODAPE_OBRIGATORIO } from '../oferta.js';

// PLACEHOLDER — a Marina ainda não entregou o texto final do disclaimer em
// ACE-3 (parado pela mesma falha de terminal que travou este canal). Até lá
// usamos o rodapé obrigatório padrão da oferta, que já cobre o limite legal
// básico (orientação geral, não consultoria contábil). Trocar assim que a
// ACE-3 publicar — é o único texto jurídico que não é meu para editar.
export const disclaimerAtual = () => RODAPE_OBRIGATORIO;

export function montarBoasVindasCanal(planoId) {
  const plano = oferta.planos[planoId] || oferta.planos.escritorio;
  return [
    'Oi! Aqui é o plantão de dúvidas da Reforma Tributária da ACE AI.',
    `Plano: ${plano.nome}.`,
    `Prazo: confirmamos o recebimento em até ${plano.aceite} e respondemos com fonte em até ${plano.prazoResposta}, dentro do expediente (${oferta.janela}; ${oferta.regraContagem}).`,
    '',
    disclaimerAtual(),
    '',
    'Pode mandar sua dúvida agora.',
  ].join('\n');
}
