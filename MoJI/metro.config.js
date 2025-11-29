const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

const config = {
  resolver: {
    extraNodeModules: {
      ...require('node-libs-react-native'),
      fs: require.resolve('node-libs-react-native/mock/empty'),
      net: require.resolve('node-libs-react-native/mock/net'),
      tls: require.resolve('node-libs-react-native/mock/tls'),
      dns: require.resolve('node-libs-react-native/mock/dns'),
      stream: require.resolve('stream-browserify'),
    },
  },
};

module.exports = mergeConfig(defaultConfig, config);