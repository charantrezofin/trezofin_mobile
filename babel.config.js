module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: [
      // Reanimated v4 moved its Babel plugin to the react-native-worklets
      // package; it must be listed LAST.
      'react-native-worklets/plugin',
    ],
  };
};
