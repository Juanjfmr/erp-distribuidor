// Executar: node functions/test-requestAuth.js
const assert = require('node:assert/strict');
const { parseBearer, allowedProfile, requireTenantUser } = require('./requestAuth');

function fakeAdmin(profile, revoked = false) {
  return {
    auth() { return { async verifyIdToken(token) {
      if (revoked || token === 'revoked') throw new Error('revoked');
      return { uid: 'user-01' };
    } }; },
    firestore() { return { doc(path) {
      assert.equal(path, 'users/user-01');
      return { async get() { return { exists: !!profile, data: () => profile }; } };
    } }; }
  };
}
const req = authorization => ({ headers: { authorization } });
async function denied(promise, status) {
  await assert.rejects(promise, e => e.status === status);
}

async function main() {
  assert.equal(parseBearer('Bearer jwt.token_signature'), 'jwt.token_signature');
  assert.equal(parseBearer('Basic abc'), null);
  assert.equal(parseBearer(null), null);

  const profile = { companyId: 'tenant123', role: 'vendedor', active: true };
  assert.equal(allowedProfile(profile, 'tenant123'), true);
  assert.equal(allowedProfile(profile, 'other123'), false);
  assert.equal(allowedProfile({ ...profile, role: 'contador' }, 'tenant123'), false);
  assert.equal(allowedProfile({ ...profile, role: 'visualizador' }, 'tenant123'), false);
  assert.equal(allowedProfile({ ...profile, active: false }, 'tenant123'), false);

  const admin = fakeAdmin(profile);
  assert.equal((await requireTenantUser(req('Bearer valid'), admin, 'tenant123')).uid, 'user-01');
  await denied(requireTenantUser(req(''), admin, 'tenant123'), 401);
  await denied(requireTenantUser(req('Bearer revoked'), admin, 'tenant123'), 401);
  await denied(requireTenantUser(req('Bearer valid'), admin, 'other123'), 403);
  await denied(requireTenantUser(req('Bearer valid'), admin, '../etc'), 400);
  await denied(requireTenantUser(req('Bearer valid'), fakeAdmin({ ...profile, role: 'contador' }), 'tenant123'), 403);
  await denied(requireTenantUser(req('Bearer valid'), fakeAdmin(null), 'tenant123'), 403);
  process.stdout.write('requestAuth: 15 verificacoes aprovadas\n');
}
main().catch(e => { console.error(e); process.exitCode = 1; });
