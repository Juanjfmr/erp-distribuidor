// functions/classTribTable.js
// R1 — Tabela de referência de Classificação Tributária do IBS/CBS (cClassTrib + CST).
// Fonte: Informe Técnico RT 2025.002 (Reforma Tributária / LC 214/2025).
//
// IMPORTANTE — provenance e reconciliação:
//   Os dados abaixo foram montados a partir das fontes públicas confirmadas em 12/06/2026
//   (Tecnospeed, Taxcel, SEFIN-RO). A versão OFICIAL completa (enumerado de 6 dígitos com
//   todos os tratamentos especiais) está no Excel/PDF do Portal Nacional NF-e → Documentos
//   → Diversos, hoje em IT-2025.002 v.1.40. Esta tabela cobre o necessário para o caminho
//   PADRÃO (tributação integral) e o conjunto de CST; o enumerado completo dos casos
//   especiais deve ser importado do arquivo oficial e este arquivo reconciliado.
//   Atualizar VERSAO_TABELA ao importar a versão oficial.

const VERSAO_TABELA = 'IT2025.002-parcial-20260612';

// ─── Códigos de Situação Tributária (CST) do IBS/CBS — 3 dígitos ───────────────
// Confirmados nas fontes públicas. São os 3 primeiros dígitos de todo cClassTrib.
const CST = {
  '000': 'Tributação integral',
  '010': 'Tributação com alíquotas uniformes',
  '011': 'Tributação com alíquotas uniformes reduzidas',
  '200': 'Alíquota reduzida',
  '220': 'Alíquota fixa',
  '400': 'Isenção',
  '410': 'Imunidade e não incidência',
  '510': 'Diferimento',
  '515': 'Diferimento',
  '550': 'Suspensão',
  '620': 'Tributação monofásica',
  '800': 'Transferência de crédito / ajustes',
  '810': 'Ajuste de crédito',
  '811': 'Ajuste de crédito',
};

// ─── Tabela cClassTrib — 6 dígitos (os 3 primeiros = CST) ──────────────────────
// Cada entrada: { descricao, cst, dispositivo }.
// Bloco 000xxx (tributação integral) confirmado nas fontes. Demais blocos a importar
// do arquivo oficial — entram aqui conforme a R1 for reconciliada.
const CCLASS_TRIB = {
  '000001': { descricao: 'Situações tributadas integralmente pelo IBS e CBS', cst: '000', dispositivo: 'LC 214/2025 — regra geral' },
  '000002': { descricao: 'Exploração de via (pedágio)', cst: '000', dispositivo: 'LC 214/2025' },
  '000003': { descricao: 'Regime automotivo — habilitado', cst: '000', dispositivo: 'LC 214/2025' },
  '000004': { descricao: 'Regime automotivo', cst: '000', dispositivo: 'LC 214/2025' },
  '000005': { descricao: 'Operações com biocombustíveis', cst: '000', dispositivo: 'LC 214/2025' },
  // TODO(reconciliar): importar do Excel oficial os blocos 010xxx, 011xxx, 200xxx,
  // 220xxx, 400xxx, 410xxx, 510xxx, 515xxx, 550xxx, 620xxx, 800xxx, 810xxx, 811xxx.
};

// Código padrão da esmagadora maioria dos produtos (venda comum, sem benefício).
const CODIGO_TRIBUTACAO_INTEGRAL = '000001';

// ─── Helpers ───────────────────────────────────────────────────────────────────
function existeClassTrib(codigo) {
  return typeof codigo === 'string' && Object.prototype.hasOwnProperty.call(CCLASS_TRIB, codigo);
}

function descreverClassTrib(codigo) {
  const entry = CCLASS_TRIB[codigo];
  if (!entry) return null;
  const cstDesc = CST[entry.cst] || null;
  return { codigo, ...entry, cstDescricao: cstDesc };
}

module.exports = {
  VERSAO_TABELA,
  CST,
  CCLASS_TRIB,
  CODIGO_TRIBUTACAO_INTEGRAL,
  existeClassTrib,
  descreverClassTrib,
};
