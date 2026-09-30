/* global jest */
// Unit tests exercise UI state and controls; animation rendering is verified on Android.
jest.mock('react-native-reanimated', () => {
  const { View, Text, Image, ScrollView } = require('react-native');
  const transition = { duration: () => transition };
  return {
    __esModule: true,
    default: { View, Text, Image, ScrollView, createAnimatedComponent: component => component },
    FadeIn: transition,
    FadeInDown: transition,
    SlideInDown: transition,
    useSharedValue: value => ({ value }),
    useAnimatedStyle: callback => callback(),
    withTiming: value => value,
  };
});
jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);
