// Sanitización básica de strings en req.body, req.query, req.params
const PROHIBITED = /['";<>={}()]/g; // caracteres individuales

function sanitizeString(s) {
  return String(s).replace(PROHIBITED, '');
}

function walk(obj) {
  if (!obj) return obj;
  if (typeof obj === 'string') return sanitizeString(obj);
  if (Array.isArray(obj)) return obj.map(walk);
  if (typeof obj === 'object') {
    const out = {};
    for (const k of Object.keys(obj)) out[k] = walk(obj[k]);
    return out;
  }
  return obj;
}

function sanitizeRequest(req, _res, next) {
  try {
    const dashdash = (v) => typeof v === 'string' ? v.replace(/--/g, '') : v;
    if (req.body) req.body = walk(req.body);
    if (req.query) req.query = walk(req.query);
    if (req.params) req.params = walk(req.params);
    // barrer doble guión
    req.body = walk(req.body); req.body = walk(Object.fromEntries(Object.entries(req.body||{}).map(([k,v])=>[k,dashdash(v)])));
    req.query = walk(req.query); req.query = walk(Object.fromEntries(Object.entries(req.query||{}).map(([k,v])=>[k,dashdash(v)])));
    req.params = walk(req.params); req.params = walk(Object.fromEntries(Object.entries(req.params||{}).map(([k,v])=>[k,dashdash(v)])));
  } catch {}
  next();
}

module.exports = { sanitizeRequest };
