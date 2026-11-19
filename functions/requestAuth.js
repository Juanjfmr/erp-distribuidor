// Isolamento de tenant para endpoints HTTP (Focus NFe e Asaas).
// O frontend nao e fonte confiavel de companyId nem de role.
class AccessError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function parseBearer(header) {
  const match = typeof header === 'string' && /^Bearer\s+([A-Za-z0-9._~-]+)$/i.exec(header.trim());
  return match ? match[1] : null;
}

function allowedProfile(profile, companyId, roles = ['admin', 'vendedor']) {
  return !!(profile && profile.active !== false && profile.companyId === companyId && roles.includes(profile.role));
}

async function requireTenantUser(req, admin, companyId, roles = ['admin', 'vendedor']) {
  if (typeof companyId !== 'string' || !/^[A-Za-z0-9_-]{4,128}$/.test(companyId)) {
    throw new AccessError(400, 'Empresa invalida.');
  }
  const token = parseBearer(req.headers.authorization);
  if (!token) throw new AccessError(401, 'Autenticacao necessaria.');

  let decoded;
  try {
    decoded = await admin.auth().verifyIdToken(token, true);
  } catch (_) {
    throw new AccessError(401, 'Sessao invalida ou expirada.');
  }
  const profileSnap = await admin.firestore().doc('users/' + decoded.uid).get();
  const profile = profileSnap.exists ? profileSnap.data() : null;
  if (!allowedProfile(profile, companyId, roles)) {
    throw new AccessError(403, 'Sem permissao para operar nesta empresa.');
  }
  return { uid: decoded.uid, profile };
}

module.exports = { AccessError, parseBearer, allowedProfile, requireTenantUser };
