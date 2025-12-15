// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Create a custom resolver to handle react-native-maps on web
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Redirect react-native-maps to an empty stub on web
  if (platform === 'web' && moduleName === 'react-native-maps') {
    return {
      filePath: path.resolve(__dirname, 'src/stubs/react-native-maps.web.js'),
      type: 'sourceFile',
    };
  }

  // Also handle the submodule imports from react-native-maps
  if (platform === 'web' && moduleName.startsWith('react-native-maps/')) {
    return {
      filePath: path.resolve(__dirname, 'src/stubs/react-native-maps.web.js'),
      type: 'sourceFile',
    };
  }

  // Default resolution
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
