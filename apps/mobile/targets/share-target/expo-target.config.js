/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'share',
  name: 'ShareExtension',
  displayName: 'nook',
  bundleIdentifier: '.ShareExtension',
  deploymentTarget: '15.1',
  frameworks: ['SwiftUI', 'UniformTypeIdentifiers'],
  entitlements: {
    'com.apple.security.application-groups':
      config.ios.entitlements?.['com.apple.security.application-groups'] ?? [],
  },
});
