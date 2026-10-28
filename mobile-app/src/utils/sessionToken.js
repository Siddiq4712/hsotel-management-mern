// Read storage once on bootstrap, then use the current session in memory.
// An explicit logout/login wins over an older in-flight storage read.
export function createSessionToken(readToken) {
  let token;
  let pending;
  let revision = 0;
  const set = value => {
    revision++;
    token = value || null;
    pending = undefined;
  };
  const get = () => {
    if (token !== undefined) return Promise.resolve(token);
    if (pending) return pending;
    const version = revision;
    const request = Promise.resolve().then(readToken).then(value => {
      if (revision === version) token = value || null;
      return token;
    }).finally(() => { if (pending === request) pending = undefined; });
    pending = request;
    return request;
  };
  return { get, set };
}
