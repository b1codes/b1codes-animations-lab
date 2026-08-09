/**
 * @file lab/shared/constants.ts
 * @description Canonical source of truth for physical constants, particle mass tiers,
 * Chromatic Pulse specs, interaction physics, and refractive depth layer parameters
 * across all b1codes platform SDKs (React, React Native, Flutter, SwiftUI).
 */

/**
 * Chromatic Pulse Specification (SPEC §2.1 & chromatic-pulse.md)
 * Continuous idle-state color cycle through consuming app theme palettes.
 */

/**
 * Base cycle duration in milliseconds for a full particle field color rotation through the palette.
 * Slow and ambient (3200ms / 3.2s)—calibrated to avoid frantic motion during long loads.
 */
export const CHROMATIC_PULSE_DURATION = 3200;

/**
 * Symmetric ease-in-out curve for per-particle color rotation and breathing loop.
 * Defined as a CSS cubic-bezier string format for Web/React rendering.
 */
export const CHROMATIC_EASE = 'cubic-bezier(0.45, 0, 0.55, 1)';

/**
 * Cubic bezier control points for CHROMATIC_EASE as a 4-element tuple [x1, y1, x2, y2].
 * Useful for Canvas, Skia, Flutter, and SwiftUI math solvers.
 */
export const CHROMATIC_EASE_BEZIER: readonly [number, number, number, number] = [0.45, 0.0, 0.55, 1.0];

/**
 * Individual particle opacity breathing range [min, max].
 * Opacity modulates in sync with color to produce the breathing depth effect.
 */
export const CHROMATIC_OPACITY_RANGE = {
  min: 0.55,
  max: 1.0,
} as const;

export type ChromaticOpacityRange = typeof CHROMATIC_OPACITY_RANGE;

/**
 * LLC Interaction Physics Constants (SPEC §2.2 & interaction-physics.md)
 * Baseline physical constants for interactive and spring-driven elements.
 */

/**
 * Simulates high-precision friction on glass surfaces.
 * Used to apply drag/damping to particle movement during interactive gestures.
 */
export const DRAG_RESISTANCE = 0.15;

/**
 * Spring stiffness constant for particle snap-back and spring solvers.
 * Provides a sharp, authoritative return to neutral state.
 */
export const SPRING_STIFFNESS = 180;

/**
 * Spring damping constant for particle spring solvers.
 * Ensures minimal oscillation, resulting in dead-stop accuracy.
 */
export const SPRING_DAMPING = 12;

/**
 * Thermal Glow Exit Discharge Constants (SPEC §2.4 & interaction-physics.md)
 * Triggered exit animation parameters when a loading state resolves.
 */

/**
 * Phase 1 Excitation duration in milliseconds.
 * Rapid energy expansion strike upon resolution/contact.
 */
export const THERMAL_GLOW_EXCITATION_DURATION = 50;

/**
 * Phase 2 Dissipation duration in milliseconds.
 * Cooling cycle contraction and fade sequence.
 */
export const THERMAL_GLOW_DISSIPATION_DURATION = 300;
export const THERMAL_GLOW_TOTAL_DURATION = 350;

/**
 * Thermal Heat color spectrum transition sequence (`#FF3B30` -> `#FF9500`).
 */
export const THERMAL_GLOW_SPECTRUM: readonly [string, string] = ['#FF3B30', '#FF9500'];

/**
 * Non-spring interaction animation curvature (Quart.out / Quint.out).
 * Decelerating curve where initial velocity is highest.
 */
export const INTERACTION_EASE = 'cubic-bezier(0.25, 1, 0.5, 1)';

/**
 * Particle Mass Tier Specification (SPEC §2.2 & §3.2)
 * Particle mass & size tier system carrying simulated mass.
 * Larger particles carry more mass, drifting slower with higher momentum.
 * Smaller particles scatter and shimmer faster.
 */

export interface ParticleMassTier {
  /** Identifier tier name */
  name: 'dust' | 'motes' | 'cores';
  /** Simulated mass value (higher mass = higher inertia/momentum) */
  mass: number;
  /** Size scale multiplier relative to base particle radius */
  sizeRatio: number;
  /** Velocity multiplier inverse to mass (higher value = faster movement/drift) */
  velocityRatio: number;
  /** Relative frequency or rate of opacity shimmer/flicker */
  shimmerRate: number;
}

export const PARTICLE_MASS_TIERS: Record<'DUST' | 'MOTES' | 'CORES', ParticleMassTier> = {
  /**
   * Dust tier: Fine, light particles that shimmer and scatter rapidly.
   */
  DUST: {
    name: 'dust',
    mass: 0.5,
    sizeRatio: 0.6,
    velocityRatio: 1.4,
    shimmerRate: 1.5,
  },
  /**
   * Motes tier: Medium-weight particles providing standard balance and density.
   */
  MOTES: {
    name: 'motes',
    mass: 1.0,
    sizeRatio: 1.0,
    velocityRatio: 1.0,
    shimmerRate: 1.0,
  },
  /**
   * Cores tier: Heavy, luminous central particles that drift slowly with high inertia.
   */
  CORES: {
    name: 'cores',
    mass: 2.5,
    sizeRatio: 1.8,
    velocityRatio: 0.6,
    shimmerRate: 0.7,
  },
} as const;

/**
 * Refractive Depth Layer Specification (SPEC §2.3)
 * Multi-layer optical depth parameters providing glass-lens depth without drop shadows.
 * Foreground particles are crisp; background particles are diffused, dimmer, and scaled down.
 */

export interface RefractiveDepthLayer {
  /** Layer identifier */
  layer: 'background' | 'midground' | 'foreground';
  /** Z-index layer order (0 = deepest/back, 2 = frontmost) */
  depthIndex: number;
  /** Gaussian blur amount in pixels */
  blurPx: number;
  /** Layer opacity multiplier relative to particle base opacity */
  opacityMultiplier: number;
  /** Scale factor representing perspective distance */
  scale: number;
}

export const REFRACTIVE_DEPTH_LAYERS: Record<'BACKGROUND' | 'MIDGROUND' | 'FOREGROUND', RefractiveDepthLayer> = {
  /**
   * Background layer: Diffused, dimly lit background particles with optical blur.
   */
  BACKGROUND: {
    layer: 'background',
    depthIndex: 0,
    blurPx: 4.0,
    opacityMultiplier: 0.45,
    scale: 0.75,
  },
  /**
   * Midground layer: Softly diffused particles providing mid-field volume.
   */
  MIDGROUND: {
    layer: 'midground',
    depthIndex: 1,
    blurPx: 1.0,
    opacityMultiplier: 0.75,
    scale: 0.9,
  },
  /**
   * Foreground layer: Sharp, vivid foreground particles with zero blur.
   */
  FOREGROUND: {
    layer: 'foreground',
    depthIndex: 2,
    blurPx: 0.0,
    opacityMultiplier: 1.0,
    scale: 1.0,
  },
} as const;
