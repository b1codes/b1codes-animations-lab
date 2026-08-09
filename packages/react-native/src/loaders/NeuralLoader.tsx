/**
 * @file packages/react-native/src/loaders/NeuralLoader.tsx
 * @description NeuralLoader React Native component.
 * A loader visualization showing a pulse moving between a web of connected nodes.
 * Ideal for indicating AI processing, inference, or summarization loading states.
 */

import React, { forwardRef, memo } from 'react';
import type { LoaderRef, NeuralLoaderProps } from '../types.js';
import { BaseLoader } from './BaseLoader.native.js';

export const NeuralLoader = memo(
  forwardRef<LoaderRef, NeuralLoaderProps>((props, ref) => {
    return (
      <BaseLoader
        {...props}
        ref={ref}
        variant="neural"
        defaultParticleCount={16}
      />
    );
  })
);

NeuralLoader.displayName = 'NeuralLoader';
