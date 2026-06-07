"""Replace empty states across Stoqio modules."""
import os, re

BASE = r'C:\Users\juana\Claudecode\stoqio\js\modules'

REPLACEMENTS = {
    'produtos.js': [
        ('<tr><td colspan="10" class="empty">Nenhum produto.</td></tr>',
         '<tr><td colspan="10" class="empty"><div style="padding:12px">📦<br><b>Nenhum produto cadastrado</b><br><span style="font-size:12px;color:var(--muted)">Cadastre seu primeiro produto ou importe via CSV</span></div></td></tr>'),
    ],
    'clientes.js': [
        ('<tr><td colspan="7" class="empty">Nenhum cliente encontrado.</td></tr>',
         '<tr><td colspan="7" class="empty"><div style="padding:12px">👥<br><b>Nenhum cliente encontrado</b><br><span style="font-size:12px;color:var(--muted)">Cadastre seu primeiro cliente ou busque por CNPJ</span></div></td></tr>'),
    ],
    'fornecedores.js': [
        ('<tr><td colspan="7" class="empty">Nenhum fornecedor encontrado.</td></tr>',
         '<tr><td colspan="7" class="empty"><div style="padding:12px">🏭<br><b>Nenhum fornecedor encontrado</b><br><span style="font-size:12px;color:var(--muted)">Cadastre fornecedores para criar ordens de compra</span></div></td></tr>'),
    ],
    'pedidos.js': [
        ('<tr><td colspan="7" class="empty">Nenhum pedido encontrado.</td></tr>',
         '<tr><td colspan="7" class="empty"><div style="padding:12px">📋<br><b>Nenhum pedido encontrado</b><br><span style="font-size:12px;color:var(--muted)">Crie seu primeiro pedido de venda para começar</span></div></td></tr>'),
    ],
    'compras.js': [
        ('<tr><td colspan="9" class="empty">Nenhuma compra encontrada.</td></tr>',
         '<tr><td colspan="9" class="empty"><div style="padding:12px">🛒<br><b>Nenhuma compra encontrada</b><br><span style="font-size:12px;color:var(--muted)">Registre sua primeira ordem de compra para controlar suprimentos</span></div></td></tr>'),
    ],
    'contas.js': [
        ('<tr><td colspan="8" class="empty">Nenhum lançamento.</td></tr>',
         '<tr><td colspan="8" class="empty"><div style="padding:12px">💰<br><b>Nenhum lançamento a receber</b><br><span style="font-size:12px;color:var(--muted)">Os recebimentos aparecem aqui após faturar pedidos</span></div></td></tr>'),
        ('<tr><td colspan="7" class="empty">Nenhum lançamento.</td></tr>',
         '<tr><td colspan="7" class="empty"><div style="padding:12px">💳<br><b>Nenhum lançamento a pagar</b><br><span style="font-size:12px;color:var(--muted)">Os pagamentos aparecem aqui após registrar compras</span></div></td></tr>'),
    ],
    'caixa.js': [
        ('<tr><td colspan="6" class="empty">Nenhuma transação encontrada.</td></tr>',
         '<tr><td colspan="6" class="empty"><div style="padding:12px">📊<br><b>Nenhuma transação no período</b><br><span style="font-size:12px;color:var(--muted)">Lançamentos manuais ou baixas de contas aparecem aqui</span></div></td></tr>'),
    ],
    'notas.js': [
        ('<tr><td colspan="7" class="empty">Nenhuma nota encontrada.</td></tr>',
         '<tr><td colspan="7" class="empty"><div style="padding:12px">🧾<br><b>Nenhuma nota fiscal encontrada</b><br><span style="font-size:12px;color:var(--muted)">Emita sua primeira NF-e para começar a faturar</span></div></td></tr>'),
    ],
}

for filename, replacements in REPLACEMENTS.items():
    path = os.path.join(BASE, filename)
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    for old, new in replacements:
        if old not in content:
            print(f"⚠️  {filename}: old string NOT FOUND — skipping")
            continue
        content = content.replace(old, new, 1)  # Only first occurrence
        print(f"✅ {filename}: replaced '{old[:60]}...'")
    
    if content != original:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        # Verify syntax
        import subprocess
        r = subprocess.run(['node', '-c', path], capture_output=True, text=True)
        if r.returncode != 0:
            print(f"❌ {filename}: SYNTAX ERROR — restoring backup!")
            with open(path, 'w', encoding='utf-8') as f:
                f.write(original)
        else:
            print(f"   syntax OK")

print("\nDone!")
