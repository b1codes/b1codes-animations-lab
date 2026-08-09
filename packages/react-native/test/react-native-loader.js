/**
 * @file packages/react-native/test/react-native-loader.js
 * @description Node.js ESM module resolution hook to redirect 'react-native' to react-native-stub.js.
 */

export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'react-native' || specifier === '@shopify/react-native-skia') {
    return {
      shortCircuit: true,
      url: new URL('./react-native-stub.js', import.meta.url).href,
    };
  }
  return nextResolve(specifier, context);
}
