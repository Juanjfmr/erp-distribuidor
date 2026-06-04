// ─── FOCUS NFe API ────────────────────────────────────────────────────────────
// Comunicação com Focus NFe: emissão, cancelamento e consulta de NF-e.
// Numeração atômica é feita por getNextNFNumber() em firebase.js.

async function emitirNFe(invoice, company, products, clients) {
  const token = window._focusToken;
  const env = window._focusEnv || 'homologacao';

  if (!token) {
    return { success: false, error: 'Token Focus NFe não configurado. Acesse Configurações para inserir.' };
  }

  const client = invoice.clientId ? clients.find(c => c.id === invoice.clientId) : null;
  const isAvulso = !invoice.clientId;

  const itens = (invoice.items || []).map((item, idx) => {
    const prod = products.find(p => p.id === item.productId);
    if (!prod) return null;
    return {
      numero_item: idx + 1,
      codigo_produto: prod.code || String(prod.id),
      descricao: prod.name,
      codigo_ncm: (prod.ncm || '').replace(/\D/g, ''),
      cfop: prod.cfop || '5102',
      unidade_comercial: prod.unit || 'UN',
      quantidade_comercial: item.qty,
      valor_unitario_comercial: item.price,
      valor_bruto: parseFloat((item.qty * item.price * (1 - (item.itemDiscount || 0) / 100)).toFixed(2)),
      origem_mercadoria: prod.origem || '0',
      icms_situacao_tributaria: (company.regime === '1' || company.regime === '2') ? '102' : '000',
      pis_situacao_tributaria: '07',
      cofins_situacao_tributaria: '07',
    };
  }).filter(Boolean);

  const payload = {
    natureza_operacao: 'Venda de mercadoria',
    forma_pagamento: 0,
    tipo_documento: 1,
    local_destino: 1,
    cnpj_emitente: (company.cnpj || '').replace(/\D/g, ''),
    nome_emitente: company.name,
    logradouro_emitente: company.address || '',
    municipio_emitente: company.city || '',
    uf_emitente: company.uf || '',
    cep_emitente: (company.cep || '').replace(/\D/g, '') || '00000000',
    regime_tributario_emitente: company.regime || '1',
    inscricao_estadual_emitente: company.ie || 'ISENTO',
    nome_destinatario: isAvulso ? 'Consumidor Final' : (client ? client.name : 'Consumidor Final'),
    cpf_destinatario: isAvulso ? '00000000000' : null,
    cnpj_destinatario: (!isAvulso && client && client.cnpj) ? client.cnpj.replace(/\D/g, '') : null,
    logradouro_destinatario: (!isAvulso && client) ? (client.street || '') : '',
    municipio_destinatario: (!isAvulso && client) ? (client.city || '') : '',
    uf_destinatario: (!isAvulso && client) ? (client.uf || company.uf || '') : (company.uf || ''),
    cep_destinatario: (!isAvulso && client && client.cep) ? client.cep.replace(/\D/g, '') : '00000000',
    indicador_inscricao_estadual_destinatario: 9,
    valor_produtos: invoice.subtotal || invoice.total,
    valor_desconto: invoice.discount > 0 ? parseFloat(((invoice.subtotal || invoice.total) * invoice.discount / 100).toFixed(2)) : 0,
    valor_frete: invoice.freight || 0,
    valor_total: invoice.total,
    forma_de_pagamento: [{ forma_pagamento: '01', valor: invoice.total }],
    items: itens,
  };

  try {
    const baseUrl = env === 'producao'
      ? 'https://api.focusnfe.com.br'
      : 'https://homologacao.focusnfe.com.br';

    const ref = `nfe_${invoice.id}`;
    const resp = await fetch(`${baseUrl}/v2/nfe?ref=${ref}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa(token + ':'),
      },
      body: JSON.stringify(payload),
    });

    const data = await resp.json();

    if (data.status === 'autorizado') {
      return {
        success: true,
        chave: data.chave_nfe || data.chave,
        danfeUrl: data.caminho_danfe || data.danfe_url || null,
        numero: data.numero,
        serie: data.serie,
        focusRef: ref,
      };
    }

    // Focus NFe retorna 202 quando a NF entra na fila de processamento da SEFAZ
    if (resp.status === 202 || data.status === 'processando' || data.status === 'aguardando_autorizacao') {
      return await _aguardarAutorizacao(ref, token, baseUrl);
    }

    return { success: false, error: data.mensagem || (data.erros && data.erros[0] && data.erros[0].mensagem) || 'Erro ao emitir NF-e.' };
  } catch (e) {
    return { success: false, error: 'Erro de conexão com Focus NFe: ' + e.message };
  }
}

async function cancelarNFe(focusRef, justificativa, company) {
  const token = window._focusToken;
  const env = window._focusEnv || 'homologacao';

  if (!token) return { success: false, error: 'Token Focus NFe não configurado.' };
  if ((justificativa || '').length < 15) return { success: false, error: 'Justificativa deve ter no mínimo 15 caracteres.' };

  try {
    const baseUrl = env === 'producao'
      ? 'https://api.focusnfe.com.br'
      : 'https://homologacao.focusnfe.com.br';

    const resp = await fetch(`${baseUrl}/v2/nfe/${focusRef}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa(token + ':'),
      },
      body: JSON.stringify({ justificativa }),
    });

    const data = await resp.json();
    if (resp.ok || data.status === 'cancelado') return { success: true };
    return { success: false, error: data.mensagem || 'Erro ao cancelar NF-e.' };
  } catch (e) {
    return { success: false, error: 'Erro de conexão: ' + e.message };
  }
}

async function consultarNFe(focusRef, company) {
  const token = window._focusToken;
  const env = window._focusEnv || 'homologacao';
  const baseUrl = env === 'producao'
    ? 'https://api.focusnfe.com.br'
    : 'https://homologacao.focusnfe.com.br';

  try {
    const resp = await fetch(`${baseUrl}/v2/nfe/${focusRef}`, {
      headers: { 'Authorization': 'Basic ' + btoa(token + ':') },
    });
    return await resp.json();
  } catch (e) {
    return { error: e.message };
  }
}

// Aguarda autorização da SEFAZ via polling (Focus NFe é assíncrono por padrão).
async function _aguardarAutorizacao(ref, token, baseUrl, maxTentativas = 10, intervalo = 3000) {
  for (let i = 0; i < maxTentativas; i++) {
    await new Promise(r => setTimeout(r, intervalo));
    try {
      const resp = await fetch(`${baseUrl}/v2/nfe/${ref}`, {
        headers: { 'Authorization': 'Basic ' + btoa(token + ':') },
      });
      const data = await resp.json();
      if (data.status === 'autorizado') {
        return {
          success: true,
          chave: data.chave_nfe || data.chave,
          danfeUrl: data.caminho_danfe || data.danfe_url || null,
          numero: data.numero,
          serie: data.serie,
          focusRef: ref,
        };
      }
      if (data.status === 'erro' || data.status === 'cancelado' || data.status === 'denegado') {
        return { success: false, error: data.mensagem || `NF-e retornou status: ${data.status}` };
      }
      // status 'processando' ou 'aguardando_autorizacao' → continua polling
    } catch (e) {
      return { success: false, error: 'Erro de conexão durante polling: ' + e.message };
    }
  }
  return { success: false, error: 'Tempo esgotado aguardando autorização da SEFAZ. Consulte a NF-e manualmente.' };
}
