import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { TEXT_SIZES, TEXT_SIZE_KEY, textMetrics, textSizeOption, typography } from '../src/theme/typography.js';
import { createTextSizeStorage } from '../src/theme/textSizeStorage.js';

const require = createRequire(import.meta.url);
const { parse } = require('@babel/parser');
const root = fileURLToPath(new URL('../', import.meta.url));

test('every typography role grows monotonically and keeps an identical line box at all four sizes', () => {
  for (const fontSize of Object.values(typography)) {
    const results = TEXT_SIZES.map(({ id }) => textMetrics({ fontSize }, id));
    assert.equal(new Set(results.map(value => value.lineHeight)).size, 1);
    assert.ok(results.every((value, index) => value.fontSize >= 12 && value.lineHeight >= value.fontSize * 1.2
      && (!index || value.fontSize >= results[index - 1].fontSize)));
    // Only text metrics may change; no padding, width, height or icon scaling.
    assert.deepEqual(Object.keys(results[0]).sort(), ['fontSize', 'lineHeight']);
  }
  assert.equal(textMetrics({ fontSize: 24 }, 'default').fontSize, 24);
  assert.equal(textMetrics({ fontSize: 14 }, 'large').fontSize, 15.4);
});

test('compact labels remain readable and navigation fits its fixed 58-point container', () => {
  assert.equal(textMetrics({ fontSize: 7 }, 'small', { allowSmallText: true }).fontSize, 10);
  for (const { id } of TEXT_SIZES) {
    const metrics = textMetrics({ fontSize: typography.navigation }, id, { allowSmallText: true });
    // 21-point icon, 4-point gap, 14-point padding, 1-point border each side.
    assert.ok(21 + 4 + 14 + 2 + metrics.lineHeight <= 58);
    assert.ok(metrics.fontSize >= 10);
  }
});

test('missing and corrupt preferences use Default; explicit line spacing is preserved', () => {
  for (const invalid of [null, undefined, '', 'huge', '1.2', '{}']) assert.equal(textSizeOption(invalid).id, 'default');
  assert.equal(textMetrics({ fontSize: 14, lineHeight: 30 }, 'small').lineHeight, 30);
});

test('saved preference survives a new store instance and Reset to Default survives restart', async () => {
  const values = new Map();
  const storage = { getItem: async key => values.get(key), setItem: async (key, value) => { values.set(key, value); } };
  const first = createTextSizeStorage(storage);
  assert.equal(await first.load(), 'default');
  await first.save('extra-large');
  const restarted = createTextSizeStorage(storage);
  assert.equal(await restarted.load(), 'extra-large');
  await restarted.save('default');
  assert.equal(await createTextSizeStorage(storage).load(), 'default');
  assert.equal(values.size, 1);
  assert.equal(values.get(TEXT_SIZE_KEY), 'default');
});

test('rapid changes persist in order, and a failed save does not block the latest choice', async () => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const writes = [];
  const store = createTextSizeStorage({ getItem: async () => null, setItem: async (key, value) => {
    writes.push(value);
    if (writes.length === 1) await gate;
    if (value === 'large') throw new Error('Storage unavailable');
  } });
  const first = store.save('small');
  const failed = store.save('large');
  const failureCheck = assert.rejects(failed, /Storage unavailable/);
  const latest = store.save('extra-large');
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(writes, ['small']);
  release();
  await Promise.all([first, failureCheck, latest]);
  assert.deepEqual(writes, ['small', 'large', 'extra-large']);
});

test('storage read errors propagate so the settings screen can report them', async () => {
  const store = createTextSizeStorage({ getItem: async () => { throw new Error('Read failed'); } });
  await assert.rejects(store.load(), /Read failed/);
});

test('app text, inputs and dropdowns cannot bypass the shared text-size components', () => {
  let checked = 0;
  function walk(directory) {
    for (const item of readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, item.name);
      if (item.isDirectory()) { walk(file); continue; }
      if (!file.endsWith('.js')) continue;
      const source = readFileSync(file, 'utf8');
      const ast = parse(source, { sourceType: 'module', plugins: ['jsx'] });
      checked++;
      for (const declaration of ast.program.body) {
        if (declaration.type !== 'ImportDeclaration') continue;
        if (declaration.source.value === 'react-native') {
          for (const specifier of declaration.specifiers) {
            if (!['Text', 'TextInput', 'Picker'].includes(specifier.imported?.name)) continue;
            const allowed = { Text: 'ReferenceDesign.js', TextInput: 'Input.js' }[specifier.imported.name];
            assert.equal(path.basename(file), allowed, `${file} bypasses text-size preferences`);
          }
        }
        if (declaration.source.value === '@react-native-picker/picker') assert.equal(path.basename(file), 'Picker.js');
      }
    }
  }
  walk(path.join(root, 'src'));
  assert.ok(checked > 90);
});
