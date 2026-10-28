import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const { transformSync } = require('@babel/core');
const source = readFileSync(new URL('../src/hooks/usePagedHistory.js', import.meta.url), 'utf8');
const code = transformSync(source, { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-modules-commonjs'] }).code;
const settle = () => new Promise(resolve => setImmediate(resolve));
const page = (ids, hasMore = false) => ({ data: { success: true, data: ids.map(id => ({ id })), pagination: { hasMore }, summary: { totalTransactions: 45 } } });

// Small hook lifecycle runner: exercise real async hook code without a native UI.
function mount(fetchPage) {
  const slots = [];
  let cursor = 0, effects = [];
  const changed = (left, right) => !left || left.length !== right.length || left.some((item, i) => !Object.is(item, right[i]));
  const hooks = {
    useRef(value) { const i = cursor++; return slots[i] ||= { current: value }; },
    useState(value) {
      const i = cursor++;
      slots[i] ||= { value: typeof value === 'function' ? value() : value };
      return [slots[i].value, update => { slots[i].value = typeof update === 'function' ? update(slots[i].value) : update; }];
    },
    useMemo(factory, deps) {
      const i = cursor++;
      if (changed(slots[i]?.deps, deps)) slots[i] = { deps, value: factory() };
      return slots[i].value;
    },
    useCallback(fn, deps) { return hooks.useMemo(() => fn, deps); },
    useEffect(fn, deps) {
      const i = cursor++;
      if (changed(slots[i]?.deps, deps)) effects.push(() => {
        slots[i]?.cleanup?.();
        slots[i] = { deps, cleanup: fn() };
      });
    },
  };
  const context = { exports: {}, require: name => { assert.equal(name, 'react'); return hooks; } };
  vm.createContext(context);
  vm.runInContext(code, context);
  return {
    render(filters = {}) {
      cursor = 0; effects = [];
      const result = context.exports.default(fetchPage, filters);
      effects.forEach(effect => effect());
      return result;
    },
    unmount() { slots.forEach(slot => slot?.cleanup?.()); },
  };
}

test('loads bounded pages, preserves full summary and deduplicates overlapping rows', async () => {
  const calls = [];
  const hook = mount(async params => { calls.push(params); return params.page === 1 ? page([1, 2], true) : page([2, 3]); });
  hook.render(); await settle();
  let view = hook.render();
  assert.equal(view.summary.totalTransactions, 45);
  await Promise.all([view.loadMore(), view.loadMore()]);
  view = hook.render();
  assert.equal(JSON.stringify(view.rows.map(row => row.id)), '[1,2,3]');
  assert.equal(calls.length, 2);
  assert.equal(calls[1].pageSize, 20);
  assert.equal(calls[1].page, 2);
  assert.equal(view.hasMore, false);
  hook.unmount();
});

test('filter changes ignore old in-flight responses and reset to the first page', async () => {
  let resolveOld;
  const hook = mount(params => params.status === 'old' ? new Promise(resolve => { resolveOld = resolve; }) : Promise.resolve(page([9])));
  hook.render({ status: 'old' });
  hook.render({ status: 'new' }); await settle();
  resolveOld(page([1])); await settle();
  assert.equal(JSON.stringify(hook.render({ status: 'new' }).rows.map(row => row.id)), '[9]');
  hook.unmount();
});

test('a failed load-more retries the same page while retaining existing records', async () => {
  let failed = false;
  const calls = [];
  const hook = mount(async params => {
    calls.push(params.page);
    if (params.page === 2 && !failed) { failed = true; throw new Error('offline'); }
    return params.page === 1 ? page([1], true) : page([2]);
  });
  hook.render(); await settle();
  await hook.render().loadMore();
  let view = hook.render();
  assert.equal(view.rows.length, 1); assert.equal(view.error, 'offline');
  await view.retry();
  view = hook.render();
  assert.equal(view.rows.length, 2);
  assert.deepEqual(calls, [1, 2, 2]);
  hook.unmount();
});

test('refresh replaces loaded pages, and unmounted callbacks cannot start requests', async () => {
  let calls = 0;
  const hook = mount(async params => { calls++; return params.page === 1 ? page([1], true) : page([2]); });
  hook.render(); await settle();
  await hook.render().loadMore();
  await hook.render().reload();
  const view = hook.render();
  assert.equal(JSON.stringify(view.rows.map(row => row.id)), '[1]');
  hook.unmount();
  await view.reload();
  assert.equal(calls, 3);
});
