import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequestCache } from '../src/utils/requestCache.js';

test('deduplicates simultaneous dashboard requests and expires cached results', async () => {
  let now = 0, calls = 0;
  const cache = createRequestCache({ ttl: 30, now: () => now });
  const load = async () => ++calls;
  assert.deepEqual(await Promise.all([cache.get('student:month:10', load), cache.get('student:month:10', load)]), [1, 1]);
  assert.equal(await cache.get('student:month:10', load), 1);
  now = 31;
  assert.equal(await cache.get('student:month:10', load), 2);
  assert.equal(await cache.get('student:month:11', load), 3);
});

test('manual refresh bypasses freshness and failures can be retried', async () => {
  const cache = createRequestCache();
  await cache.get('dashboard', async () => 1);
  assert.equal(await cache.get('dashboard', async () => 2, { force: true }), 2);
  await assert.rejects(cache.get('dashboard', async () => { throw new Error('offline'); }, { force: true }), /offline/);
  assert.equal(await cache.get('dashboard', async () => 3), 3);
});

test('logout or mutation prevents an old in-flight request repopulating the cache', async () => {
  const cache = createRequestCache();
  let resolveOld;
  const old = cache.get('dashboard', () => new Promise(resolve => { resolveOld = resolve; }));
  await Promise.resolve();
  cache.clear();
  assert.equal(await cache.get('dashboard', async () => 'new account'), 'new account');
  resolveOld('old account');
  await old;
  assert.equal(await cache.get('dashboard', async () => 'unexpected'), 'new account');
});

test('cache capacity is bounded when browsing many students and months', async () => {
  const cache = createRequestCache({ maxEntries: 2 });
  for (const key of ['first', 'second', 'third']) await cache.get(key, async () => key);
  assert.equal(await cache.get('first', async () => 'reloaded'), 'reloaded');
});
