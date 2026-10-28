const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');
const fs = require('node:fs/promises');
const path = require('node:path');

// The user approved HTTP only to this LAN host for local release testing.
const APPROVED_LAN_HOST = '192.168.1.5';
module.exports = function withApiNetworkSecurity(config) {
  const url = new URL(process.env.EXPO_PUBLIC_API_URL || config.extra.API_BASE_URL);
  if (url.protocol === 'https:') return withAndroidManifest(config, current => {
    const app = current.modResults.manifest.application[0].$;
    if (app['android:networkSecurityConfig'] === '@xml/api_network_security') delete app['android:networkSecurityConfig'];
    return current;
  });
  if (url.protocol !== 'http:') throw new Error('The API URL must use HTTP or HTTPS.');
  if (url.hostname !== APPROVED_LAN_HOST) {
    throw new Error('Release HTTP is approved only for 192.168.1.5. Use HTTPS for another API host.');
  }
  config = withAndroidManifest(config, current => {
    const app = current.modResults.manifest.application[0].$;
    app['android:usesCleartextTraffic'] = 'false';
    app['android:networkSecurityConfig'] = '@xml/api_network_security';
    return current;
  });
  return withDangerousMod(config, ['android', async current => {
    const directory = path.join(current.modRequest.platformProjectRoot, 'app/src/main/res/xml');
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(path.join(directory, 'api_network_security.xml'), `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="false" />
  <domain-config cleartextTrafficPermitted="true">
    <domain includeSubdomains="false">${APPROVED_LAN_HOST}</domain>
  </domain-config>
</network-security-config>
`);
    return current;
  }]);
};
