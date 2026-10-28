// Session-memory only. Never persist private dashboard responses on disk.
export function createRequestCache({ ttl = 30000, maxEntries = 64, now = Date.now } = {}) {
  const entries = new Map();
  let generation = 0;
  const clear = () => { generation++; entries.clear(); };
  const get = (key, loader, { force = false } = {}) => {
    const cached = entries.get(key);
    if (cached?.pending) return cached.pending;
    if (!force && cached && cached.expires > now()) return Promise.resolve(cached.value);
    const version = generation;
    const entry = {};
    entries.delete(key);
    entries.set(key, entry);
    while (entries.size > maxEntries) entries.delete(entries.keys().next().value);
    entry.pending = Promise.resolve().then(loader).then(value => {
      if (version === generation && entries.get(key) === entry) {
        entry.value = value;
        entry.expires = now() + ttl;
        delete entry.pending;
      }
      return value;
    }, error => {
      if (entries.get(key) === entry) entries.delete(key);
      throw error;
    });
    return entry.pending;
  };
  return { get, clear };
}
