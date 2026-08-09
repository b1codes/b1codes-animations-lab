/**
 * @file lab/shared/constants.js
 * @description Canonical source of truth for physical constants, particle mass tiers,
 * Chromatic Pulse specs, interaction physics, and refractive depth layer parameters.
 * ES Module format for browser lab prototypes.
 */

export const CHROMATIC_PULSE_DURATION = 3200;

export const CHROMATIC_EASE = 'cubic-bezier(0.45, 0, 0.55, 1)';

export const CHROMATIC_EASE_BEZIER = [0.45, 0.0, 0.55, 1.0];

export const CHROMATIC_OPACITY_RANGE = {
  min: 0.55,
  max: 1.0,
};

export const DRAG_RESISTANCE = 0.15;

export const SPRING_STIFFNESS = 180;

export const SPRING_DAMPING = 12;

export const THERMAL_GLOW_EXCITATION_DURATION = 50;

export const THERMAL_GLOW_DISSIPATION_DURATION = 300;

export const THERMAL_GLOW_SPECTRUM = ['#FF3B30', '#FF9500'];

export const INTERACTION_EASE = 'cubic-bezier(0.25, 1, 0.5, 1)';

export const PARTICLE_MASS_TIERS = {
  DUST: {
    name: 'dust',
    mass: 0.5,
    sizeRatio: 0.6,
    velocityRatio: 1.4,
    shimmerRate: 1.5,
  },
  MOTES: {
    name: 'motes',
    mass: 1.0,
    sizeRatio: 1.0,
    velocityRatio: 1.0,
    shimmerRate: 1.0,
  },
  CORES: {
    name: 'cores',
    mass: 2.5,
    sizeRatio: 1.8,
    velocityRatio: 0.6,
    shimmerRate: 0.7,
  },
};

export const REFRACTIVE_DEPTH_LAYERS = {
  BACKGROUND: {
    layer: 'background',
    depthIndex: 0,
    blurPx: 4.0,
    opacityMultiplier: 0.45,
    scale: 0.75,
  },
  MIDGROUND: {
    layer: 'midground',
    depthIndex: 1,
    blurPx: 1.0,
    opacityMultiplier: 0.75,
    scale: 0.9,
  },
  FOREGROUND: {
    layer: 'foreground',
    depthIndex: 2,
    blurPx: 0.0,
    opacityMultiplier: 1.0,
    scale: 1.0,
  },
};
