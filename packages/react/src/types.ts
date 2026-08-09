/**
 * @file packages/react/src/types.ts
 * @description TypeScript interface definitions for @b1codes/loaders.
 */

import type { CSSProperties } from 'react';

export interface LoaderSize {
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
}

export interface LoaderProps {
  /**
   * Consuming application color palette (minimum 2 hex/rgb colors).
   * Drives Chromatic Pulse color cycle.
   */
  palette: string[];
  /**
   * Component bounding size in pixels (number e.g. 48, or { width, height }).
   * Defaults to 48.
   */
  size?: number | LoaderSize;
  /**
   * Total particle count override.
   */
  particleCount?: number;
  /**
   * Velocity and time multiplier (defaults to 1.0).
   */
  speed?: number;
  /**
   * Particle size and glow intensity multiplier (defaults to 0.7).
   */
  intensity?: number;
  /**
   * Enable/disable multi-layer refractive depth blur (defaults to true).
   */
  depth?: boolean;
  /**
   * Background fill behind particle canvas (defaults to 'transparent').
   */
  backgroundColor?: string;
  /**
   * Accessible label for screen readers (defaults to "Loading").
   */
  'aria-label'?: string;
  /**
   * Optional CSS class name for outer container.
   */
  className?: string;
  /**
   * Optional inline styles for outer container.
   */
  style?: CSSProperties;
  /**
   * Callback fired each time Chromatic Pulse completes a full palette loop cycle.
   */
  onCycleComplete?: () => void;
  /**
   * Callback fired when resolve/exit animation completes.
   */
  onDismiss?: () => void;
  /**
   * Force reduced-motion static dot grid mode.
   * If omitted, auto-detects via `window.matchMedia('(prefers-reduced-motion: reduce)')`.
   */
  reducedMotion?: boolean;
}

export interface OrbitalLoaderProps extends LoaderProps {
  /**
   * Total particle count for orbital loader (defaults to 18, recommended range 12–24).
   */
  particleCount?: number;
}

export interface NebulaLoaderProps extends LoaderProps {
  /**
   * Total particle count for nebula loader (defaults to 45, recommended range 30–60).
   */
  particleCount?: number;
}

export interface CascadeLoaderProps extends LoaderProps {
  /**
   * Total particle count for cascade loader (defaults to 30, recommended range 20–40).
   */
  particleCount?: number;
  /**
   * Gravity acceleration multiplier for falling particles (defaults to 1.0).
   */
  gravity?: number;
  /**
   * Horizontal wind drift multiplier for cascading motion (defaults to 1.0).
   */
  wind?: number;
}

export interface NeuralLoaderProps extends LoaderProps {
  /**
   * Total node count for neural loader (defaults to 16, recommended range 12–24).
   */
  particleCount?: number;
}

export interface GlobeLoaderProps extends LoaderProps {
  /**
   * Total 3D node count for globe loader (defaults to 24, recommended range 16–48).
   */
  particleCount?: number;
}

export interface LoaderRef {
  /**
   * Triggers the Thermal Glow exit discharge sequence (~350ms),
   * accelerating particles outward before dissolving and firing `onDismiss`.
   */
  resolve: () => void;
  /**
   * Pauses the particle simulation animation loop.
   */
  pause: () => void;
  /**
   * Resumes the particle simulation animation loop.
   */
  resume: () => void;
  /**
   * Returns true if the particle simulation is currently paused.
   */
  isPaused: () => boolean;
}
