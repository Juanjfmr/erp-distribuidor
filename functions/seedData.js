// functions/seedData.js
// One-shot callable function — popula uma empresa com dados realistas.
// Chamar via frontend: httpsCallable(functions, 'seedData')({ email: 'juanjfmr1@gmail.com' })
const functions = require('firebase-functions');
const admin = require('firebase-admin');

const db = admin.firestore();

// ─── Helpers ─────────────────────────────────────────────────────────────────
const uid = () => Date.now() + Math.floor(Math.random() * 99999);
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pickN = (arr, n) => {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
};
const fmtDate = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return fmtDate(r); };

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const START_DATE = new Date('2025-06-06'); // 1 ano atrás
const END_DATE = new Date('2026-06-06');

const CATEGORIES = ['Bebidas', 'Alimentos', 'Limpeza', 'Higiene', 'Congelados', 'Descartáveis'];

const PRODUCTS = [
  // Cervejas
  { name: 'Cerveja Brahma 350ml', unit: 'UN', costPrice: 3.20, salePrice: 5.50, ean: '7891149100011', category: 'Bebidas', stock: 240 },
  { name: 'Cerveja Skol 350ml', unit: 'UN', costPrice: 3.10, salePrice: 5.30, ean: '7891149100022', category: 'Bebidas', stock: 350 },
  { name: 'Cerveja Antarctica 350ml', unit: 'UN', costPrice: 2.90, salePrice: 4.90, ean: '7891149100033', category: 'Bebidas', stock: 180 },
  { name: 'Cerveja Heineken 330ml', unit: 'UN', costPrice: 5.80, salePrice: 9.90, ean: '7891149100044', category: 'Bebidas', stock: 120 },
  { name: 'Cerveja Budweiser 350ml', unit: 'UN', costPrice: 3.50, salePrice: 5.90, ean: '7891149100055', category: 'Bebidas', stock: 200 },
  { name: 'Cerveja Original 600ml', unit: 'UN', costPrice: 6.50, salePrice: 10.90, ean: '7891149100066', category: 'Bebidas', stock: 90 },
  { name: 'Cerveja Brahma Duplo Malte 350ml', unit: 'UN', costPrice: 3.60, salePrice: 6.20, ean: '7891149100077', category: 'Bebidas', stock: 160 },
  { name: 'Cerveja Corona 330ml', unit: 'UN', costPrice: 5.50, salePrice: 9.50, ean: '7891149100088', category: 'Bebidas', stock: 75 },
  // Refrigerantes
  { name: 'Coca-Cola 2L', unit: 'UN', costPrice: 5.20, salePrice: 9.00, ean: '7891149100100', category: 'Bebidas', stock: 300 },
  { name: 'Coca-Cola Lata 350ml', unit: 'UN', costPrice: 2.60, salePrice: 4.50, ean: '7891149100111', category: 'Bebidas', stock: 480 },
  { name: 'Guaraná Antarctica 2L', unit: 'UN', costPrice: 4.30, salePrice: 7.50, ean: '7891149100122', category: 'Bebidas', stock: 200 },
  { name: 'Fanta Laranja 2L', unit: 'UN', costPrice: 4.20, salePrice: 7.20, ean: '7891149100133', category: 'Bebidas', stock: 150 },
  { name: 'Sprite 2L', unit: 'UN', costPrice: 4.20, salePrice: 7.20, ean: '7891149100144', category: 'Bebidas', stock: 140 },
  { name: 'Coca-Cola Zero 2L', unit: 'UN', costPrice: 5.20, salePrice: 9.00, ean: '7891149100155', category: 'Bebidas', stock: 100 },
  // Águas
  { name: 'Água Mineral Crystal 500ml', unit: 'UN', costPrice: 0.80, salePrice: 2.00, ean: '7891149100200', category: 'Bebidas', stock: 600 },
  { name: 'Água Mineral Crystal 1.5L', unit: 'UN', costPrice: 1.20, salePrice: 3.00, ean: '7891149100211', category: 'Bebidas', stock: 400 },
  { name: 'Água com Gás Crystal 500ml', unit: 'UN', costPrice: 1.00, salePrice: 2.50, ean: '7891149100222', category: 'Bebidas', stock: 250 },
  // Energéticos
  { name: 'Red Bull 250ml', unit: 'UN', costPrice: 7.00, salePrice: 13.00, ean: '7891149100300', category: 'Bebidas', stock: 100 },
  { name: 'Monster Energy 473ml', unit: 'UN', costPrice: 6.00, salePrice: 11.00, ean: '7891149100311', category: 'Bebidas', stock: 80 },
  // Sucos
  { name: 'Suco Del Valle Uva 1L', unit: 'UN', costPrice: 3.80, salePrice: 6.50, ean: '7891149100400', category: 'Bebidas', stock: 120 },
  { name: 'Suco Del Valle Laranja 1L', unit: 'UN', costPrice: 3.80, salePrice: 6.50, ean: '7891149100411', category: 'Bebidas', stock: 130 },
  // Alimentos
  { name: 'Arroz Tio João 5kg', unit: 'UN', costPrice: 16.00, salePrice: 25.00, ean: '7891149100500', category: 'Alimentos', stock: 80 },
  { name: 'Feijão Carioca Camil 1kg', unit: 'UN', costPrice: 5.50, salePrice: 9.00, ean: '7891149100511', category: 'Alimentos', stock: 120 },
  { name: 'Macarrão Adria Espaguete 500g', unit: 'UN', costPrice: 2.50, salePrice: 4.50, ean: '7891149100522', category: 'Alimentos', stock: 200 },
  { name: 'Óleo de Soja Liza 900ml', unit: 'UN', costPrice: 5.80, salePrice: 9.50, ean: '7891149100533', category: 'Alimentos', stock: 150 },
  { name: 'Açúcar Cristal União 1kg', unit: 'UN', costPrice: 2.80, salePrice: 4.80, ean: '7891149100544', category: 'Alimentos', stock: 180 },
  { name: 'Café Pilão 500g', unit: 'UN', costPrice: 12.00, salePrice: 19.50, ean: '7891149100555', category: 'Alimentos', stock: 100 },
  // Limpeza
  { name: 'Detergente Ypê 500ml', unit: 'UN', costPrice: 1.20, salePrice: 2.50, ean: '7891149100600', category: 'Limpeza', stock: 300 },
  { name: 'Sabão em Pó Omo 1kg', unit: 'UN', costPrice: 8.50, salePrice: 14.00, ean: '7891149100611', category: 'Limpeza', stock: 100 },
  { name: 'Água Sanitária Qboa 2L', unit: 'UN', costPrice: 2.00, salePrice: 4.00, ean: '7891149100622', category: 'Limpeza', stock: 200 },
  { name: 'Desinfetante Pinho Sol 500ml', unit: 'UN', costPrice: 3.50, salePrice: 6.00, ean: '7891149100633', category: 'Limpeza', stock: 120 },
  // Higiene
  { name: 'Papel Higiênico Neve 4un', unit: 'PCT', costPrice: 3.80, salePrice: 6.50, ean: '7891149100700', category: 'Higiene', stock: 200 },
  { name: 'Shampoo Seda 325ml', unit: 'UN', costPrice: 7.00, salePrice: 12.00, ean: '7891149100711', category: 'Higiene', stock: 80 },
  { name: 'Creme Dental Colgate 90g', unit: 'UN', costPrice: 2.50, salePrice: 4.50, ean: '7891149100722', category: 'Higiene', stock: 150 },
  { name: 'Sabonete Lux 85g', unit: 'UN', costPrice: 1.30, salePrice: 2.50, ean: '7891149100733', category: 'Higiene', stock: 250 },
];

const CLIENTS = [
  { name: 'Mercadinho São João', cnpj: '12.345.678/0001-01', city: 'Manaus', uf: 'AM', phone: '(92) 3234-1001', email: 'contato@mercadinhosaojoao.com', creditLimit: 5000 },
  { name: 'Bar do Zé', cnpj: '23.456.789/0001-12', city: 'Manaus', uf: 'AM', phone: '(92) 3234-2002', email: 'bar@zedoze.com', creditLimit: 8000 },
  { name: 'Restaurante Sabor do Norte', cnpj: '34.567.890/0001-23', city: 'Manaus', uf: 'AM', phone: '(92) 3234-3003', email: 'contato@sabordnorte.com', creditLimit: 3000 },
  { name: 'Distribuidora Rio Negro', cnpj: '45.678.901/0001-34', city: 'Manaus', uf: 'AM', phone: '(92) 3234-4004', email: 'vendas@rionegro.com', creditLimit: 15000 },
  { name: 'Supermercado Econômico', cnpj: '56.789.012/0001-45', city: 'Manaus', uf: 'AM', phone: '(92) 3234-5005', email: 'adm@economico.com', creditLimit: 10000 },
  { name: 'Padaria Pão Quente', cnpj: '67.890.123/0001-56', city: 'Manaus', uf: 'AM', phone: '(92) 3234-6006', email: 'pao@paoquente.com', creditLimit: 2000 },
  { name: 'Hotel Amazonas Palace', cnpj: '78.901.234/0001-67', city: 'Manaus', uf: 'AM', phone: '(92) 3234-7007', email: 'compras@amazonaspalace.com', creditLimit: 8000 },
  { name: 'Lanchonete Big X', cnpj: '89.012.345/0001-78', city: 'Manaus', uf: 'AM', phone: '(92) 3234-8008', email: 'contato@bigx.com', creditLimit: 4000 },
  { name: 'Mercadinho Bela Vista', cnpj: '90.123.456/0001-89', city: 'Manaus', uf: 'AM', phone: '(92) 3234-9009', email: 'belavista@mercado.com', creditLimit: 3500 },
  { name: 'Bar e Restaurante Central', cnpj: '01.234.567/0001-90', city: 'Manaus', uf: 'AM', phone: '(92) 3235-1010', email: 'central@bar.com', creditLimit: 6000 },
  { name: 'Empório da Roça', cnpj: '11.223.344/0001-55', city: 'Iranduba', uf: 'AM', phone: '(92) 3235-2020', email: 'contato@emporiodaroca.com', creditLimit: 4500 },
  { name: 'Atacadão do Norte', cnpj: '22.334.455/0001-66', city: 'Manaus', uf: 'AM', phone: '(92) 3235-3030', email: 'vendas@atacadaonorte.com', creditLimit: 20000 },
];

const SUPPLIERS = [
  { name: 'Ambev Distribuidora', cnpj: '07.526.557/0001-00', city: 'Manaus', uf: 'AM', phone: '(92) 2123-1000', email: 'vendas.manaus@ambev.com' },
  { name: 'Coca-Cola Brasil Manaus', cnpj: '45.997.418/0001-53', city: 'Manaus', uf: 'AM', phone: '(92) 2123-2000', email: 'pedidos.mao@coca-cola.com' },
  { name: 'Atacadão Distribuição', cnpj: '12.345.678/0001-99', city: 'Manaus', uf: 'AM', phone: '(92) 2123-3000', email: 'vendas@atacadaodis.com' },
];

const PAY_METHODS = ['PIX', 'Boleto', 'Dinheiro', 'Cartão de Débito', 'Cartão de Crédito'];

// ─── Geradores ────────────────────────────────────────────────────────────────
function generateInvoice(id, client, products, date) {
  const numItems = randomInt(3, 12);
  const items = [];
  for (let i = 0; i < numItems; i++) {
    const p = pick(products);
    const qty = randomInt(1, p.category === 'Bebidas' ? 24 : 10);
    const discount = Math.random() < 0.15 ? parseFloat((Math.random() * 0.1 * p.salePrice).toFixed(2)) : 0;
    items.push({
      productId: p.id, name: p.name, unit: p.unit, qty,
      price: p.salePrice, itemDiscount: discount
    });
  }
  const subtotal = items.reduce((s, i) => s + (i.price * i.qty - i.itemDiscount * i.qty), 0);
  const freight = Math.random() < 0.3 ? parseFloat((randomInt(20, 80)).toFixed(2)) : 0;
  const totalDiscount = parseFloat((Math.random() < 0.1 ? subtotal * 0.05 : 0).toFixed(2));
  const total = parseFloat((subtotal + freight - totalDiscount).toFixed(2));
  const statuses = ['emitida', 'emitida', 'emitida', 'emitida', 'cancelada'];
  const status = pick(statuses);
  const payMethod = pick(PAY_METHODS);
  const terms = pick(['À Vista', '7 dias', '14 dias', '21 dias', '28 dias', '30 dias', '30/60']);
  const taxCosts = Math.random() < 0.2 ? [{ desc: 'Logística', value: 15.00, rateado: true }, { desc: 'Embalagem', value: 8.50, rateado: false }] : [];

  return {
    id, number: `NF-${String(id).padStart(4, '0')}`,
    clientId: client.id, clientName: client.name,
    date: fmtDate(date), payMethod, terms, status,
    items, subtotal, freight, totalDiscount, total,
    taxCosts, paidAt: status === 'emitida' && terms === 'À Vista' ? fmtDate(date) : null,
  };
}

function generateReceivables(invoice, date) {
  const terms = invoice.terms;
  const receivables = [];
  let dates = [], shares = [];
  if (terms === 'À Vista') { dates = [fmtDate(date)]; shares = [1]; }
  else if (terms === '7 dias') { dates = [addDays(date, 7)]; shares = [1]; }
  else if (terms === '14 dias') { dates = [addDays(date, 14)]; shares = [1]; }
  else if (terms === '21 dias') { dates = [addDays(date, 21)]; shares = [1]; }
  else if (terms === '28 dias') { dates = [addDays(date, 28)]; shares = [1]; }
  else if (terms === '30 dias') { dates = [addDays(date, 30)]; shares = [1]; }
  else if (terms === '30/60') { dates = [addDays(date, 30), addDays(date, 60)]; shares = [0.5, 0.5]; }
  else { dates = [fmtDate(date)]; shares = [1]; }

  dates.forEach((d, i) => {
    const amount = parseFloat((invoice.total * shares[i]).toFixed(2));
    const isPaid = d < fmtDate(new Date());
    receivables.push({
      id: uid(), invoiceId: invoice.id, invoiceNumber: invoice.number,
      clientId: invoice.clientId,
      dueDate: d, amount, installment: i + 1, total: dates.length,
      status: isPaid ? 'paga' : 'aberta',
      paidAt: isPaid ? addDays(new Date(d), randomInt(-5, 2)) : null,
    });
  });
  return receivables;
}

function generatePurchase(id, supplier, products, date) {
  const numItems = randomInt(4, 10);
  const items = [];
  for (let i = 0; i < numItems; i++) {
    const p = pick(products);
    const qty = randomInt(10, 60);
    items.push({ productId: p.id, name: p.name, qty, cost: p.costPrice, unit: p.unit || 'UN' });
  }
  const total = parseFloat(items.reduce((s, i) => s + i.cost * i.qty, 0).toFixed(2));
  const terms = pick(['30', '30/60', 'À Vista']);
  return { id, number: `OC-${String(id).padStart(4, '0')}`, supplierId: supplier.id, supplierName: supplier.name, date: fmtDate(date), terms, status: 'confirmada', items, total };
}

function generatePayables(purchase, date) {
  const terms = purchase.terms;
  const payables = [];
  let dates = [], shares = [];
  if (!terms || terms === 'À Vista') { dates = [fmtDate(date)]; shares = [1]; }
  else if (terms === '30') { dates = [addDays(date, 30)]; shares = [1]; }
  else if (terms === '30/60') { dates = [addDays(date, 30), addDays(date, 60)]; shares = [0.5, 0.5]; }
  else { dates = [addDays(date, 30)]; shares = [1]; }

  dates.forEach((d, i) => {
    const amount = parseFloat((purchase.total * shares[i]).toFixed(2));
    const isPaid = d < fmtDate(new Date());
    payables.push({
      id: uid(), purchaseId: purchase.id, purchaseNumber: purchase.number,
      supplierId: purchase.supplierId,
      dueDate: d, amount, installment: i + 1, total: dates.length,
      status: isPaid ? 'paga' : 'aberta',
      paidAt: isPaid ? addDays(new Date(d), randomInt(-3, 1)) : null,
    });
  });
  return payables;
}

// ─── Seed principal ───────────────────────────────────────────────────────────
exports.seedData = functions.runWith({ secrets: [], timeoutSeconds: 540 }).https.onCall(async (data, context) => {
  // Aceita companyId direto (admin) ou email via auth
  let companyId = data.companyId;
  let userEmail = data.email;

  if (!companyId && context.auth) {
    // Modo normal: auth + email
    if (!userEmail) throw new functions.https.HttpsError('invalid-argument', 'Informe o email ou companyId.');

    const usersSnap = await db.collection('users').where('email', '==', userEmail).get();
    if (usersSnap.empty) throw new functions.https.HttpsError('not-found', 'Usuário não encontrado.');
    companyId = usersSnap.docs[0].data().companyId;
  }

  if (!companyId) throw new functions.https.HttpsError('invalid-argument', 'Informe companyId ou email.');

  // Busca empresa
  const companySnap = await db.collection('empresas').doc(companyId).get();
  if (!companySnap.exists) throw new functions.https.HttpsError('not-found', 'Empresa não encontrada.');

  console.log(`Seeding data for companyId: ${companyId}${userEmail ? ', email: ' + userEmail : ''}`);

  // ─── Atualiza dados da empresa ─────────────────────────────────────────────
  await db.collection('empresas').doc(companyId).set({
    company: {
      name: 'Distribuidora Norte Brasil LTDA',
      cnpj: '40.123.456/0001-78',
      address: 'Av. Torquato Tapajós, 4500',
      city: 'Manaus',
      uf: 'AM',
      cep: '69093-018',
      phone: '(92) 3342-5800',
      email: 'comercial@nortebrasil.com',
      ie: '04.123.456-7',
      regime: '1',
      segment: 'distribuidor',
      categories: CATEGORIES,
      units: ['UN', 'CX', 'DZ', 'PCT', 'KG', 'LT', 'FD', 'FX'],
    },
    plan: 'trial',
    active: true,
    updatedAt: new Date().toISOString(),
  }, { merge: true });

  // ─── Produtos ──────────────────────────────────────────────────────────────
  const productIds = [];
  const batchSize = 400;

  for (let i = 0; i < PRODUCTS.length; i++) {
    const p = PRODUCTS[i];
    const productId = i + 1;
    productIds.push(productId);
    const doc = {
      id: productId,
      name: p.name,
      unit: p.unit,
      costPrice: p.costPrice,
      salePrice: p.salePrice,
      ean: p.ean,
      category: p.category,
      stock: p.stock,
      active: true,
    };
    await db.collection('empresas').doc(companyId).collection('products').doc(String(productId)).set(doc);
  }
  console.log(`✓ ${PRODUCTS.length} produtos criados`);

  // ─── Clientes ──────────────────────────────────────────────────────────────
  const clientIds = [];
  for (let i = 0; i < CLIENTS.length; i++) {
    const c = CLIENTS[i];
    const clientId = 100 + i;
    clientIds.push({ id: clientId, ...c });
    await db.collection('empresas').doc(companyId).collection('clients').doc(String(clientId)).set({
      id: clientId,
      name: c.name,
      cnpj: c.cnpj,
      city: c.city,
      uf: c.uf,
      phone: c.phone,
      email: c.email,
      creditLimit: c.creditLimit,
      payMethod: pick(PAY_METHODS),
    });
  }
  console.log(`✓ ${CLIENTS.length} clientes criados`);

  // ─── Fornecedores ──────────────────────────────────────────────────────────
  const supplierIds = [];
  for (let i = 0; i < SUPPLIERS.length; i++) {
    const s = SUPPLIERS[i];
    const sid = 200 + i;
    supplierIds.push({ id: sid, ...s });
    await db.collection('empresas').doc(companyId).collection('suppliers').doc(String(sid)).set({
      id: sid, name: s.name, cnpj: s.cnpj, city: s.city, uf: s.uf, phone: s.phone, email: s.email,
    });
  }
  console.log(`✓ ${SUPPLIERS.length} fornecedores criados`);

  // ─── Gera 12 meses de operação ─────────────────────────────────────────────
  let invoiceCounter = 1;
  let purchaseCounter = 1;
  const allInvoices = [];
  const allReceivables = [];
  const allPurchases = [];
  const allPayables = [];
  const allTransactions = [];
  const allOrders = [];

  for (let month = 0; month < 12; month++) {
    const monthStart = new Date(START_DATE);
    monthStart.setMonth(monthStart.getMonth() + month);
    const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();

    // Notas fiscais: 15-25 por mês
    const numInvoices = randomInt(15, 25);
    for (let n = 0; n < numInvoices; n++) {
      const day = randomInt(1, daysInMonth);
      const d = new Date(monthStart.getFullYear(), monthStart.getMonth(), day);
      if (d > END_DATE) continue;
      const client = pick(clientIds);
      const inv = generateInvoice(invoiceCounter, client, PRODUCTS.map((p, i) => ({ ...p, id: i + 1 })), d);
      allInvoices.push(inv);

      // Receivables
      if (inv.status !== 'cancelada') {
        const recs = generateReceivables(inv, d);
        allReceivables.push(...recs);
      }

      // Orders (nem toda NF tem pedido)
      const orderId = 5000 + invoiceCounter;
      allOrders.push({
        id: orderId, number: `PED-${String(invoiceCounter).padStart(4, '0')}`,
        clientId: client.id, clientName: client.name,
        date: fmtDate(d), status: inv.status === 'emitida' ? 'faturado' : pick(['confirmado', 'faturado']),
        items: inv.items.map(it => ({ productId: it.productId, name: it.name, unit: it.unit, qty: it.qty, price: it.price, itemDiscount: it.itemDiscount })),
        subtotal: inv.subtotal, totalDiscount: inv.totalDiscount, total: inv.total,
        payMethod: inv.payMethod, terms: inv.terms,
      });

      invoiceCounter++;
    }

    // Compras: 3-6 por mês
    const numPurchases = randomInt(3, 6);
    for (let p = 0; p < numPurchases; p++) {
      const day = randomInt(1, daysInMonth);
      const d = new Date(monthStart.getFullYear(), monthStart.getMonth(), day);
      const supplier = pick(supplierIds);
      const purch = generatePurchase(purchaseCounter, supplier, PRODUCTS.map((p, i) => ({ ...p, id: i + 1 })), d);
      allPurchases.push(purch);

      const pays = generatePayables(purch, d);
      allPayables.push(...pays);

      purchaseCounter++;
    }

    // Transações de caixa (entradas de vendas à vista + saídas operacionais)
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth(), daysInMonth, 23, 59);
    const txDate = (d) => {
      const dd = randomInt(1, daysInMonth);
      return fmtDate(new Date(monthStart.getFullYear(), monthStart.getMonth(), dd));
    };

    // Entradas de vendas à vista
    for (let t = 0; t < randomInt(5, 15); t++) {
      allTransactions.push({
        id: uid(), date: txDate(), type: 'entrada',
        category: 'Vendas', description: 'Venda à vista',
        amount: parseFloat((randomInt(50, 500) + Math.random() * 200).toFixed(2)),
      });
    }
    // Recebimentos de parcelas (simula baixas)
    for (let t = 0; t < randomInt(8, 20); t++) {
      allTransactions.push({
        id: uid(), date: txDate(), type: 'entrada',
        category: 'Vendas', description: 'Recebimento de parcela',
        amount: parseFloat((randomInt(100, 2000) + Math.random() * 300).toFixed(2)),
      });
    }
    // Saídas: compras, logística, operacional, salários
    const saidasCategorias = [
      { cat: 'Compras', min: 500, max: 5000 },
      { cat: 'Logística', min: 80, max: 600 },
      { cat: 'Operacional', min: 100, max: 1500 },
      { cat: 'Salários', min: 3000, max: 4500 },
      { cat: 'Impostos', min: 200, max: 2500 },
    ];
    saidasCategorias.forEach(sc => {
      const num = sc.cat === 'Salários' ? 1 : randomInt(1, 4);
      for (let t = 0; t < num; t++) {
        allTransactions.push({
          id: uid(), date: txDate(), type: 'saida',
          category: sc.cat,
          description: `${sc.cat} ${fmtDate(new Date(monthStart.getFullYear(), monthStart.getMonth(), 1)).slice(0, 7)}`,
          amount: parseFloat((randomInt(sc.min, sc.max) + Math.random() * 200).toFixed(2)),
        });
      }
    });
  }

  // ─── Persiste subcoleções em lotes ─────────────────────────────────────────
  async function persistBatch(collectionName, items, batchSize = 400) {
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = db.batch();
      const chunk = items.slice(i, i + batchSize);
      chunk.forEach(item => {
        const ref = db.collection('empresas').doc(companyId).collection(collectionName).doc(String(item.id));
        batch.set(ref, item);
      });
      await batch.commit();
    }
    console.log(`✓ ${collectionName}: ${items.length} registros`);
  }

  await persistBatch('invoices', allInvoices);
  await persistBatch('receivables', allReceivables);
  await persistBatch('purchases', allPurchases);
  await persistBatch('payables', allPayables);
  await persistBatch('transactions', allTransactions);
  await persistBatch('orders', allOrders);

  // Soma totais para resumo
  const totalFaturamento = allInvoices
    .filter(n => n.status === 'emitida')
    .reduce((s, n) => s + n.total, 0);
  const totalReceber = allReceivables
    .filter(r => r.status === 'aberta')
    .reduce((s, r) => s + r.amount, 0);

  // Último número de NF
  const lastSeq = allInvoices.length;
  await db.collection('empresas').doc(companyId).set({ lastNFSeq: lastSeq }, { merge: true });

  console.log('Seed completo!');
  return {
    success: true,
    companyId,
    resumo: {
      produtos: PRODUCTS.length,
      clientes: CLIENTS.length,
      fornecedores: SUPPLIERS.length,
      notas: allInvoices.length,
      recebiveis: allReceivables.length,
      compras: allPurchases.length,
      pagaveis: allPayables.length,
      transacoes: allTransactions.length,
      pedidos: allOrders.length,
      faturamentoTotal: parseFloat(totalFaturamento.toFixed(2)),
      totalAReceber: parseFloat(totalReceber.toFixed(2)),
    },
  };
});
