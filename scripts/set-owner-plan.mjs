// Script para definir plan='owner' na sua conta do Firebase
// Uso: node scripts/set-owner-plan.mjs
import { createInterface } from 'node:readline/promises';

const API_KEY   = 'AIzaSyAhHYdX9NY4RG9JihVuP3VdJAE48QzjrmI';
const PROJECT   = 'erp-distribuidora-905ca';
const AUTH_URL  = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`;
const FS_BASE   = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

const rl = createInterface({ input: process.stdin, output: process.stdout });
const email = await rl.question('Email: ');
const pass  = await rl.question('Senha: ');
rl.close();

// 1. Autenticar
const authRes = await fetch(AUTH_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password: pass, returnSecureToken: true }),
});
const auth = await authRes.json();
if (!authRes.ok) {
  console.error('Erro no login:', auth.error?.message);
  process.exit(1);
}

const uid   = auth.localId;
const token = auth.idToken;
console.log(`\nLogado como: ${email} (uid: ${uid})`);

// 2. Atualizar campo plan no documento /empresas/{uid}
const url = `${FS_BASE}/empresas/${uid}?updateMask.fieldPaths=plan`;
const body = {
  fields: { plan: { stringValue: 'owner' } },
};

const fsRes = await fetch(url, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify(body),
});

if (fsRes.ok) {
  console.log('✅ Plano atualizado para "owner" com sucesso!');
} else {
  const err = await fsRes.json();
  console.error('Erro ao atualizar Firestore:', err.error?.message);
  process.exit(1);
}
