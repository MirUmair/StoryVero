module.exports = {
  preset: '@react-native/jest-preset',
  watchman: false,
  setupFiles: ['react-native-gesture-handler/jestSetup.js'],
  setupFilesAfterEnv: ['./jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|react-native-reanimated|react-native-worklets|react-native-gesture-handler|react-native-safe-area-context)/)',
  ],
};
