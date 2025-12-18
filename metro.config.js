const { getDefaultConfig } = require('expo/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

// Add 'cjs' to source extensions to support Firebase's CommonJS modules
defaultConfig.resolver.sourceExts.push('cjs');

// Disable unstable_enablePackageExports to fix Firebase component registration
defaultConfig.resolver.unstable_enablePackageExports = false;

module.exports = defaultConfig;

