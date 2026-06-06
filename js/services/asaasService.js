// ─── ASAAS SERVICE ────────────────────────────────────────────────────────────
// Cobrança via Pix e Boleto usando a API Asaas
// Docs: https://docs.asaas.com

var ASAAS_BASE = {
  sandbox:  'https://sandbox.asaas.com/api/v3',
  producao: 'https://www.asaas.com/api/v3'
};

async function _asaasReq(method, path, body) {
  const key = state?.company?.asaasKey;
  const env = state?.company?.asaasEnv || 'sandbox';
  if (!key) throw new Error('Chave API Asaas não configurada. Acesse Configurações → Financeiro.');
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
    name: client.name,
    cpfCnpj,
    email: client.email || undefined,
    phone:  client.phone  || undefined
  });
  return novo.id;
}

async function asaasGerarCobranca(receivable, client, tipo) {
  // tipo: 'PIX' ou 'BOLETO'
  const customerId = await _asaasUpsertCustomer(client);
  const charge = await _asaasReq('POST', '/payments', {
    customer:    customerId,
    billingType: tipo,
    value:       receivable.amount,
    dueDate:     receivable.dueDate,
    description: `Parcela ${receivable.installment||1}/${receivable.total||1} — ${receivable.invoiceId||''}`
  });
  if (tipo === 'PIX') {
    const pix = await _asaasReq('GET', `/payments/${charge.id}/pixQrCode`);
    return { tipo, chargeId: charge.id, invoiceUrl: charge.invoiceUrl, pixCopiaCola: pix.payload, pixImage: pix.encodedImage };
  }
  return { tipo, chargeId: charge.id, invoiceUrl: charge.invoiceUrl, boletoUrl: charge.bankSlipUrl, linhaDigitavel: charge.identificationField };
}
