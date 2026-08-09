/**
 * @file packages/react-native/src/loaders/GlobeLoader.tsx
 * @description GlobeLoader React Native component.
 * A loading indicator consisting of a rotating 3D sphere/globe of nodes that glow.
 * Designed to indicate large searching or data fetching operations.
 */

import React, { forwardRef, memo } from 'react';
import type { GlobeLoaderProps, LoaderRef } from '../types.js';
import { BaseLoader } from './BaseLoader.native.js';

export const GlobeLoader = memo(
  forwardRef<LoaderRef, GlobeLoaderProps>((props, ref) => {
    return (
      <BaseLoader
        {...props}
        ref={ref}
        variant="globe"
        defaultParticleCount={24}
      />
    );
  })
);

GlobeLoader.displayName = 'GlobeLoader';
