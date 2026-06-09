const fs = require('fs');
const path = require('path');
const d = 'C:\\Users\\juana\\Claudecode\\stoqio\\js\\modules\\';
const files = 'produtos.js clientes.js fornecedores.js pedidos.js notas.js compras.js contas.js caixa.js'.split(' ');

for (const f of files) {
  const fp = d + f;
  let c = fs.readFileSync(fp, 'utf8');
  // Fix stray backtick after emptyState(...)
  const before = c;
  c = c.replace(/\)`;/g, ');');
  c = c.replace(/\)`\n/g, ');\n');
  c = c.replace(/\)`}/g, ');}');
  if (c !== before) {
    fs.writeFileSync(fp, c, 'utf8');
    console.log('Fixed: ' + f);
  } else {
    console.log('No change: ' + f);
  }
}
console.log('Done fixing backticks');
