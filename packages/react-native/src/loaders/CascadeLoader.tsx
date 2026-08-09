/**
 * @file packages/react-native/src/loaders/CascadeLoader.tsx
 * @description CascadeLoader React Native component.
 * Particles cascade down from top, pool briefly at the floor baseline, dissolve, and recycle.
 */

import React, { forwardRef, memo } from 'react';
import type { CascadeLoaderProps, LoaderRef } from '../types.js';
import { BaseLoader } from './BaseLoader.native.js';

export const CascadeLoader = memo(
  forwardRef<LoaderRef, CascadeLoaderProps>((props, ref) => {
    const { gravity = 1.0, wind = 1.0, speed = 1.0, ...restProps } = props;

    const effectiveSpeed = speed * ((gravity + wind) / 2);

    return (
      <BaseLoader
        {...restProps}
        speed={effectiveSpeed}
        ref={ref}
        variant="cascade"
        defaultParticleCount={30}
      />
    );
  })
);

CascadeLoader.displayName = 'CascadeLoader';
