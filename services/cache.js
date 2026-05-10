const store = new Map();
const DEFAULT_TTL = 10 * 60 * 1000; // 10 minutes

function get(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

function set(key, value, ttlMs = DEFAULT_TTL) {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

function invalidateAll() {
  store.clear();
}

module.exports = { get, set, invalidateAll };
