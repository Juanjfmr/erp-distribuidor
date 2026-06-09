// ─── FIREBASE SYNC ────────────────────────────────────────────────────────────

async function getNextNFNumber() {
  const db = window._db;
  const { doc, runTransaction } = window._fbFns;
  const uid = window._companyId || (window._currentUser ? window._currentUser.uid : 'default');
  const ref = doc(db, 'empresas', uid);
  try {
    const nextSeq = await runTransaction(db, async tx => {
      const snap = await tx.get(ref);
      const current = (snap.exists() && snap.data().lastNFSeq) || 0;
      const next = current + 1;
      tx.update(ref, { lastNFSeq: next });
      return next;
    });
    return "NF-" + String(nextSeq).padStart(4, "0");
  } catch(e) {
    // fallback local se offline
    const fallback = (state.invoices||[]).length + 1;
    return "NF-" + String(fallback).padStart(4, "0");
  }
}
const _COLS = ['products','clients','suppliers','invoices','purchases',
               'receivables','payables','transactions','stockMovements','orders','returns'];

if (!window._lastSaved) window._lastSaved = {};

async function saveToFirebase() {
  try {
    const db = window._db;
    const { doc, setDoc, writeBatch } = window._fbFns;
    const uid = window._companyId || (window._currentUser ? window._currentUser.uid : 'default');

    await setDoc(doc(db, 'empresas', uid), {
      company: state.company,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    let batch = writeBatch(db);
    let opCount = 0;

    const flush = async () => {
      if (opCount > 0) { await batch.commit(); batch = writeBatch(db); opCount = 0; }
    };

    for (const colName of _COLS) {
      const items = state[colName] || [];
      const prevSnap = window._lastSaved[colName] || {};
      const currentIds = new Set();

      for (const item of items) {
        const id = String(item.id);
        currentIds.add(id);
        const json = JSON.stringify(item);
        if (prevSnap[id] !== json) {
          batch.set(doc(db, 'empresas', uid, colName, id), item);
          opCount++;
          if (opCount >= 490) await flush();
        }
        prevSnap[id] = json;
      }

      for (const prevId of Object.keys(prevSnap)) {
        if (!currentIds.has(prevId)) {
          batch.delete(doc(db, 'empresas', uid, colName, prevId));
          delete prevSnap[prevId];
          opCount++;
          if (opCount >= 490) await flush();
        }
      }

      window._lastSaved[colName] = prevSnap;
    }

    await flush();
    const _uid = window._companyId || window._currentUser?.uid || '';
    if (_uid) localStorage.setItem('stoqio_uid', _uid);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    showSyncStatus('✓ Salvo');
  } catch(e) {
    console.error('Firebase save error:', e);
    showSyncStatus('⚠ Salvo local', true);
    const _uid = window._companyId || window._currentUser?.uid || '';
    if (_uid) localStorage.setItem('stoqio_uid', _uid);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
}

async function loadFromFirebase() {
  try {
    const db = window._db;
    const { doc, getDoc, collection, getDocs } = window._fbFns;
    const uid = window._companyId || (window._currentUser ? window._currentUser.uid : 'default');

    // Descarta cache do localStorage apenas se for de OUTRO tenant.
    // Não descarta se for primeiro acesso (stoqio_uid null) — o sync do
    // onAuthStateChanged já gravou os dados corretos antes de chegar aqui.
    const cachedUid = localStorage.getItem('stoqio_uid');
    if (uid && uid !== 'default' && cachedUid && cachedUid !== uid) {
      localStorage.removeItem(STORAGE_KEY);
      state = JSON.parse(JSON.stringify(defaultState));
    }
    if (uid && uid !== 'default') localStorage.setItem('stoqio_uid', uid);

    // Carregar config global do operador (token Focus NFe centralizado)
    try {
      const globalCfg = await getDoc(doc(db, 'config', 'focusNfe'));
      if (globalCfg.exists()) {
        window._focusToken = globalCfg.data().token || null;
        window._focusEnv   = globalCfg.data().env   || 'homologacao';
      }
    } catch(_) {}


    const snap = await getDoc(doc(db, 'empresas', uid));

    const colSnaps = await Promise.all(
      _COLS.map(c => getDocs(collection(db, 'empresas', uid, c)))
    );
    const hasSubcollections = colSnaps.some(s => !s.empty);

    if (hasSubcollections) {
      if (snap.exists()) {
        const docData = snap.data();
        if (docData.company)    state.company    = docData.company;
        // Carrega onboarding, plano e trial do documento principal
        if (docData.onboarding) state.onboarding = docData.onboarding;
        if (docData.plan) {
          window._plan = docData.plan;
          if (docData.trialEndsAt) window._trialEndsAt = docData.trialEndsAt;
        }
      }
      window._lastSaved = {};
      _COLS.forEach((colName, i) => {
        const items = [];
        const snap = {};
        colSnaps[i].forEach(d => {
          items.push(d.data());
          snap[d.id] = JSON.stringify(d.data());
        });
        state[colName] = items;
        window._lastSaved[colName] = snap;
      });
    } else if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data.products)) {
        // Formato antigo (single-document) — migrar para subcoleções
        Object.assign(state, data);
        window._lastSaved = {};
        await saveToFirebase();
        showSyncStatus('✓ Dados migrados para novo formato');
      } else {
        // Formato novo: documento existe mas dados estão em subcoleções (ainda não migradas)
        // Carrega apenas company do Firebase e preserva o restante do localStorage
        if (data.company) state.company = data.company;
      }
    } else {
      // Documento não existe — novo tenant, inicializa vazio (nunca usar localStorage de outro tenant)
      state = JSON.parse(JSON.stringify(defaultState));
      window._lastSaved = {};
      await saveToFirebase();
    }

    ['nfItems','compraItems','nfCosts','pedidoItems'].forEach(k => { if(!state[k]) state[k]=[]; });
    _COLS.forEach(k => { if(!state[k]) state[k]=[]; });

    render();
    updateTopbar();
    applyRoleUI();
    processRecurringExpenses();
    showSyncStatus('✓ Conectado ao Firebase');
  } catch(e) {
    console.error('Firebase load error:', e);
    loadState();
    render();
    updateTopbar();
    showSyncStatus('⚠ Modo offline', true);
  }
}

function showSyncStatus(msg, warn=false) {
  const el2 = document.getElementById('sync-status');
  if (!el2) return;
  el2.textContent = msg;
  el2.style.color = warn ? 'var(--amber)' : 'var(--green)';
  el2.style.opacity = '1';
  setTimeout(() => { el2.style.opacity = '0'; }, 3000);
}

function updateTopbar() {
  const days=["domingo","segunda-feira","terça-feira","quarta-feira","quinta-feira","sexta-feira","sábado"];
  const months=["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
  const now=new Date();
  const dateEl = document.getElementById('topbar-date');
  if(dateEl) dateEl.textContent=`${days[now.getDay()]}, ${now.getDate()} de ${months[now.getMonth()]} de ${now.getFullYear()}`;
  const footer = document.getElementById('sb-footer');
  if(footer) footer.textContent=`v2.0 · ${state.company&&state.company.name?state.company.name:"2R Comércio"}`;
}

async function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass = document.getElementById('login-pass').value;
  const errEl = document.getElementById('login-err');
  const btn = document.querySelector('#ls-login-panel .ls-btn-primary');
  if (!email || !pass) { errEl.style.display='block'; errEl.textContent='Preencha e-mail e senha.'; return; }
  btn.textContent = 'Entrando...'; btn.disabled = true;
  try {
    const { signInWithEmailAndPassword } = window._fbFns;
    await signInWithEmailAndPassword(window._auth, email, pass);
    errEl.style.display = 'none';
  } catch(e) {
    errEl.style.display = 'block';
    errEl.textContent = 'E-mail ou senha incorretos.';
    btn.textContent = 'Entrar'; btn.disabled = false;
  }
}

function selectSegment(card){
  document.querySelectorAll('.seg-card').forEach(c=>c.classList.remove('seg-active'));
  card.classList.add('seg-active');
  const radio = card.closest('label').querySelector('input[type="radio"]');
  if(radio) radio.checked = true;
}

function showSignup() {
  document.getElementById('ls-login-panel').classList.add('ls-hidden');
  document.getElementById('signup-box').classList.remove('ls-hidden');
  document.getElementById('signup-err').style.display = 'none';
}

function showLogin() {
  document.getElementById('signup-box').classList.add('ls-hidden');
  document.getElementById('ls-login-panel').classList.remove('ls-hidden');
}

const SEGMENT_PRESETS = {
  distribuidor: {
    label: 'Distribuidora / Atacadista',
    categories: ['Bebidas', 'Alimentos', 'Limpeza', 'Higiene', 'Congelados', 'Descartáveis', 'Outros'],
    units: ['UN', 'CX', 'DZ', 'PCT', 'KG', 'LT', 'FD', 'FX']
  },
  construcao: {
    label: 'Material de Construção',
    categories: ['Cimento/Argamassa', 'Hidráulico', 'Elétrico', 'Tintas', 'Ferramentas', 'Pisos/Revestimentos', 'Madeiras', 'Metais', 'Outros'],
    units: ['UN', 'SC', 'M²', 'ML', 'M³', 'KG', 'L', 'GL', 'CX', 'PCT', 'BR']
  },
  alimentos: {
    label: 'Alimentos / Mercearia',
    categories: ['Grãos e Cereais', 'Enlatados', 'Massas', 'Condimentos', 'Laticínios', 'Doces', 'Biscoitos', 'Orgânicos', 'Outros'],
    units: ['UN', 'KG', 'CX', 'DZ', 'PCT', 'FD', 'SC']
  },
  bebidas: {
    label: 'Bebidas',
    categories: ['Cervejas', 'Refrigerantes', 'Sucos/Néctares', 'Águas', 'Energéticos', 'Destilados', 'Vinhos', 'Outros'],
    units: ['UN', 'CX', 'FD', 'RL', 'DZ', 'L', 'PCT']
  },
  laticinios: {
    label: 'Laticínios / Frios',
    categories: ['Queijos', 'Embutidos/Frios', 'Iogurtes', 'Manteiga/Margarina', 'Leites', 'Sorvetes', 'Outros'],
    units: ['KG', 'UN', 'CX', 'PCT', 'DZ', 'LT', 'FR']
  },
  hortifruti: {
    label: 'Hortifruti / FLV',
    categories: ['Frutas', 'Legumes', 'Verduras', 'Ovos', 'Grãos', 'Orgânicos', 'Outros'],
    units: ['KG', 'UN', 'DZ', 'CX', 'ML', 'SC', 'BND']
  },
  padaria: {
    label: 'Padaria / Confeitaria',
    categories: ['Farinhas', 'Açúcares', 'Gorduras', 'Fermento', 'Ovos', 'Chocolates', 'Embalagens', 'Outros'],
    units: ['KG', 'L', 'UN', 'CX', 'SC', 'PCT', 'FR']
  },
  autopecas: {
    label: 'Auto Peças',
    categories: ['Motor', 'Freios', 'Suspensão', 'Elétrico/Bateria', 'Filtros', 'Pneus', 'Acessórios', 'Funilaria', 'Outros'],
    units: ['UN', 'CJ', 'KIT', 'PAR', 'L', 'M', 'PCT']
  },
  ferragens: {
    label: 'Ferragens / Ferramentas',
    categories: ['Fixação (Parafusos/Porcas)', 'Ferramentas Manuais', 'Ferramentas Elétricas', 'Fechaduras/Dobradiças', 'Tintas/Vernizes', 'Jardinagem', 'Outros'],
    units: ['UN', 'CX', 'KG', 'M', 'PCT', 'KIT', 'DZ']
  },
  agricola: {
    label: 'Agrícola / Insumos',
    categories: ['Sementes', 'Fertilizantes', 'Defensivos', 'Irrigação', 'Ferramentas Agrícolas', 'Rações Animais', 'Outros'],
    units: ['KG', 'L', 'SC', 'UN', 'CX', 'T', 'M']
  },
  descartaveis: {
    label: 'Descartáveis / Embalagens',
    categories: ['Copos/Pratos Descartáveis', 'Embalagens Plásticas', 'Sacolas', 'Talheres', 'Papel/Guardanapos', 'Embalagens Industriais', 'Outros'],
    units: ['UN', 'PCT', 'CX', 'RL', 'FD', 'KG', 'DZ']
  },
  pet: {
    label: 'Pet Shop / Veterinário',
    categories: ['Rações Cães', 'Rações Gatos', 'Medicamentos', 'Acessórios', 'Higiene Pet', 'Brinquedos', 'Outros'],
    units: ['UN', 'KG', 'PCT', 'FR', 'CX', 'LT', 'DZ']
  },
  informatica: {
    label: 'Informática / Eletrônicos',
    categories: ['Notebooks/PCs', 'Periféricos', 'Redes/Cabos', 'Componentes', 'Celulares', 'Acessórios', 'Impressão', 'Outros'],
    units: ['UN', 'CX', 'KIT', 'M', 'PCT', 'DZ']
  },
  tecidos: {
    label: 'Tecidos / Moda',
    categories: ['Tecidos', 'Malhas', 'Aviamentos', 'Lingerie', 'Moda Fitness', 'Calçados', 'Acessórios', 'Outros'],
    units: ['M', 'UN', 'DZ', 'CX', 'KG', 'PCT', 'RL']
  },
  papelaria: {
    label: 'Papelaria / Escritório',
    categories: ['Papel/Impressão', 'Canetas/Lápis', 'Cadernos/Blocos', 'Informática', 'Arte/Desenho', 'Arquivo', 'Outros'],
    units: ['UN', 'RM', 'CX', 'PCT', 'DZ', 'KG', 'KIT']
  },
  outro: {
    label: 'Outro segmento',
    categories: ['Produtos', 'Outros'],
    units: ['UN', 'CX', 'KG', 'PCT', 'LT', 'M']
  }
};

async function doSignup() {
  const company = document.getElementById('signup-company').value.trim();
  const name    = document.getElementById('signup-name').value.trim();
  const email   = document.getElementById('signup-email').value.trim();
  const pass    = document.getElementById('signup-pass').value;
  const errEl   = document.getElementById('signup-err');
  const btn     = document.querySelector('#signup-box .ls-btn-primary');

  errEl.style.display = 'none';
  if (!company) { errEl.style.display='block'; errEl.textContent='Informe o nome da empresa.'; return; }
  if (!name)    { errEl.style.display='block'; errEl.textContent='Informe seu nome.'; return; }
  if (!email)   { errEl.style.display='block'; errEl.textContent='Informe o e-mail.'; return; }
  if (pass.length < 6) { errEl.style.display='block'; errEl.textContent='A senha precisa ter pelo menos 6 caracteres.'; return; }

  btn.textContent = 'Criando conta...'; btn.disabled = true;
  try {
    const { createUserWithEmailAndPassword, doc, setDoc } = window._fbFns;
    const cred = await createUserWithEmailAndPassword(window._auth, email, pass);
    const uid = cred.user.uid;
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    await setDoc(window._fbFns.doc(window._db, 'users', uid), {
      name, email, role: 'admin', active: true,
      createdAt: new Date().toISOString(), companyId: uid
    });
    const segKeys = Array.from(document.querySelectorAll('input[name="signup-segment"]:checked')).map(i => i.value);
    const segKeysNorm = segKeys.length ? segKeys : ['distribuidor'];
    const allCats = [];
    const allUnits = [];
    const seenCats = {}, seenUnits = {};
    segKeysNorm.forEach(k => {
      const preset = SEGMENT_PRESETS[k];
      if (preset) {
        preset.categories.forEach(c => { if (!seenCats[c]) { allCats.push(c); seenCats[c] = true; } });
        preset.units.forEach(u => { if (!seenUnits[u]) { allUnits.push(u); seenUnits[u] = true; } });
      }
    });
    const refCode = new URLSearchParams(window.location.search).get('ref') || localStorage.getItem('_ref') || null;
    if(refCode) localStorage.removeItem('_ref');
    const affiliateCode = uid.slice(0,8).toUpperCase();
    await setDoc(window._fbFns.doc(window._db, 'empresas', uid), {
      name: company, plan: 'trial', trialEndsAt, active: true,
      createdAt: new Date().toISOString(), affiliateCode, referredBy: refCode,
      company: { name: company, segments: segKeysNorm, categories: allCats, units: allUnits }
    });
  } catch(e) {
    errEl.style.display = 'block';
    if (e.code === 'auth/email-already-in-use') {
      errEl.textContent = 'Este e-mail já está cadastrado. Faça login.';
    } else {
      errEl.textContent = 'Erro ao criar conta: ' + e.message;
    }
    btn.textContent = 'Criar conta grátis'; btn.disabled = false;
  }
}

async function doGoogleLogin() {
  const errEl = document.getElementById('login-err');
  const btn = document.getElementById('btn-google-login');
  btn.textContent = 'Aguarde...'; btn.disabled = true;
  try {
    const { GoogleAuthProvider, signInWithPopup } = window._fbFns;
    const provider = new GoogleAuthProvider();
    await signInWithPopup(window._auth, provider);
    errEl.style.display = 'none';
  } catch(e) {
    errEl.style.display = 'block';
    if (e.code === 'auth/unauthorized-domain') {
      errEl.textContent = 'Domínio não autorizado no Firebase. Adicione stoqio.com.br em Authentication → Settings → Authorized domains.';
    } else if (e.code === 'auth/popup-blocked') {
      errEl.textContent = 'Pop-up bloqueado pelo navegador. Permita pop-ups para este site e tente novamente.';
    } else if (e.code === 'auth/popup-closed-by-user') {
      errEl.textContent = 'Login cancelado.';
    } else {
      errEl.textContent = 'Erro ao entrar com Google: ' + (e.code || e.message);
    }
    btn.textContent = 'Entrar com Google'; btn.disabled = false;
  }
}

async function doResetPassword() {
  const emailEl = document.getElementById('login-email');
  const email = emailEl ? emailEl.value.trim() : '';
  if (!email) {
    const errEl = document.getElementById('login-err');
    errEl.style.display='block'; errEl.textContent='Digite seu e-mail acima para redefinir a senha.';
    emailEl && emailEl.focus(); return;
  }
  try {
    const { sendPasswordResetEmail } = window._fbFns;
    await sendPasswordResetEmail(window._auth, email);
    const errEl = document.getElementById('login-err');
    errEl.style.display='block'; errEl.style.color='var(--green)';
    errEl.style.background='rgba(63,185,80,.1)'; errEl.style.borderColor='rgba(63,185,80,.3)';
    errEl.textContent='✓ E-mail de redefinição enviado! Verifique sua caixa de entrada.';
  } catch(e) {
    const errEl = document.getElementById('login-err');
    errEl.style.display='block'; errEl.textContent='E-mail não encontrado no sistema.';
  }
}

async function doLogout() {
  const { signOut } = window._fbFns;
  await signOut(window._auth);
  localStorage.removeItem('stoqio_uid');
  localStorage.removeItem('stoqio_v1');
  localStorage.removeItem('stoqio_cache_v');
}
