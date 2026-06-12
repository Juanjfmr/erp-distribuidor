// ─── FOCUS NFe API ────────────────────────────────────────────────────────────
// Comunicação com Focus NFe via Cloud Function proxy (focusProxy) para bypass de CORS.
// O proxy lê o token do Firestore — nunca exposto ao frontend.
// Numeração atômica é feita por getNextNFNumber() em firebase.js.

// ─── Reforma Tributária do Consumo (IBS/CBS/IS) ────────────────────────────────
// Fase-teste 2026 (Art. 343 LC 214/2025): CBS 0,9% + IBS estadual 0,1%, caráter
// informativo. Ligar ATIVO só para testar em homologação.
const RTC_CONFIG = {
  ATIVO: false,            // flag mestra — com false, a EMISSÃO real não muda
  TESTE_PREVIEW: false,    // só pré-visualização: inclui campos RTC no DANFE de preview sem afetar a emissão real (validar sem certificado)
  CBS_ALIQUOTA: 0.9,       // % fase-teste 2026 — Art. 343 LC 214/2025
  IBS_UF_ALIQUOTA: 0.1,    // % fase-teste 2026 — Art. 343: IBS é integralmente estadual em 2026
  IBS_MUN_ALIQUOTA: 0,     // % município só entra em 2027-2028 (0,05%/0,05%)
  CST_PADRAO: '000',       // situação tributária IBS/CBS — tributação integral
  CCLASSTRIB_PADRAO: '000001', // classificação tributária padrão — tributação integral
};

// Calcula os campos IBS/CBS de um item a partir da sua base (valor_bruto).
// Retorna {} quando RTC_CONFIG.ATIVO é false (não altera o payload atual).
function _rtcCamposItem(prod, valorBruto, forcar) {
  if (!RTC_CONFIG.ATIVO && !forcar) return {};
  const r2 = n => parseFloat((n || 0).toFixed(2));
  const cbsValor = r2(valorBruto * RTC_CONFIG.CBS_ALIQUOTA / 100);
  const ibsUfValor = r2(valorBruto * RTC_CONFIG.IBS_UF_ALIQUOTA / 100);
  const ibsMunValor = r2(valorBruto * RTC_CONFIG.IBS_MUN_ALIQUOTA / 100);
  return {
    ibs_cbs_situacao_tributaria: RTC_CONFIG.CST_PADRAO,
    ibs_cbs_classificacao_tributaria: (prod && prod.cClassTrib) || RTC_CONFIG.CCLASSTRIB_PADRAO,
    ibs_cbs_base_calculo: r2(valorBruto),
    cbs_aliquota: RTC_CONFIG.CBS_ALIQUOTA,
    cbs_valor: cbsValor,
    ibs_uf_aliquota: RTC_CONFIG.IBS_UF_ALIQUOTA,
    ibs_uf_valor: ibsUfValor,
    ibs_mun_aliquota: RTC_CONFIG.IBS_MUN_ALIQUOTA,
    ibs_mun_valor: ibsMunValor,
  };
}

// Soma os totalizadores RTC a partir dos itens já montados. Retorna {} se inativo.
function _rtcTotais(itens, forcar) {
  if (!RTC_CONFIG.ATIVO && !forcar) return {};
  const r2 = n => parseFloat((n || 0).toFixed(2));
  const cbsTot = r2(itens.reduce((s, it) => s + (it.cbs_valor || 0), 0));
  const ibsTot = r2(itens.reduce((s, it) => s + (it.ibs_uf_valor || 0) + (it.ibs_mun_valor || 0), 0));
  // Totalizadores conforme doc canônica Focus (campos.focusnfe.com.br): separados, sem campo combinado.
  return { cbs_valor_total: cbsTot, ibs_valor_total: ibsTot, is_valor_total: 0 };
}

const FOCUS_PROXY = 'https://us-central1-erp-distribuidora-905ca.cloudfunctions.net/focusProxy';

// ─── Helper ────────────────────────────────────────────────────────────────────
// Chama o focusProxy e retorna { success, data } ou { success, error }

async function _focusCall(action, payload) {
  const companyId = (typeof state !== 'undefined' && (state?._companyId || state?.companyId || window?._companyId)) || null;
  if (!companyId) return { success: false, error: 'companyId não disponível.' };

  try {
    const resp = await fetch(FOCUS_PROXY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId, action, payload }),
    });
    const result = await resp.json();
    return result; // { success, data, error, status }
  } catch (e) {
    return { success: false, error: 'Erro de conexão com o proxy Focus NFe: ' + e.message };
  }
}

// ─── NF-e ─────────────────────────────────────────────────────────────────────

async function emitirNFe(invoice, company, products, clients) {
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
      ..._rtcCamposItem(prod, parseFloat((item.qty * item.price * (1 - (item.itemDiscount || 0) / 100)).toFixed(2))),
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
    ..._rtcTotais(itens),
  };

  const ref = `nfe_${invoice.id}`;
  const result = await _focusCall('emitir_nfe', { ...payload, ref });
  const data = result.data;

  if (!result.success) return { success: false, error: result.error || 'Erro ao emitir NF-e.' };
  if (data?.status === 'autorizado') return { success: true, chave: data.chave_nfe || data.chave, danfeUrl: data.caminho_danfe || data.danfe_url || null, numero: data.numero, serie: data.serie, focusRef: ref };
  if (data?.status === 'processando' || data?.status === 'aguardando_autorizacao') return await _aguardarAutorizacao(ref);
  return { success: false, error: data?.mensagem || (data?.erros?.[0]?.mensagem) || 'Erro ao emitir NF-e.' };
}

async function cancelarNFe(focusRef, justificativa, company) {
  if ((justificativa || '').length < 15) return { success: false, error: 'Justificativa deve ter no mínimo 15 caracteres.' };
  const result = await _focusCall('cancelar_nfe', { ref: focusRef, justificativa });
  if (!result.success) return { success: false, error: result.error || 'Erro ao cancelar NF-e.' };
  return result.data?.status === 'cancelado' ? { success: true } : { success: true, data: result.data };
}

async function consultarNFe(focusRef) {
  const result = await _focusCall('consultar_nfe', { ref: focusRef });
  return result.success ? result.data : { error: result.error };
}

async function _aguardarAutorizacao(ref, maxTentativas = 10, intervalo = 3000) {
  for (let i = 0; i < maxTentativas; i++) {
    await new Promise(r => setTimeout(r, intervalo));
    const result = await _focusCall('consultar_nfe', { ref });
    const data = result.data;
    if (data?.status === 'autorizado') return { success: true, chave: data.chave_nfe || data.chave, danfeUrl: data.caminho_danfe || data.danfe_url || null, numero: data.numero, serie: data.serie, focusRef: ref };
    if (data?.status === 'erro' || data?.status === 'cancelado' || data?.status === 'denegado') return { success: false, error: data.mensagem || `NF-e retornou status: ${data.status}` };
  }
  return { success: false, error: 'Tempo esgotado aguardando autorização da SEFAZ.' };
}

// ─── Carta de Correção (CCe) ──────────────────────────────────────────────────

async function cartaCorrecaoNFe(focusRef, correcao) {
  if (!correcao || correcao.length < 15) return { success: false, error: 'Texto de correção deve ter no mínimo 15 caracteres.' };
  const result = await _focusCall('carta_correcao', { ref: focusRef, carta_correcao: correcao });
  return result.success ? { success: true, protocolo: result.data?.protocolo, data: result.data } : { success: false, error: result.error };
}

// ─── Enviar NF por Email ──────────────────────────────────────────────────────

async function enviarNFeEmail(focusRef, emails) {
  if (!emails || !emails.length) return { success: false, error: 'Informe ao menos um email.' };
  const result = await _focusCall('enviar_email', { ref: focusRef, emails: emails.slice(0, 10) });
  return result.success ? { success: true, enviados: emails } : { success: false, error: result.error };
}

// ─── Pré-visualização DANFe ───────────────────────────────────────────────────

async function previsualizarDANFe(invoice, company, products, clients) {
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
    return { numero_item: idx + 1, codigo_produto: prod.code || String(prod.id), descricao: prod.name, codigo_ncm: (prod.ncm || '').replace(/\D/g, ''), cfop, unidade_comercial: prod.unit || 'UN', quantidade_comercial: item.qty, valor_unitario_comercial: item.price, valor_bruto: parseFloat((item.qty * item.price * (1 - (item.itemDiscount || 0) / 100)).toFixed(2)), origem_mercadoria: prod.origem || '0', icms_situacao_tributaria: cst, pis_situacao_tributaria: '07', cofins_situacao_tributaria: '07',
      ..._rtcCamposItem(prod, parseFloat((item.qty * item.price * (1 - (item.itemDiscount || 0) / 100)).toFixed(2)), RTC_CONFIG.TESTE_PREVIEW),
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
    ..._rtcTotais(itens, RTC_CONFIG.TESTE_PREVIEW),
  };

  const result = await _focusCall('previsualizar', payload);
  return result.success ? { success: true, danfeUrl: result.data?.caminho_danfe || result.data?.danfe_url, data: result.data } : { success: false, error: result.error };
}

// ─── Inutilizar Numeração ─────────────────────────────────────────────────────

async function inutilizarNumeracao(cnpj, serie, numeroInicial, numeroFinal, justificativa) {
  if (!cnpj || !serie || numeroInicial == null || numeroFinal == null) return { success: false, error: 'CNPJ, série e faixa são obrigatórios.' };
  if (!justificativa || justificativa.length < 15) return { success: false, error: 'Justificativa deve ter no mínimo 15 caracteres.' };
  const result = await _focusCall('inutilizar', { cnpj: cnpj.replace(/\D/g, ''), serie: String(serie), numero_inicial: Number(numeroInicial), numero_final: Number(numeroFinal), justificativa });
  return result.success ? { success: true, protocolo: result.data?.protocolo, data: result.data } : { success: false, error: result.error };
}

// ─── Importar NF-e ────────────────────────────────────────────────────────────

async function importarNFe(xmlContent) {
  if (!xmlContent) return { success: false, error: 'XML é obrigatório.' };
  const result = await _focusCall('importar_nfe', { xml: xmlContent });
  return result.success ? { success: true, chave: result.data?.chave_nfe, data: result.data } : { success: false, error: result.error };
}

// ─── Consultas Auxiliares ─────────────────────────────────────────────────────

async function consultarCEP(cep) {
  const cepLimpo = (cep || '').replace(/\D/g, '');
  if (cepLimpo.length !== 8) return { error: 'CEP deve ter 8 dígitos.' };
  const result = await _focusCall('consultar_cep', { codigo: cepLimpo });
  return result.success ? result.data : { error: result.error };
}

async function consultarNCM(codigo) {
  const cod = (codigo || '').replace(/\D/g, '');
  if (!cod) return { error: 'Informe um código NCM.' };
  const result = await _focusCall('consultar_ncm', { codigo: cod });
  return result.success ? result.data : { error: result.error };
}

async function consultarCNPJ(cnpj) {
  const c = (cnpj || '').replace(/\D/g, '');
  if (c.length !== 14) return { error: 'CNPJ deve ter 14 dígitos.' };
  const result = await _focusCall('consultar_cnpj', { codigo: c });
  return result.success ? result.data : { error: result.error };
}

// ─── NF-e Recebidas ───────────────────────────────────────────────────────────

async function listarNFeRecebidas(versao) {
  const result = await _focusCall('listar_recebidas', versao ? { versao } : {});
  const notas = Array.isArray(result.data) ? result.data : (result.data?.notas || result.data || []);
  return { notas, total: result.data?.total, maxVersao: result.data?.maxVersao };
}

async function consultarNFeRecebida(chave) {
  const result = await _focusCall('consultar_recebida', { chave });
  return result.success ? result.data : { error: result.error };
}

async function manifestarNFe(chave, tipo, justificativa) {
  const tiposValidos = { ciencia: 'ciencia_da_operacao', desconhecimento: 'desconhecimento_da_operacao', confirmacao: 'operacao_realizada', nao_realizada: 'operacao_nao_realizada' };
  const tipoEvento = tiposValidos[tipo];
  if (!tipoEvento) return { success: false, error: 'Tipo inválido.' };
  if ((tipo === 'confirmacao' || tipo === 'nao_realizada') && (!justificativa || justificativa.length < 15)) return { success: false, error: 'Justificativa é obrigatória.' };
  const body = { tipo: tipoEvento };
  if (justificativa) body.justificativa = justificativa;
  const result = await _focusCall('manifestar', { chave, ...body });
  return result.success ? { success: true, data: result.data } : { success: false, error: result.error };
}

// ─── Demais Documentos Fiscais ─────────────────────────────────────────────────

async function emitirNFCe(payload) {
  const ref = `nfce_${Date.now()}`;
  const result = await _focusCall('emitir_nfce', { ...payload, ref });
  if (!result.success) return { success: false, error: result.error };
  return result.data?.status === 'autorizado' ? { success: true, chave: result.data?.chave_nfce || result.data?.chave, data: result.data } : { success: true, status: 'processando', data: result.data };
}

async function cancelarNFCe(ref, justificativa) {
  const result = await _focusCall('cancelar_nfce', { ref, justificativa });
  return result.success ? { success: true, data: result.data } : { success: false, error: result.error };
}

async function emitirNFSe(payload) {
  const ref = `nfse_${Date.now()}`;
  const result = await _focusCall('emitir_nfse', { ...payload, ref });
  if (!result.success) return { success: false, error: result.error };
  return result.data?.status === 'autorizado' ? { success: true, data: result.data } : { success: true, status: 'processando', data: result.data };
}

async function cancelarNFSe(ref) {
  const result = await _focusCall('cancelar_nfse', { ref });
  return result.success ? { success: true, data: result.data } : { success: false, error: result.error };
}

async function emitirCTe(payload) {
  const ref = `cte_${Date.now()}`;
  const result = await _focusCall('emitir_cte', { ...payload, ref });
  if (!result.success) return { success: false, error: result.error };
  return result.data?.status === 'autorizado' ? { success: true, chave: result.data?.chave_cte || result.data?.chave, data: result.data } : { success: true, status: 'processando', focusRef: ref, data: result.data };
}

async function cancelarCTe(ref, justificativa) {
  const result = await _focusCall('cancelar_cte', { ref, justificativa });
  return result.success ? { success: true, data: result.data } : { success: false, error: result.error };
}

async function emitirMDFe(payload) {
  const ref = `mdfe_${Date.now()}`;
  const result = await _focusCall('emitir_mdfe', { ...payload, ref });
  if (!result.success) return { success: false, error: result.error };
  return result.data?.status === 'autorizado' ? { success: true, data: result.data } : { success: true, status: 'processando', focusRef: ref, data: result.data };
}

async function cancelarMDFe(ref, justificativa) {
  const result = await _focusCall('cancelar_mdfe', { ref, justificativa });
  return result.success ? { success: true, data: result.data } : { success: false, error: result.error };
}
