import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { createSessionToken } from '../src/utils/sessionToken.js';

test('authenticated actions do not wait for phone storage', async () => {
  let reads = 0;
  const session = createSessionToken(async () => { reads++; return 'disk token'; });
  session.set('signed-in token');
  assert.deepEqual(await Promise.all([session.get(), session.get(), session.get()]), ['signed-in token', 'signed-in token', 'signed-in token']);
  assert.equal(reads, 0);
});

test('cold concurrent requests share one storage read, including a signed-out session', async () => {
  let reads = 0;
  const session = createSessionToken(async () => { reads++; return null; });
  assert.deepEqual(await Promise.all([session.get(), session.get()]), [null, null]);
  assert.equal(await session.get(), null);
  assert.equal(reads, 1);
});

test('login and logout override an older storage response', async () => {
  for (const value of [null, 'new login']) {
    let release;
    const session = createSessionToken(() => new Promise(resolve => { release = resolve; }));
    const old = session.get();
    await Promise.resolve();
    session.set(value);
    release('old account');
    assert.equal(await old, value);
    assert.equal(await session.get(), value);
  }
});

test('a failed storage read can be retried rather than poisoning the session', async () => {
  let calls = 0;
  const session = createSessionToken(async () => { if (!calls++) throw new Error('storage error'); return 'recovered'; });
  await assert.rejects(session.get(), /storage error/);
  assert.equal(await session.get(), 'recovered');
});

const require = createRequire(import.meta.url);
const { transformSync } = require('@babel/core');
function loadComponent(name, dependencies) {
  const source = readFileSync(new URL(`../src/components/common/${name}.js`, import.meta.url), 'utf8');
  const code = transformSync(source, { configFile: false, babelrc: false,
    plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'] }).code;
  const context = { exports: {}, require: name => {
    if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
    return dependencies[name];
  } };
  vm.createContext(context); vm.runInContext(code, context);
  return context.exports.default;
}
const react = {
  forwardRef: component => component,
  createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
  useContext: () => 'test-screen', useState: () => [false, () => {}],
  Children: { map: (children, fn) => [children].flat().map(fn) },
};
const colors = { primaryTint: '#ddd', card: '#fff' };
const native = { Platform: { OS: 'android' }, Pressable: 'Pressable', TouchableOpacity: 'TouchableOpacity',
  ActivityIndicator: 'Spinner', StyleSheet: { create: value => value } };
const Touchable = loadComponent('Touchable', { react, 'react-native': native, nativewind: { styled: value => value }, '../../theme/colors': colors });

test('Android touch feedback passes press handlers through without firing actions on touch-down', () => {
  let presses = 0;
  const onPress = () => presses++;
  const ref = {};
  const result = Touchable({ onPress, disabled: true, accessibilityLabel: 'Save', style: { minHeight: 48 } }, ref);
  assert.equal(result.type, 'Pressable');
  assert.equal(result.props.onPress, onPress);
  assert.equal(result.props.onPressIn, undefined);
  assert.equal(result.props.disabled, true);
  assert.equal(result.props.ref, ref);
  assert.equal(presses, 0);
  assert.equal(result.props.android_ripple.color, '#ddd');
});

test('iOS/web keep opacity feedback and custom handlers', () => {
  native.Platform.OS = 'ios';
  const result = Touchable({ activeOpacity: 0.6, onLongPress: 'custom' });
  assert.equal(result.type, 'TouchableOpacity');
  assert.equal(result.props.activeOpacity, 0.6);
  assert.equal(result.props.onLongPress, 'custom');
  native.Platform.OS = 'android';
});

test('shared buttons retain loading, explicit-disabled and role-permission guards', () => {
  let allowed = true;
  const Button = loadComponent('Button', {
    react, 'react-native': native, './Touchable': Touchable,
    './ReferenceDesign': { Text: 'Text', useReferenceDesign: () => ({ enabled: false }) },
    '../../auth/PermissionContext': { ScreenPermissionContext: {}, usePermissions: () => ({ can: () => allowed }) },
    '../../theme/colors': colors, '../../theme/typography': { typography: { button: 14 } },
  });
  assert.equal(Boolean(Button({ children: 'Save', loading: true }).props.disabled), true);
  assert.equal(Boolean(Button({ children: 'Save', disabled: true }).props.disabled), true);
  allowed = false;
  assert.equal(Boolean(Button({ children: 'Save', permissionAction: 'create' }).props.disabled), true);
  allowed = true;
  const onPress = () => {};
  const result = Button({ children: 'Save', permissionAction: 'create', onPress });
  assert.equal(Boolean(result.props.disabled), false);
  assert.equal(result.props.onPress, onPress);
});
