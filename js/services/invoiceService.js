// ─── FOCUS NFe API ────────────────────────────────────────────────────────────
// Comunicação com Focus NFe: emissão, cancelamento, consulta de NF-e, CCe, email,
// NF recebidas, manifestação, inutilização, importação, pré-visualização, NFCe,
// NFS-e, CT-e, MDFe e consultas auxiliares (CEP, NCM, CNPJ).
// Numeração atômica é feita por getNextNFNumber() em firebase.js.

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _getAuth(company) {
  const token = company?.focusNfeToken || window._focusToken;
  if (!token) return null;
  return { token, env: company?.focusNfeEnv || window._focusEnv || 'homologacao' };
}

function _baseUrl(env) {
  return env === 'producao'
    ? 'https://api.focusnfe.com.br'
    : 'https://homologacao.focusnfe.com.br';
}

function _authHeaders(token) {
  return {
    'Content-Type': 'application/json',
    'Authorization': 'Basic ' + btoa(token + ':'),
  };
}

// ─── NF-e ─────────────────────────────────────────────────────────────────────

async function emitirNFe(invoice, company, products, clients) {
  const auth = _getAuth(company);
  if (!auth) return { success: false, error: 'Token Focus NFe não configurado. Acesse Configurações para inserir.' };

  const client = invoice.clientId ? clients.find(c => c.id === invoice.clientId) : null;
  const isAvulso = !invoice.clientId;
  const ufDestino = (!isAvulso && client) ? (client.uf || company.uf) : company.uf;
  const interestadual = company.uf && ufDestino && company.uf !== ufDestino;
  const regime = parseInt(company.regime) || 1;

  const itens = (invoice.items || []).map((item, idx) => {
    const prod = products.find(p => p.id === item.productId);
    if (!prod) return null;
    let cfop, cst;
    if (prod.st) {
      cst = '60';
      cfop = interestadual ? '6401' : '5405';
    } else {
      cst = (regime === 1 || regime === 2) ? '102' : '000';
      const cfopBase = prod.cfop || '5102';
      cfop = interestadual && cfopBase.startsWith('5')
        ? '6' + cfopBase.slice(1)
        : cfopBase;
    }
    return {
      numero_item: idx + 1,
      codigo_produto: prod.code || String(prod.id),
      descricao: prod.name,
      codigo_ncm: (prod.ncm || '').replace(/\D/g, ''),
      cfop: cfop,
      unidade_comercial: prod.unit || 'UN',
      quantidade_comercial: item.qty,
      valor_unitario_comercial: item.price,
      valor_bruto: parseFloat((item.qty * item.price * (1 - (item.itemDiscount || 0) / 100)).toFixed(2)),
      origem_mercadoria: prod.origem || '0',
      icms_situacao_tributaria: cst,
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
    const base = _baseUrl(auth.env);
    const ref = `nfe_${invoice.id}`;
    const resp = await fetch(`${base}/v2/nfe?ref=${ref}`, {
      method: 'POST',
      headers: _authHeaders(auth.token),
      body: JSON.stringify(payload),
    });
    const data = await resp.json();

    if (data.status === 'autorizado') {
      return { success: true, chave: data.chave_nfe || data.chave, danfeUrl: data.caminho_danfe || data.danfe_url || null, numero: data.numero, serie: data.serie, focusRef: ref };
    }
    if (resp.status === 202 || data.status === 'processando' || data.status === 'aguardando_autorizacao') {
      return await _aguardarAutorizacao(ref, auth.token, base);
    }
    return { success: false, error: data.mensagem || (data.erros && data.erros[0] && data.erros[0].mensagem) || 'Erro ao emitir NF-e.' };
  } catch (e) {
    return { success: false, error: 'Erro de conexão com Focus NFe: ' + e.message };
  }
}

async function cancelarNFe(focusRef, justificativa, company) {
  const auth = _getAuth(company);
  if (!auth) return { success: false, error: 'Token Focus NFe não configurado.' };
  if ((justificativa || '').length < 15) return { success: false, error: 'Justificativa deve ter no mínimo 15 caracteres.' };
  try {
    const base = _baseUrl(auth.env);
    const resp = await fetch(`${base}/v2/nfe?ref=${focusRef}`, {
      method: 'DELETE',
      headers: _authHeaders(auth.token),
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
  const auth = _getAuth(company);
  if (!auth) return { error: 'Token não configurado.' };
  try {
    const base = _baseUrl(auth.env);
    const resp = await fetch(`${base}/v2/nfe?ref=${focusRef}`, {
      headers: { 'Authorization': 'Basic ' + btoa(auth.token + ':') },
    });
    return await resp.json();
  } catch (e) {
    return { error: e.message };
  }
}

async function _aguardarAutorizacao(ref, token, baseUrl, maxTentativas = 10, intervalo = 3000) {
  for (let i = 0; i < maxTentativas; i++) {
    await new Promise(r => setTimeout(r, intervalo));
    try {
      const resp = await fetch(`${baseUrl}/v2/nfe?ref=${ref}`, {
        headers: { 'Authorization': 'Basic ' + btoa(token + ':') },
      });
      const data = await resp.json();
      if (data.status === 'autorizado') {
        return { success: true, chave: data.chave_nfe || data.chave, danfeUrl: data.caminho_danfe || data.danfe_url || null, numero: data.numero, serie: data.serie, focusRef: ref };
      }
      if (data.status === 'erro' || data.status === 'cancelado' || data.status === 'denegado') {
        return { success: false, error: data.mensagem || `NF-e retornou status: ${data.status}` };
      }
    } catch (e) {
      return { success: false, error: 'Erro de conexão durante polling: ' + e.message };
    }
  }
  return { success: false, error: 'Tempo esgotado aguardando autorização da SEFAZ. Consulte a NF-e manualmente.' };
}

// ─── Carta de Correção (CCe) ──────────────────────────────────────────────────

async function cartaCorrecaoNFe(focusRef, correcao, company) {
  const auth = _getAuth(company);
  if (!auth) return { success: false, error: 'Token não configurado.' };
  if (!correcao || correcao.length < 15) return { success: false, error: 'Texto de correção deve ter no mínimo 15 caracteres.' };

  try {
    const base = _baseUrl(auth.env);
    const resp = await fetch(`${base}/v2/nfe?ref=${focusRef}`, {
      method: 'POST',
      headers: _authHeaders(auth.token),
      body: JSON.stringify({ carta_correcao: correcao }),
    });
    const data = await resp.json();
    if (resp.ok) return { success: true, protocolo: data.protocolo, data };
    return { success: false, error: data.mensagem || 'Erro ao emitir carta de correção.' };
  } catch (e) {
    return { success: false, error: 'Erro: ' + e.message };
  }
}

// ─── Enviar NF por Email ──────────────────────────────────────────────────────

async function enviarNFeEmail(focusRef, emails, company) {
  const auth = _getAuth(company);
  if (!auth) return { success: false, error: 'Token não configurado.' };
  if (!emails || !emails.length) return { success: false, error: 'Informe ao menos um email.' };

  try {
    const base = _baseUrl(auth.env);
    const resp = await fetch(`${base}/v2/nfe?ref=${focusRef}`, {
      method: 'POST',
      headers: _authHeaders(auth.token),
      body: JSON.stringify({ emails: emails.slice(0, 10) }),
    });
    const data = await resp.json();
    if (resp.ok) return { success: true, enviados: emails };
    return { success: false, error: data.mensagem || 'Erro ao enviar email.' };
  } catch (e) {
    return { success: false, error: 'Erro: ' + e.message };
  }
}

// ─── Pré-visualização DANFe ───────────────────────────────────────────────────

async function previsualizarDANFe(invoice, company, products, clients) {
  // Reutiliza a mesma lógica de montagem da emitirNFe mas sem enviar pra SEFAZ
  const auth = _getAuth(company);
  if (!auth) return { success: false, error: 'Token não configurado.' };

  const client = invoice.clientId ? clients.find(c => c.id === invoice.clientId) : null;
  const isAvulso = !invoice.clientId;
  const ufDestino = (!isAvulso && client) ? (client.uf || company.uf) : company.uf;
  const interestadual = company.uf && ufDestino && company.uf !== ufDestino;
  const regime = parseInt(company.regime) || 1;

  const itens = (invoice.items || []).map((item, idx) => {
    const prod = products.find(p => p.id === item.productId);
    if (!prod) return null;
    let cfop, cst;
    if (prod.st) { cst = '60'; cfop = interestadual ? '6401' : '5405'; }
    else { cst = (regime === 1 || regime === 2) ? '102' : '000'; const cfopBase = prod.cfop || '5102'; cfop = interestadual && cfopBase.startsWith('5') ? '6' + cfopBase.slice(1) : cfopBase; }
    return {
      numero_item: idx + 1, codigo_produto: prod.code || String(prod.id), descricao: prod.name,
      codigo_ncm: (prod.ncm || '').replace(/\D/g, ''), cfop, unidade_comercial: prod.unit || 'UN',
      quantidade_comercial: item.qty, valor_unitario_comercial: item.price,
      valor_bruto: parseFloat((item.qty * item.price * (1 - (item.itemDiscount || 0) / 100)).toFixed(2)),
      origem_mercadoria: prod.origem || '0', icms_situacao_tributaria: cst,
      pis_situacao_tributaria: '07', cofins_situacao_tributaria: '07',
    };
  }).filter(Boolean);

  const payload = {
    natureza_operacao: 'Venda de mercadoria', forma_pagamento: 0, tipo_documento: 1, local_destino: 1,
    cnpj_emitente: (company.cnpj || '').replace(/\D/g, ''), nome_emitente: company.name,
    logradouro_emitente: company.address || '', municipio_emitente: company.city || '',
    uf_emitente: company.uf || '', cep_emitente: (company.cep || '').replace(/\D/g, '') || '00000000',
    regime_tributario_emitente: company.regime || '1', inscricao_estadual_emitente: company.ie || 'ISENTO',
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
    valor_frete: invoice.freight || 0, valor_total: invoice.total,
    forma_de_pagamento: [{ forma_pagamento: '01', valor: invoice.total }], items: itens,
  };

  try {
    const base = _baseUrl(auth.env);
    const resp = await fetch(`${base}/v2/nfe/preview`, {
      method: 'POST',
      headers: _authHeaders(auth.token),
      body: JSON.stringify(payload),
    });
    const data = await resp.json();
    if (resp.ok) return { success: true, danfeUrl: data.caminho_danfe || data.danfe_url, data };
    return { success: false, error: data.mensagem || 'Erro na pré-visualização.' };
  } catch (e) {
    return { success: false, error: 'Erro: ' + e.message };
  }
}

// ─── Inutilizar Numeração ─────────────────────────────────────────────────────

async function inutilizarNumeracao(cnpj, serie, numeroInicial, numeroFinal, justificativa, company) {
  const auth = _getAuth(company);
  if (!auth) return { success: false, error: 'Token não configurado.' };
  if (!cnpj || !serie || numeroInicial == null || numeroFinal == null) return { success: false, error: 'CNPJ, série e faixa de numeração são obrigatórios.' };
  if (!justificativa || justificativa.length < 15) return { success: false, error: 'Justificativa deve ter no mínimo 15 caracteres.' };

  try {
    const base = _baseUrl(auth.env);
    const resp = await fetch(`${base}/v2/nfe/inutilizar`, {
      method: 'POST',
      headers: _authHeaders(auth.token),
      body: JSON.stringify({
        cnpj: cnpj.replace(/\D/g, ''),
        serie: String(serie),
        numero_inicial: Number(numeroInicial),
        numero_final: Number(numeroFinal),
        justificativa,
      }),
    });
    const data = await resp.json();
    if (resp.ok) return { success: true, protocolo: data.protocolo, data };
    return { success: false, error: data.mensagem || 'Erro ao inutilizar numeração.' };
  } catch (e) {
    return { success: false, error: 'Erro: ' + e.message };
  }
}

// ─── Importar NF-e (XML próprio) ──────────────────────────────────────────────

async function importarNFe(xmlContent, company) {
  const auth = _getAuth(company);
  if (!auth) return { success: false, error: 'Token não configurado.' };
  if (!xmlContent) return { success: false, error: 'XML é obrigatório.' };

  try {
    const base = _baseUrl(auth.env);
    // Focus aceita o XML como string no campo 'xml'
    const resp = await fetch(`${base}/v2/nfe/importar`, {
      method: 'POST',
      headers: _authHeaders(auth.token),
      body: JSON.stringify({ xml: xmlContent }),
    });
    const data = await resp.json();
    if (resp.ok) return { success: true, chave: data.chave_nfe, data };
    return { success: false, error: data.mensagem || 'Erro ao importar NF-e.' };
  } catch (e) {
    return { success: false, error: 'Erro: ' + e.message };
  }
}

// ─── Consultas Auxiliares ─────────────────────────────────────────────────────

async function consultarCEP(cep, company) {
  const auth = _getAuth(company);
  if (!auth) return { error: 'Token não configurado.' };
  const cepLimpo = (cep || '').replace(/\D/g, '');
  if (cepLimpo.length !== 8) return { error: 'CEP deve ter 8 dígitos.' };
  try {
    const base = _baseUrl(auth.env);
    const resp = await fetch(`${base}/v2/cep/${cepLimpo}`, {
      headers: { 'Authorization': 'Basic ' + btoa(auth.token + ':') },
    });
    return await resp.json();
  } catch (e) {
    return { error: e.message };
  }
}

async function consultarNCM(codigo, company) {
  const auth = _getAuth(company);
  if (!auth) return { error: 'Token não configurado.' };
  const cod = (codigo || '').replace(/\D/g, '');
  if (!cod) return { error: 'Informe um código NCM.' };
  try {
    const base = _baseUrl(auth.env);
    const resp = await fetch(`${base}/v2/ncm/${cod}`, {
      headers: { 'Authorization': 'Basic ' + btoa(auth.token + ':') },
    });
    return await resp.json();
  } catch (e) {
    return { error: e.message };
  }
}

async function consultarCNPJ(cnpj, company) {
  const auth = _getAuth(company);
  if (!auth) return { error: 'Token não configurado.' };
  const c = (cnpj || '').replace(/\D/g, '');
  if (c.length !== 14) return { error: 'CNPJ deve ter 14 dígitos.' };
  try {
    const base = _baseUrl(auth.env);
    const resp = await fetch(`${base}/v2/cnpj/${c}`, {
      headers: { 'Authorization': 'Basic ' + btoa(auth.token + ':') },
    });
    return await resp.json();
  } catch (e) {
    return { error: e.message };
  }
}

// ─── NF-e Recebidas (entrada) ─────────────────────────────────────────────────

async function listarNFeRecebidas(company, versao) {
  const auth = _getAuth(company);
  if (!auth) return { error: 'Token não configurado.' };
  try {
    const base = _baseUrl(auth.env);
    let url = `${base}/v2/nfes_recebidas`;
    if (versao) url += `?versao=${versao}`;
    const resp = await fetch(url, {
      headers: { 'Authorization': 'Basic ' + btoa(auth.token + ':') },
    });
    const data = await resp.json();
    return {
      notas: Array.isArray(data) ? data : (data.notas || data),
      total: resp.headers.get('X-Total-Count'),
      maxVersao: resp.headers.get('X-Max-Version'),
    };
  } catch (e) {
    return { error: e.message };
  }
}

async function consultarNFeRecebida(chave, company) {
  const auth = _getAuth(company);
  if (!auth) return { error: 'Token não configurado.' };
  try {
    const base = _baseUrl(auth.env);
    const resp = await fetch(`${base}/v2/nfes_recebidas/${chave}.json`, {
      headers: { 'Authorization': 'Basic ' + btoa(auth.token + ':') },
    });
    return await resp.json();
  } catch (e) {
    return { error: e.message };
  }
}

async function baixarXMLNFeRecebida(chave, company) {
  const auth = _getAuth(company);
  if (!auth) return { error: 'Token não configurado.' };
  try {
    const base = _baseUrl(auth.env);
    const resp = await fetch(`${base}/v2/nfes_recebidas/${chave}.xml`, {
      headers: { 'Authorization': 'Basic ' + btoa(auth.token + ':') },
    });
    return await resp.text();
  } catch (e) {
    return { error: e.message };
  }
}

async function manifestarNFe(chave, tipo, justificativa, company) {
  const auth = _getAuth(company);
  if (!auth) return { success: false, error: 'Token não configurado.' };
  const tiposValidos = { ciencia: 'ciencia_da_operacao', desconhecimento: 'desconhecimento_da_operacao', confirmacao: 'operacao_realizada', nao_realizada: 'operacao_nao_realizada' };
  const tipoEvento = tiposValidos[tipo];
  if (!tipoEvento) return { success: false, error: 'Tipo inválido. Use: ciencia, desconhecimento, confirmacao, nao_realizada.' };
  if ((tipo === 'confirmacao' || tipo === 'nao_realizada') && (!justificativa || justificativa.length < 15)) {
    return { success: false, error: 'Justificativa (min. 15 caracteres) é obrigatória para confirmação/operação não realizada.' };
  }

  try {
    const base = _baseUrl(auth.env);
    const body = { tipo: tipoEvento };
    if (justificativa) body.justificativa = justificativa;
    const resp = await fetch(`${base}/v2/nfes_recebidas/${chave}/manifesto`, {
      method: 'POST',
      headers: _authHeaders(auth.token),
      body: JSON.stringify(body),
    });
    const data = await resp.json();
    if (resp.ok) return { success: true, data };
    return { success: false, error: data.mensagem || 'Erro na manifestação.' };
  } catch (e) {
    return { success: false, error: 'Erro: ' + e.message };
  }
}

// ─── Demais Documentos Fiscais ─────────────────────────────────────────────────

// NFCe — varejo/PDV
async function emitirNFCe(payload, company) {
  const auth = _getAuth(company);
  if (!auth) return { success: false, error: 'Token não configurado.' };
  try {
    const base = _baseUrl(auth.env);
    const resp = await fetch(`${base}/v2/nfce`, {
      method: 'POST',
      headers: _authHeaders(auth.token),
      body: JSON.stringify(payload),
    });
    const data = await resp.json();
    if (data.status === 'autorizado') return { success: true, chave: data.chave_nfce || data.chave, data };
    return { success: false, error: data.mensagem || (data.erros?.[0]?.mensagem) || 'Erro ao emitir NFC-e.' };
  } catch (e) {
    return { success: false, error: 'Erro: ' + e.message };
  }
}

async function cancelarNFCe(ref, justificativa, company) {
  const auth = _getAuth(company);
  if (!auth) return { success: false, error: 'Token não configurado.' };
  try {
    const base = _baseUrl(auth.env);
    const resp = await fetch(`${base}/v2/nfce?ref=${ref}`, {
      method: 'DELETE',
      headers: _authHeaders(auth.token),
      body: JSON.stringify({ justificativa }),
    });
    const data = await resp.json();
    if (resp.ok) return { success: true, data };
    return { success: false, error: data.mensagem || 'Erro ao cancelar NFC-e.' };
  } catch (e) {
    return { success: false, error: 'Erro: ' + e.message };
  }
}

// NFS-e — serviços
async function emitirNFSe(payload, company) {
  const auth = _getAuth(company);
  if (!auth) return { success: false, error: 'Token não configurado.' };
  try {
    const base = _baseUrl(auth.env);
    const resp = await fetch(`${base}/v2/nfse?ref=nfse_${Date.now()}`, {
      method: 'POST',
      headers: _authHeaders(auth.token),
      body: JSON.stringify(payload),
    });
    const data = await resp.json();
    if (data.status === 'autorizado') return { success: true, data };
    if (data.status === 'processando') return { success: true, status: 'processando', data };
    return { success: false, error: data.mensagem || 'Erro ao emitir NFS-e.' };
  } catch (e) {
    return { success: false, error: 'Erro: ' + e.message };
  }
}

async function cancelarNFSe(ref, company) {
  const auth = _getAuth(company);
  if (!auth) return { success: false, error: 'Token não configurado.' };
  try {
    const base = _baseUrl(auth.env);
    const resp = await fetch(`${base}/v2/nfse?ref=${ref}`, {
      method: 'DELETE',
      headers: _authHeaders(auth.token),
    });
    const data = await resp.json();
    if (resp.ok) return { success: true, data };
    return { success: false, error: data.mensagem || 'Erro ao cancelar NFS-e.' };
  } catch (e) {
    return { success: false, error: 'Erro: ' + e.message };
  }
}

// CT-e — conhecimento de transporte
async function emitirCTe(payload, company) {
  const auth = _getAuth(company);
  if (!auth) return { success: false, error: 'Token não configurado.' };
  try {
    const base = _baseUrl(auth.env);
    const ref = `cte_${Date.now()}`;
    const resp = await fetch(`${base}/v2/cte?ref=${ref}`, {
      method: 'POST',
      headers: _authHeaders(auth.token),
      body: JSON.stringify(payload),
    });
    const data = await resp.json();
    if (data.status === 'autorizado') return { success: true, chave: data.chave_cte || data.chave, data };
    if (data.status === 'processando') return { success: true, status: 'processando', focusRef: ref, data };
    return { success: false, error: data.mensagem || 'Erro ao emitir CT-e.' };
  } catch (e) {
    return { success: false, error: 'Erro: ' + e.message };
  }
}

async function cancelarCTe(ref, justificativa, company) {
  const auth = _getAuth(company);
  if (!auth) return { success: false, error: 'Token não configurado.' };
  try {
    const base = _baseUrl(auth.env);
    const resp = await fetch(`${base}/v2/cte?ref=${ref}`, {
      method: 'DELETE',
      headers: _authHeaders(auth.token),
      body: JSON.stringify({ justificativa }),
    });
    const data = await resp.json();
    if (resp.ok) return { success: true, data };
    return { success: false, error: data.mensagem || 'Erro ao cancelar CT-e.' };
  } catch (e) {
    return { success: false, error: 'Erro: ' + e.message };
  }
}

// MDFe — manifesto de documentos fiscais
async function emitirMDFe(payload, company) {
  const auth = _getAuth(company);
  if (!auth) return { success: false, error: 'Token não configurado.' };
  try {
    const base = _baseUrl(auth.env);
    const ref = `mdfe_${Date.now()}`;
    const resp = await fetch(`${base}/v2/mdfe?ref=${ref}`, {
      method: 'POST',
      headers: _authHeaders(auth.token),
      body: JSON.stringify(payload),
    });
    const data = await resp.json();
    if (data.status === 'autorizado') return { success: true, data };
    if (data.status === 'processando') return { success: true, status: 'processando', focusRef: ref, data };
    return { success: false, error: data.mensagem || 'Erro ao emitir MDF-e.' };
  } catch (e) {
    return { success: false, error: 'Erro: ' + e.message };
  }
}

async function cancelarMDFe(ref, justificativa, company) {
  const auth = _getAuth(company);
  if (!auth) return { success: false, error: 'Token não configurado.' };
  try {
    const base = _baseUrl(auth.env);
    const resp = await fetch(`${base}/v2/mdfe?ref=${ref}`, {
      method: 'DELETE',
      headers: _authHeaders(auth.token),
      body: JSON.stringify({ justificativa }),
    });
    const data = await resp.json();
    if (resp.ok) return { success: true, data };
    return { success: false, error: data.mensagem || 'Erro ao cancelar MDF-e.' };
  } catch (e) {
    return { success: false, error: 'Erro: ' + e.message };
  }
}

// ─── Central de Notificações (consulta multi-documento) ────────────────────────

async function listarNotificacoes(company, params = {}) {
  // Permite consultar status de qualquer documento por tipo/CNPJ/período
  const auth = _getAuth(company);
  if (!auth) return { error: 'Token não configurado.' };
  try {
    const base = _baseUrl(auth.env);
    const qs = new URLSearchParams(params).toString();
    const resp = await fetch(`${base}/v2/notificacoes${qs ? '?' + qs : ''}`, {
      headers: { 'Authorization': 'Basic ' + btoa(auth.token + ':') },
    });
    return await resp.json();
  } catch (e) {
    return { error: e.message };
  }
}
