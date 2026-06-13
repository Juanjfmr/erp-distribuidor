// functions/ncmEspecial.js
// R2 — Conjunto de NCMs com tratamento especial na Reforma Tributária (LC 214/2025).
// INCREMENTAL: esta lista é SEMENTE — deve ser expandida com a lista oficial da LC 214/2025
// e regulamentações complementares (cesta básica nacional, redução 60%, isenções, monofásico).
//
// Uso: ehNcmEspecial('1006.30') → true  (arroz — cesta básica)
//      ehNcmEspecial('8471.30') → false (computador — sem tratamento especial conhecido nesta revisão)

// ─── NCMs normalizados (só dígitos) com tratamento especial conhecido ──────────
// Semente: cesta básica nacional (LC 214/2025 art. 26 — itens mais comuns no varejo)
const NCMS_ESPECIAIS = new Set([
  // Arroz (capítulo 10)
  '100610', '100620', '100630', '100640', '100810', '100820', '100830', '100840', '100850', '100860', '100890',
  // Feijão (capítulo 07)
  '071331', '071332', '071333', '071334', '071335', '071339', '071340', '071350',
  // Farinha de trigo (capítulo 11) e derivados
  '110100', '110210', '110220', '110290', '110311', '110313', '110319', '110320', '110410', '110419', '110422', '110423', '110429', '110430', '110510', '110520', '110610', '110620', '110630', '110710', '110720', '110811', '110812', '110813', '110814', '110819', '110820', '110900',
  // Leite e laticínios (capítulo 04)
  '040110', '040120', '040140', '040150', '040210', '040221', '040229', '040291', '040299', '040310', '040390', '040410', '040490', '040510', '040520', '040590', '040610', '040620', '040630', '040640', '040690',
  // Carnes (capítulo 02)
  '020110', '020120', '020130', '020210', '020220', '020230', '020311', '020312', '020319', '020321', '020322', '020329', '020410', '020421', '020422', '020423', '020430', '020441', '020442', '020443', '020450', '020500', '020610', '020621', '020622', '020629', '020641', '020649', '020680', '020690', '020711', '020712', '020713', '020714', '020724', '020725', '020726', '020727', '020741', '020742', '020743', '020744', '020745', '020751', '020752', '020753', '020754', '020755', '020760',
  // Café (capítulo 09)
  '090111', '090112', '090121', '090122', '090190', '090210', '090220', '090230', '090240',
  // Açúcar (capítulo 17)
  '170113', '170114', '170191', '170199', '170211', '170219', '170220', '170230', '170240', '170250', '170260', '170290', '170310', '170390', '170410', '170490',
  // Óleos comestíveis (capítulo 15)
  '150710', '150790', '150910', '150990', '151000', '151110', '151190', '151211', '151219', '151221', '151229', '151311', '151319', '151321', '151329', '151411', '151419', '151491', '151499', '151511', '151519', '151521', '151529', '151530', '151540', '151550', '151560', '151590', '151610', '151620', '151710', '151790', '151800',
  // Massas alimentícias (capítulo 19)
  '190211', '190219', '190220', '190230', '190240', '190300', '190410', '190420', '190430', '190490', '190510', '190520', '190531', '190532', '190540', '190590',
  // Ovos (capítulo 04)
  '040711', '040719', '040721', '040729', '040790', '040811', '040819', '040891', '040899',
]);

// ─── Prefixos de NCM (subposições inteiras com tratamento especial) ────────────
// Ex.: '0401' cobre todos os NCMs 0401.xx (leite e creme de leite)
const PREFIXOS_ESPECIAIS = [
  '0401',  // Leite e creme de leite (qualquer subposição 0401.x)
  '0201',  // Carnes bovinas frescas/resfriadas (todas subposições)
  '0202',  // Carnes bovinas congeladas
  '0203',  // Carnes suínas
  '0204',  // Carnes ovinas/caprinas
  '0207',  // Carnes de aves
];

// ─── Helpers ───────────────────────────────────────────────────────────────────
function normalizarNcm(ncm) {
  if (!ncm || typeof ncm !== 'string') return '';
  return ncm.replace(/\D/g, '');
}

function ehNcmEspecial(ncm) {
  const ncmNum = normalizarNcm(ncm);
  if (!ncmNum) return false;
  // Exato no Set
  if (NCMS_ESPECIAIS.has(ncmNum)) return true;
  // Prefixo
  return PREFIXOS_ESPECIAIS.some(prefixo => ncmNum.startsWith(prefixo));
}

module.exports = {
  VERSAO_R2: 'NCM-especial-v0.1-semente',
  NCMS_ESPECIAIS,
  PREFIXOS_ESPECIAIS,
  normalizarNcm,
  ehNcmEspecial,
};
