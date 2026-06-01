// js/services/csvImport.js
// Parser e mapeador de CSV/XLSX para migração de dados de outros ERPs

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
      ncm: ['NCM'],
    },
    clientes: {
      name: ['Nome / Razão Social', 'Nome', 'Razão Social'],
      cnpj: ['CPF / CNPJ', 'CNPJ', 'CPF'],
      email: ['E-mail', 'Email'],
      phone: ['Telefone', 'Celular', 'Fone'],
      city: ['Cidade'],
      uf: ['UF', 'Estado'],
      street: ['Endereço', 'Logradouro'],
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
      ncm: ['NCM'],
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
  omie: {
    produtos: {
      name: ['Descrição do Produto', 'Descricao', 'Produto', 'Nome'],
      code: ['Código', 'Cod. Produto', 'Codigo Produto', 'Ref'],
      ean: ['EAN', 'GTIN', 'Código de Barras', 'Cod. Barras'],
      costPrice: ['Valor Custo', 'Preço de Custo', 'Custo'],
      salePrice: ['Valor Unitário', 'Preço de Venda', 'Preço', 'Valor'],
      stock: ['Estoque', 'Saldo em Estoque', 'Qtde'],
      unit: ['Unidade', 'Un. Medida'],
      category: ['Família', 'Categoria'],
      ncm: ['NCM', 'Cod. NCM'],
    },
    clientes: {
      name: ['Razão Social', 'Nome Empresarial', 'Nome'],
      cnpj: ['CNPJ', 'CPF', 'CPF/CNPJ'],
      email: ['E-mail', 'Email'],
      phone: ['Telefone', 'Celular', 'Fone'],
      city: ['Cidade'],
      uf: ['Estado', 'UF'],
      street: ['Endereço', 'Logradouro'],
      creditLimit: ['Limite de Crédito', 'Limite'],
    }
  },
  generico: {
    produtos: {
      name: ['nome', 'name', 'produto', 'descricao', 'description', 'descrição'],
      code: ['codigo', 'code', 'sku', 'ref', 'referencia'],
      ean: ['ean', 'gtin', 'barcode', 'codigo_barras'],
      costPrice: ['custo', 'cost', 'preco_custo', 'cost_price', 'valor_custo'],
      salePrice: ['venda', 'preco', 'price', 'sale_price', 'preco_venda', 'valor'],
      stock: ['estoque', 'stock', 'quantidade', 'qty', 'saldo', 'qtd'],
      unit: ['unidade', 'unit', 'un'],
      category: ['categoria', 'category', 'grupo', 'group', 'familia'],
      ncm: ['ncm'],
    },
    clientes: {
      name: ['nome', 'name', 'razao_social', 'razão social', 'nome empresarial'],
      cnpj: ['cnpj', 'cpf', 'documento', 'cpf/cnpj'],
      email: ['email', 'e-mail'],
      phone: ['telefone', 'phone', 'celular', 'fone'],
      city: ['cidade', 'city', 'municipio'],
      uf: ['uf', 'estado', 'state'],
      street: ['endereco', 'address', 'logradouro', 'endereço'],
      creditLimit: ['limite_credito', 'limite', 'credit_limit', 'limite de crédito'],
    },
    fornecedores: {
      name: ['nome', 'name', 'razao_social', 'razão social'],
      cnpj: ['cnpj', 'cpf', 'documento', 'cpf/cnpj'],
      email: ['email', 'e-mail'],
      phone: ['telefone', 'phone', 'celular', 'fone'],
      city: ['cidade', 'city', 'municipio'],
    }
  }
};

function detectSystem(headers) {
  const h = headers.map(x => (x||'').toLowerCase().trim());
  // Omie: colunas específicas
  if (h.some(x => x === 'cod. produto' || x === 'valor unitário' || x === 'saldo em estoque' || x === 'nome empresarial' || x === 'cpf/cnpj')) return 'omie';
  // Bling: cabeçalhos com acentos específicos
  if (h.some(x => x === 'nome / razão social' || x.includes('razão social'))) return 'bling';
  // Conta Azul
  if (h.some(x => x === 'nome fantasia')) return 'contaazul';
  return 'generico';
}

function findCol(row, headers, candidates) {
  for (const c of candidates) {
    const idx = headers.findIndex(h => (h||'').toLowerCase().trim() === c.toLowerCase().trim());
    if (idx >= 0 && row[idx] !== undefined && row[idx] !== '') return String(row[idx]);
  }
  return '';
}

/**
 * Converte arquivo XLSX/XLS para array de arrays (mesma estrutura do PapaParse)
 */
function parseXLSX(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        resolve(rows);
      } catch(err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Faz parse do arquivo CSV ou XLSX e retorna dados mapeados
 */
async function parseCSV(file, entity) {
  const isXLSX = /\.(xlsx|xls)$/i.test(file.name);

  let allRows;
  if (isXLSX) {
    try {
      allRows = await parseXLSX(file);
    } catch(err) {
      return { data: [], errors: ['Erro ao ler arquivo Excel: ' + err.message], system: 'generico' };
    }
  } else {
    // CSV via PapaParse
    allRows = await new Promise((resolve) => {
      Papa.parse(file, {
        header: false,
        skipEmptyLines: true,
        encoding: 'UTF-8',
        complete: (results) => resolve(results.data),
        error: (err) => resolve(null),
      });
    });
    if (!allRows) return { data: [], errors: ['Erro ao ler arquivo CSV.'], system: 'generico' };
  }

  if (!allRows || allRows.length < 2) {
    return { data: [], errors: ['Arquivo vazio ou sem dados válidos.'], system: 'generico' };
  }

  const headers = allRows[0].map(h => String(h||'').trim());
  const rows = allRows.slice(1);
  const system = detectSystem(headers);
  const map = COLUMN_MAPS[system]?.[entity] || COLUMN_MAPS.generico[entity] || {};

  const data = [];
  const errors = [];

  rows.forEach((row, i) => {
    // Pula linhas totalmente vazias
    if (row.every(c => c === '' || c === null || c === undefined)) return;

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
          ncm: findCol(row, headers, map.ncm || []).replace(/\D/g,'').trim(),
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

  return { data, errors, system, headers };
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
