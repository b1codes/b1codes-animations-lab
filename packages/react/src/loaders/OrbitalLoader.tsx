/**
 * @file packages/react/src/loaders/OrbitalLoader.tsx
 * @description OrbitalLoader React component.
 * Particles orbit a gravitational center in elliptical paths at varying speeds and radii.
 */

import React, { forwardRef, memo } from 'react';
import type { LoaderRef, OrbitalLoaderProps } from '../types.js';
import { BaseLoader } from './BaseLoader.js';

export const OrbitalLoader = memo(
  forwardRef<LoaderRef, OrbitalLoaderProps>((props, ref) => {
    return (
      <BaseLoader
        {...props}
        ref={ref}
        variant="orbital"
        defaultParticleCount={18}
      />
    );
  })
);

OrbitalLoader.displayName = 'OrbitalLoader';
