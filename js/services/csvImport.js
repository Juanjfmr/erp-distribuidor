// js/services/csvImport.js
// Parser e mapeador de CSV para migração de dados de outros ERPs

const COLUMN_MAPS = {
  bling: {
    produtos: {
      name: ['Descrição', 'Nome', 'Produto'],
      code: ['Código', 'SKU', 'Ref'],
      ean: ['EAN', 'GTIN', 'Código de Barras'],
      costPrice: ['Preço de Custo', 'Custo'],
      salePrice: ['Preço de Venda', 'Venda', 'Preço'],
      stock: ['Estoque', 'Saldo', 'Qtd'],
      unit: ['Unidade', 'Un'],
      category: ['Categoria', 'Grupo'],
    },
    clientes: {
      name: ['Nome / Razão Social', 'Nome', 'Razão Social'],
      cnpj: ['CPF / CNPJ', 'CNPJ', 'CPF'],
      email: ['E-mail', 'Email'],
      phone: ['Telefone', 'Celular', 'Fone'],
      city: ['Cidade'],
      uf: ['UF', 'Estado'],
    }
  },
  contaazul: {
    produtos: {
      name: ['Nome', 'Descrição'],
      code: ['Código', 'Referência'],
      salePrice: ['Preço de Venda', 'Preço'],
      costPrice: ['Custo'],
      stock: ['Estoque'],
      unit: ['Unidade'],
    },
    clientes: {
      name: ['Nome', 'Razão Social'],
      cnpj: ['CNPJ', 'CPF'],
      email: ['E-mail'],
      phone: ['Telefone'],
      city: ['Cidade'],
      uf: ['Estado', 'UF'],
    }
  },
  generico: {
    produtos: {
      name: ['nome', 'name', 'produto', 'descricao', 'description'],
      code: ['codigo', 'code', 'sku', 'ref', 'referencia'],
      ean: ['ean', 'gtin', 'barcode', 'codigo_barras'],
      costPrice: ['custo', 'cost', 'preco_custo', 'cost_price'],
      salePrice: ['venda', 'preco', 'price', 'sale_price', 'preco_venda'],
      stock: ['estoque', 'stock', 'quantidade', 'qty', 'saldo'],
      unit: ['unidade', 'unit', 'un'],
      category: ['categoria', 'category', 'grupo', 'group'],
      ncm: ['ncm'],
    },
    clientes: {
      name: ['nome', 'name', 'razao_social'],
      cnpj: ['cnpj', 'cpf', 'documento'],
      email: ['email', 'e-mail'],
      phone: ['telefone', 'phone', 'celular', 'fone'],
      city: ['cidade', 'city', 'municipio'],
      uf: ['uf', 'estado', 'state'],
      street: ['endereco', 'address', 'logradouro'],
      creditLimit: ['limite_credito', 'limite', 'credit_limit'],
    },
    fornecedores: {
      name: ['nome', 'name', 'razao_social'],
      cnpj: ['cnpj', 'cpf', 'documento'],
      email: ['email', 'e-mail'],
      phone: ['telefone', 'phone', 'celular', 'fone'],
      city: ['cidade', 'city', 'municipio'],
    }
  }
};

function detectSystem(headers) {
  const h = headers.map(x => (x||'').toLowerCase());
  if (h.some(x => x.includes('razão social') || x === 'nome / razão social')) return 'bling';
  if (h.some(x => x === 'razão social' || x === 'nome fantasia')) return 'contaazul';
  return 'generico';
}

function findCol(row, headers, candidates) {
  for (const c of candidates) {
    const idx = headers.findIndex(h => (h||'').toLowerCase() === c.toLowerCase());
    if (idx >= 0 && row[idx] !== undefined && row[idx] !== '') return row[idx];
  }
  return '';
}

async function parseCSV(file, entity) {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: (results) => {
        if (!results.data || results.data.length < 2) {
          resolve({ data: [], errors: ['Arquivo vazio ou sem dados válidos.'], system: 'generico' });
          return;
        }

        const headers = results.data[0];
        const rows = results.data.slice(1);
        const system = detectSystem(headers);
        const map = COLUMN_MAPS[system]?.[entity] || COLUMN_MAPS.generico[entity] || {};

        const data = [];
        const errors = [];

        rows.forEach((row, i) => {
          try {
            let obj = {};

            if (entity === 'produtos') {
              const name = findCol(row, headers, map.name || []);
              if (!name) { errors.push(`Linha ${i+2}: nome do produto vazio — ignorada.`); return; }
              obj = {
                id: uid(),
                name: name.trim(),
                code: findCol(row, headers, map.code || []).trim(),
                ean: findCol(row, headers, map.ean || []).trim(),
                costPrice: parseFloat((findCol(row, headers, map.costPrice || [])||'0').replace(',','.').replace(/[^0-9.]/g,'')) || 0,
                salePrice: parseFloat((findCol(row, headers, map.salePrice || [])||'0').replace(',','.').replace(/[^0-9.]/g,'')) || 0,
                stock: parseFloat((findCol(row, headers, map.stock || [])||'0').replace(',','.').replace(/[^0-9.]/g,'')) || 0,
                unit: findCol(row, headers, map.unit || []).trim() || 'UN',
                category: findCol(row, headers, map.category || []).trim() || getCatProd()[0],
                ncm: (findCol(row, headers, map.ncm || []).replace(/\D/g,'')).trim(),
                active: true,
              };
            } else if (entity === 'clientes') {
              const name = findCol(row, headers, map.name || []);
              if (!name) { errors.push(`Linha ${i+2}: nome do cliente vazio — ignorada.`); return; }
              obj = {
                id: uid(),
                name: name.trim(),
                cnpj: (findCol(row, headers, map.cnpj || [])||'').replace(/\D/g,''),
                email: findCol(row, headers, map.email || []).trim(),
                phone: findCol(row, headers, map.phone || []).trim(),
                city: findCol(row, headers, map.city || []).trim(),
                uf: findCol(row, headers, map.uf || []).trim(),
                street: findCol(row, headers, map.street || []).trim(),
                creditLimit: parseFloat((findCol(row, headers, map.creditLimit || [])||'0').replace(',','.').replace(/[^0-9.]/g,'')) || 0,
                payterm: 'À Vista',
              };
            } else if (entity === 'fornecedores') {
              const name = findCol(row, headers, map.name || []);
              if (!name) { errors.push(`Linha ${i+2}: nome do fornecedor vazio — ignorada.`); return; }
              obj = {
                id: uid(),
                name: name.trim(),
                cnpj: (findCol(row, headers, map.cnpj || [])||'').replace(/\D/g,''),
                email: findCol(row, headers, map.email || []).trim(),
                phone: findCol(row, headers, map.phone || []).trim(),
                city: findCol(row, headers, map.city || []).trim(),
                payterm: '30 dias',
              };
            }

            data.push(obj);
          } catch(e) {
            errors.push(`Linha ${i+2}: erro ao processar — ${e.message}`);
          }
        });

        resolve({ data, errors, system, headers });
      },
      error: (err) => {
        resolve({ data: [], errors: ['Erro ao ler arquivo: ' + err.message], system: 'generico' });
      }
    });
  });
}

function importToState(data, entity) {
  let imported = 0, skipped = 0;
  const skippedReasons = [];

  data.forEach(obj => {
    if (entity === 'produtos') {
      const dup = state.products.find(p =>
        (obj.ean && p.ean === obj.ean) ||
        (obj.code && p.code === obj.code) ||
        norm(p.name) === norm(obj.name)
      );
      if (dup) { skipped++; skippedReasons.push(`Produto "${obj.name}" já existe.`); return; }
      state.products.push(obj);
    } else if (entity === 'clientes') {
      const dup = state.clients.find(c =>
        (obj.cnpj && c.cnpj === obj.cnpj) || norm(c.name) === norm(obj.name)
      );
      if (dup) { skipped++; skippedReasons.push(`Cliente "${obj.name}" já existe.`); return; }
      state.clients.push(obj);
    } else if (entity === 'fornecedores') {
      const dup = state.suppliers.find(s =>
        (obj.cnpj && s.cnpj === obj.cnpj) || norm(s.name) === norm(obj.name)
      );
      if (dup) { skipped++; skippedReasons.push(`Fornecedor "${obj.name}" já existe.`); return; }
      state.suppliers.push(obj);
    }
    imported++;
  });

  saveState();
  return { imported, skipped, skippedReasons };
}
