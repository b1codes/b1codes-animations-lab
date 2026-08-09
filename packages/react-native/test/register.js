import { register } from 'node:module';

register(new URL('./react-native-loader.js', import.meta.url).href);
