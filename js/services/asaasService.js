// ─── ASAAS SERVICE ────────────────────────────────────────────────────────────
// Cobrança via Pix e Boleto usando a API Asaas
// Docs: https://docs.asaas.com
//
// Usa Firebase Function proxy (asaasProxy) para evitar CORS e manter token
// seguro no Firestore. Fallback: chamada direta (produção mesmo domínio).

var ASAAS_BASE = {
  sandbox:  'https://api-sandbox.asaas.com/v3',
  producao: 'https://api.asaas.com/v3'
};

// URL do proxy — definida em index.html via firebaseConfig
// Acessar via window.ASAAS_PROXY

async function _asaasReq(method, path, body) {
  // Tenta proxy primeiro (evita CORS, token server-side)
  if (window.ASAAS_PROXY) {
    try {
      const r = await fetch(window.ASAAS_PROXY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: window._companyId,
          method, path,
          body: body || undefined
        })
      });
      const data = await r.json();
      if (!data.success) throw new Error(data.error || 'Erro Asaas via proxy');
      return data.data;
    } catch(e) {
      console.warn('asaasProxy fallback:', e.message);
    }
  }

  // Fallback: chamada direta
  const key = state?.company?.asaasKey;
  const env = state?.company?.asaasEnv || 'sandbox';
  if (!key) throw new Error('Chave API Asaas não configurada.');
  const r = await fetch(`${ASAAS_BASE[env]}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'access_token': key },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.errors?.[0]?.description || `Erro Asaas ${r.status}`);
  return data;
}

async function _asaasUpsertCustomer(client) {
  const cpfCnpj = (client.cnpj || '').replace(/\D/g, '');
  const found = await _asaasReq('GET', `/customers?cpfCnpj=${cpfCnpj}`);
  if (found?.data?.length > 0) return found.data[0].id;
  const novo = await _asaasReq('POST', '/customers', {
    name: client.name, cpfCnpj,
    email: client.email || undefined,
    phone: client.phone || undefined
  });
  return novo.id;
}

async function asaasGerarCobranca(receivable, client, tipo) {
  const customerId = await _asaasUpsertCustomer(client);
  const externalRef = `${window._companyId}:${receivable.id}`;
  const charge = await _asaasReq('POST', '/payments', {
    customer: customerId,
    billingType: tipo,
    value: receivable.amount,
    dueDate: receivable.dueDate,
    description: `Parcela ${receivable.installment||1}/${receivable.total||1} — ${receivable.invoiceId||''}`,
    externalReference: externalRef,
  });
  if (tipo === 'PIX') {
    const pix = await _asaasReq('GET', `/payments/${charge.id}/pixQrCode`);
    return { tipo, chargeId: charge.id, invoiceUrl: charge.invoiceUrl, pixCopiaCola: pix.payload, pixImage: pix.encodedImage };
  }
  return { tipo, chargeId: charge.id, invoiceUrl: charge.invoiceUrl, boletoUrl: charge.bankSlipUrl, linhaDigitavel: charge.identificationField };
}
