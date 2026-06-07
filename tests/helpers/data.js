// tests/helpers/data.js — Massa de dados de teste centralizada

const TIMESTAMP = Date.now();

const QA = {
  email:    'qatester@stoqio.com',
  password: 'Teste@123456',
  cnpj:     '07408725000180',
};

const NOVO_USUARIO = {
  nome:      `Teste QA ${TIMESTAMP}`,
  email:     `teste-funcional-${TIMESTAMP}@stoqio.com`,
  password:  'Teste@123456',
};

const EMPRESA = {
  nome:        'Distribuidora Teste QA Ltda',
  cnpj:        '07.408.725/0001-80',
  cidade:      'São Paulo',
  uf:          'SP',
  segmento:    'distribuidor',
  regime:      '1', // Simples Nacional
  ie:          'ISENTO',
  logradouro:  'Av. Paulista, 1000',
  cep:         '01310-100',
  email:       'contato@teste-qa.com.br',
  telefone:    '(11) 99999-0001',
};

const PRODUTOS = [
  { nome: 'Caneta Bic Azul',      codigo: 'CAN-001', ncm: '9608.10.00', unidade: 'un', custo: 0.80,  preco: 2.50, estoque: 100, categoria: 'Papelaria' },
  { nome: 'Caderno 200 Folhas',   codigo: 'CAD-001', ncm: '4820.10.00', unidade: 'un', custo: 12.00, preco: 25.00, estoque: 50, categoria: 'Papelaria' },
  { nome: 'Resma A4 500fl',       codigo: 'RES-001', ncm: '4802.56.00', unidade: 'un', custo: 14.00, preco: 22.00, estoque: 80, categoria: 'Papelaria' },
  { nome: 'Água Mineral 500ml',   codigo: 'AGU-001', ncm: '2201.10.00', unidade: 'un', custo: 1.20,  preco: 3.00, estoque: 200, categoria: 'Bebidas' },
  { nome: 'Refrigerante Lata',    codigo: 'REF-001', ncm: '2202.10.00', unidade: 'un', custo: 2.80,  preco: 5.00, estoque: 150, categoria: 'Bebidas' },
];

const CLIENTES = [
  { nome: 'João Supermercados ME',  cpfCnpj: '12.345.678/0001-90', email: 'joao@supermercados.com', telefone: '(11) 98888-0001', limite: 5000 },
  { nome: 'Maria da Silva',         cpfCnpj: '123.456.789-00',      email: 'maria@email.com',         telefone: '(11) 97777-0002', limite: 1000 },
];

const FORNECEDORES = [
  { nome: 'Atacadão Distribuidora', cnpj: '98.765.432/0001-10', contato: 'Carlos', prazo: 30 },
  { nome: 'Indústria de Bebidas BR',cnpj: '11.222.333/0001-44', contato: 'Ana',    prazo: 15 },
];

const PEDIDO = {
  clienteIdx: 0, // João Supermercados
  itens: [
    { produtoIdx: 0, qtd: 10 },  // 10 Canetas
    { produtoIdx: 1, qtd: 5  },  // 5 Cadernos
    { produtoIdx: 3, qtd: 20 },  // 20 Águas
  ],
};

const NF_PEDIDO = {
  naturezaOperacao: 'Venda de mercadorias',
  cfop:             '5102',
  formaPagamento:   '0', // à vista
};

const BASE_URL = 'https://stoqio.com.br';
const APP_URL  = 'https://stoqio.com.br/login';

module.exports = {
  TIMESTAMP,
  QA,
  NOVO_USUARIO,
  EMPRESA,
  PRODUTOS,
  CLIENTES,
  FORNECEDORES,
  PEDIDO,
  NF_PEDIDO,
  BASE_URL,
  APP_URL,
};
