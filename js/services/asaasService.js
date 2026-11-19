// ─── ASAAS SERVICE ────────────────────────────────────────────────────────────
// Cobrança via Pix e Boleto usando a API Asaas
// Docs: https://docs.asaas.com
//
// Usa Firebase Function proxy (asaasProxy) para evitar CORS e manter token
// seguro no Firestore. Fallback: chamada direta (produção mesmo domínio).

// Credenciais nunca devem sair do servidor.
// O proxy exige token Firebase e pertence exclusivamente ao tenant autenticado.
async function _asaasReq(method, path, body) {
  const user = window._auth?.currentUser;
  if (!window.ASAAS_PROXY || !user || !window._companyId) {
    throw new Error('Ambiente Asaas ou sessao nao configurados.');
  }
  const token = await user.getIdToken();
  const response = await fetch(window.ASAAS_PROXY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({
      companyId: window._companyId,
      method, path, body: body || undefined
    })
  });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.error || 'Falha no proxy Asaas');
  return result.data;
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
