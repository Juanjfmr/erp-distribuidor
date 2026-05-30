# Plano D — Acesso de Contador (Visualizador Externo)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que o admin convide um contador externo com acesso somente leitura (Relatórios, Notas, Caixa, Contas), sem consumir slot de usuário do plano.

**Architecture:** Nova role `contador` em `ROLE_NAV`. Fluxo de convite via email usando Firebase Auth. Distinção de `contador` vs usuário normal no Firestore (`isExternal: true`). Não aparece na contagem de usuários do plano.

**Tech Stack:** JavaScript ES Modules, Firebase Auth (createUserWithEmailAndPassword + sendPasswordResetEmail), Firestore.

---

## Task 1: Adicionar role contador ao ROLE_NAV

**Files:**
- Modify: `js/core/nav.js` — adicionar role contador

- [ ] **Step 1: Adicionar contador ao ROLE_NAV**

Em `js/core/nav.js`, no objeto `ROLE_NAV`, adicionar:
```javascript
contador: ['dashboard','relatorios','notas','caixa','contas','minha-conta'],
```

- [ ] **Step 2: Adicionar label e cor**

Em `ROLE_LABELS` e `ROLE_COLORS`, adicionar:
```javascript
// Em ROLE_LABELS:
contador: 'Contador',

// Em ROLE_COLORS:
contador: 'var(--green)',
```

- [ ] **Step 3: Garantir que contador não vê botões de ação**

Em `applyRoleUI()`, a condição existente já cobre o contador:
```javascript
if (role === 'visualizador') { ... }
```
Alterar para:
```javascript
if (role === 'visualizador' || role === 'contador') {
  document.querySelectorAll('.btn-primary, .btn-danger, .btn-sm.btn-red, .btn-sm.btn-amber').forEach(b => b.style.display='none');
}
```

- [ ] **Step 4: Commitar**

```bash
git add js/core/nav.js
git commit -m "feat: adicionar role contador com acesso somente leitura a relatórios e fiscal"
```

---

## Task 2: Adicionar convite de contador em usuarios.js

**Files:**
- Modify: `js/modules/usuarios.js` — adicionar botão e fluxo de convite para contador

- [ ] **Step 1: Adicionar seção "Contador Externo" na renderUsuarios()**

Em `js/modules/usuarios.js`, na função `renderUsuarios()`, após a tabela de usuários, adicionar:

```javascript
// Seção de contador externo
const contadores = (state.users || []).filter(u => u.role === 'contador');
const contadorHtml = `
  <div class="card" style="padding:16px;margin-top:16px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <div>
        <div style="font-weight:700">Acesso do Contador</div>
        <div style="font-size:12px;color:var(--text2)">Acesso somente leitura — não conta no limite de usuários do plano</div>
      </div>
      <button class="btn btn-primary btn-sm" onclick="showConvidarContador()">+ Convidar contador</button>
    </div>
    ${contadores.length === 0
      ? '<div style="color:var(--text2);font-size:13px">Nenhum contador convidado ainda.</div>'
      : contadores.map(c => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)">
            <div>
              <div style="font-weight:600">${c.name}</div>
              <div style="font-size:12px;color:var(--text2)">${c.email}</div>
            </div>
            <button class="btn btn-sm btn-red" onclick="removerUsuario('${c.id}')">Remover</button>
          </div>
        `).join('')
    }
  </div>
`;
```

- [ ] **Step 2: Criar função showConvidarContador()**

```javascript
function showConvidarContador() {
  showModal(`
    <div style="padding:16px">
      <div style="font-size:16px;font-weight:700;margin-bottom:16px">Convidar Contador</div>
      <div class="form-group">
        <label class="form-label">Nome do contador *</label>
        <input id="cc-name" class="form-input" placeholder="Ex: João Silva">
      </div>
      <div class="form-group">
        <label class="form-label">E-mail *</label>
        <input id="cc-email" class="form-input" type="email" placeholder="contador@escritorio.com.br">
      </div>
      <div class="alert-warn" style="margin-bottom:12px">
        O contador receberá um e-mail para criar sua senha. Terá acesso somente leitura a: Relatórios, Notas, Caixa e Contas.
      </div>
      <div id="cc-err" class="alert-red" style="display:none;margin-bottom:8px"></div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-primary" onclick="salvarContador()">Enviar convite</button>
        <button class="btn" onclick="closeModal()">Cancelar</button>
      </div>
    </div>
  `);
}

async function salvarContador() {
  const name = el('cc-name').value.trim();
  const email = el('cc-email').value.trim();
  const errEl = el('cc-err');

  if (!name || !email) { errEl.style.display='block'; errEl.textContent='Preencha nome e e-mail.'; return; }

  try {
    const { createUserWithEmailAndPassword, sendPasswordResetEmail } = window._fbFns;
    const tempPass = Math.random().toString(36).slice(-10) + 'A1!';
    const cred = await createUserWithEmailAndPassword(window._auth, email, tempPass);
    const uid = cred.user.uid;

    // Salvar no Firestore com isExternal:true e companyId do tenant
    await window._fbFns.setDoc(
      window._fbFns.doc(window._db, 'users', uid),
      { name, email, role: 'contador', companyId: window._companyId, isExternal: true, createdAt: new Date().toISOString() }
    );

    // Enviar email de redefinição de senha (convite)
    await sendPasswordResetEmail(window._auth, email);

    // Adicionar ao state local
    if (!state.users) state.users = [];
    state.users.push({ id: uid, name, email, role: 'contador', isExternal: true });
    saveState();

    closeModal();
    showSyncStatus('✓ Convite enviado para ' + email);
    renderUsuarios();
  } catch(e) {
    errEl.style.display = 'block';
    errEl.textContent = e.code === 'auth/email-already-in-use'
      ? 'Este e-mail já está cadastrado no sistema.'
      : 'Erro: ' + e.message;
  }
}
```

- [ ] **Step 3: Corrigir contagem de usuários no checkPlan para excluir contadores**

Em `js/modules/usuarios.js`, na verificação de limite de usuários (Task 3 do Plano A), ajustar:

```javascript
// Excluir contadores externos da contagem de limite
const totalUsers = (state.users || []).filter(u => !u.isExternal).length + 1;
```

- [ ] **Step 4: Commitar e push**

```bash
git add js/modules/usuarios.js
git commit -m "feat: adicionar convite de contador externo com role somente leitura"
git push origin main
```

---

## Self-Review

**Spec coverage:**
- ✅ Role `contador` com acesso a Relatórios, Notas, Caixa, Contas
- ✅ Sem acesso a botões de ação (somente leitura)
- ✅ Convite por email via Firebase Auth
- ✅ Não conta no limite de usuários do plano (`isExternal: true`)
- ✅ Admin pode remover contador

**Atenção:**
- Firebase Firestore rules: a regra atual limita escrita por `companyId`. O usuário contador tem `companyId` setado corretamente — leitura funcionará. Validar no Firebase Console após implementação.
