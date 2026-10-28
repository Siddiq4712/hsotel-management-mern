import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const source = readFileSync(new URL('../plugins/withApiNetworkSecurity.js', import.meta.url), 'utf8');
function plugin(env = {}) {
  const writes = [];
  const context = { module: { exports: {} }, URL, process: { env }, require: name => {
    if (name === 'expo/config-plugins') return {
      withAndroidManifest: (config, action) => action(config),
      withDangerousMod: (config, [, action]) => { config.generate = action; return config; },
    };
    if (name === 'node:fs/promises') return { mkdir: async () => {}, writeFile: async (file, text) => writes.push({ file, text }) };
    if (name === 'node:path') return path;
    throw new Error('Unexpected module');
  } };
  vm.createContext(context); vm.runInContext(source, context);
  return { apply: context.module.exports, writes };
}
const config = url => ({ extra: { API_BASE_URL: url }, modRequest: { platformProjectRoot: 'test-android' },
  modResults: { manifest: { application: [{ $: {} }] } } });

test('release HTTP policy allows only the explicitly approved LAN host', async () => {
  const { apply, writes } = plugin();
  const result = apply(config('http://192.168.1.5:5001/api'));
  assert.equal(result.modResults.manifest.application[0].$['android:usesCleartextTraffic'], 'false');
  await result.generate(result);
  assert.equal(writes.length, 1);
  assert.match(writes[0].text, /base-config cleartextTrafficPermitted="false"/);
  assert.match(writes[0].text, /includeSubdomains="false">192\.168\.1\.5<\/domain>/);
});

test('another HTTP host or an unapproved environment override is rejected', () => {
  assert.throws(() => plugin().apply(config('http://10.0.2.2:5001/api')), /approved only/);
  assert.throws(() => plugin({ EXPO_PUBLIC_API_URL: 'http://another-host/api' }).apply(config('http://192.168.1.5:5001/api')), /approved only/);
});

test('switching to HTTPS removes a previously generated HTTP exception', () => {
  const value = config('https://example.com/api');
  value.modResults.manifest.application[0].$['android:networkSecurityConfig'] = '@xml/api_network_security';
  const result = plugin().apply(value);
  assert.equal(result.modResults.manifest.application[0].$['android:networkSecurityConfig'], undefined);
  assert.equal(result.generate, undefined);
});
