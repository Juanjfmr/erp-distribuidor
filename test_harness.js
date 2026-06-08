// ─── PRODUTOS TEST HARNESS ───────────────────────────────────────────────────
// Simula o ambiente global do navegador
var window = globalThis;
var state = { products: [], company: {} };
var _prodSort;

// Mock initSort — should be defined in state.js
function initSort(defaultCol, defaultDir) {
  return { col: defaultCol, dir: defaultDir || 'asc' };
}

try {
  // Tenta executar o arquivo
  require('fs').readFileSync('js/modules/produtos.js', 'utf8');
  console.log('File exists');
  
  // Try to find syntax error with Function constructor
  const code = require('fs').readFileSync('js/modules/produtos.js', 'utf8');
  
  // Count backtick balance
  const btOpen = (code.match(/`/g) || []).length;
  console.log('Total backticks:', btOpen);
  console.log('Backtick balance (should be even):', btOpen % 2 === 0 ? 'OK' : 'UNBALANCED');
  
  // Look for template literal nesting issues
  const lines = code.split('\n');
  let depth = 0;
  for (let i = 0; i < lines.length; i++) {
    const bt = (lines[i].match(/`/g) || []).length;
    depth += bt;
    if (depth % 2 !== 0 && i > 5) {
      // Check if this line has ${...} with nested backticks
      if (lines[i].includes('${') && lines[i].includes('`')) {
        // Nested template literal - valid
      } else if (bt > 0) {
        console.log(`Line ${i+1}: depth=${depth}, content=${lines[i].trim().substring(0,80)}`);
      }
    }
  }
  console.log('Final depth:', depth, '(should be 0)');
  
} catch(e) {
  console.error('ERROR:', e.message);
}
