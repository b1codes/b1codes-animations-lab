/**
 * @file packages/react-native/src/loaders/NebulaLoader.tsx
 * @description NebulaLoader React Native component.
 * A cloud of particles that drifts, clusters, and disperses like interstellar gas.
 */

import React, { forwardRef, memo } from 'react';
import type { LoaderRef, NebulaLoaderProps } from '../types.js';
import { BaseLoader } from './BaseLoader.native.js';

export const NebulaLoader = memo(
  forwardRef<LoaderRef, NebulaLoaderProps>((props, ref) => {
    return (
      <BaseLoader
        {...props}
        ref={ref}
        variant="nebula"
        defaultParticleCount={45}
      />
    );
  })
);

NebulaLoader.displayName = 'NebulaLoader';
