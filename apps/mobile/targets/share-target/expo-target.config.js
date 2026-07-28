/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'share',
  name: 'ShareExtension',
  displayName: 'nook',
  bundleIdentifier: '.ShareExtension',
  deploymentTarget: '16.4',
  frameworks: ['SwiftUI', 'UniformTypeIdentifiers', 'Security'],
  entitlements: {
    'com.apple.security.application-groups':
      config.ios.entitlements?.['com.apple.security.application-groups'] ?? [],
    'keychain-access-groups': config.ios.entitlements?.['keychain-access-groups'] ?? [],
  },
  info: {
    NookSessionAccessGroup: config.ios.infoPlist?.NookSessionAccessGroup ?? '',
    NookApiBaseUrl: config.ios.infoPlist?.NookApiBaseUrl ?? '',
    NookAppGroup: config.ios.infoPlist?.NookAppGroup ?? '',
  },
});
