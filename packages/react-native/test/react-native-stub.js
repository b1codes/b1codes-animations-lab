/**
 * @file packages/react-native/test/react-native-stub.js
 * @description Clean JS mock for react-native and @shopify/react-native-skia during Node test execution.
 */

export const AccessibilityInfo = {
  isReduceMotionEnabled: async () => false,
  addEventListener: () => ({ remove: () => {} }),
};

export const View = ({ children, ...props }) => children;

export const StyleSheet = {
  create: (styles) => styles,
};

export const Canvas = () => null;
export const Group = () => null;
export const Circle = () => null;
export const Blur = () => null;
export const RadialGradient = () => null;
export const vec = (x, y) => ({ x, y });
export const Skia = {};

export default {
  AccessibilityInfo,
  View,
  StyleSheet,
};
