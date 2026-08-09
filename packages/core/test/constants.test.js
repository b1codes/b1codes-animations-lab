import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CHROMATIC_PULSE_DURATION,
  CHROMATIC_EASE,
  CHROMATIC_EASE_BEZIER,
  CHROMATIC_OPACITY_RANGE,
  DRAG_RESISTANCE,
  SPRING_STIFFNESS,
  SPRING_DAMPING,
  THERMAL_GLOW_EXCITATION_DURATION,
  THERMAL_GLOW_DISSIPATION_DURATION,
  THERMAL_GLOW_SPECTRUM,
  INTERACTION_EASE,
  PARTICLE_MASS_TIERS,
  REFRACTIVE_DEPTH_LAYERS,
} from '../dist/index.js';

describe('Canonical Physics Constants & Chromatic Pulse Spec', () => {
  it('encodes Chromatic Pulse constants correctly', () => {
    assert.equal(CHROMATIC_PULSE_DURATION, 3200);
    assert.equal(CHROMATIC_EASE, 'cubic-bezier(0.45, 0, 0.55, 1)');
    assert.deepEqual(CHROMATIC_EASE_BEZIER, [0.45, 0, 0.55, 1]);
    assert.deepEqual(CHROMATIC_OPACITY_RANGE, { min: 0.55, max: 1.0 });
  });

  it('encodes Interaction Physics constants correctly', () => {
    assert.equal(DRAG_RESISTANCE, 0.15);
    assert.equal(SPRING_STIFFNESS, 180);
    assert.equal(SPRING_DAMPING, 12);
  });

  it('encodes Thermal Glow constants correctly', () => {
    assert.equal(THERMAL_GLOW_EXCITATION_DURATION, 50);
    assert.equal(THERMAL_GLOW_DISSIPATION_DURATION, 300);
    assert.deepEqual(THERMAL_GLOW_SPECTRUM, ['#FF3B30', '#FF9500']);
    assert.equal(INTERACTION_EASE, 'cubic-bezier(0.25, 1, 0.5, 1)');
  });

  it('defines Particle Mass Tiers (dust, motes, cores)', () => {
    assert.equal(PARTICLE_MASS_TIERS.DUST.name, 'dust');
    assert.equal(PARTICLE_MASS_TIERS.MOTES.name, 'motes');
    assert.equal(PARTICLE_MASS_TIERS.CORES.name, 'cores');

    // Mass order: dust < motes < cores
    assert.ok(PARTICLE_MASS_TIERS.DUST.mass < PARTICLE_MASS_TIERS.MOTES.mass);
    assert.ok(PARTICLE_MASS_TIERS.MOTES.mass < PARTICLE_MASS_TIERS.CORES.mass);

    // Velocity ratio (inverse to mass): dust > motes > cores
    assert.ok(PARTICLE_MASS_TIERS.DUST.velocityRatio > PARTICLE_MASS_TIERS.MOTES.velocityRatio);
    assert.ok(PARTICLE_MASS_TIERS.MOTES.velocityRatio > PARTICLE_MASS_TIERS.CORES.velocityRatio);

    // Size ratio: dust < motes < cores
    assert.ok(PARTICLE_MASS_TIERS.DUST.sizeRatio < PARTICLE_MASS_TIERS.MOTES.sizeRatio);
    assert.ok(PARTICLE_MASS_TIERS.MOTES.sizeRatio < PARTICLE_MASS_TIERS.CORES.sizeRatio);
  });

  it('defines Refractive Depth Layers (background, midground, foreground)', () => {
    assert.equal(REFRACTIVE_DEPTH_LAYERS.BACKGROUND.layer, 'background');
    assert.equal(REFRACTIVE_DEPTH_LAYERS.MIDGROUND.layer, 'midground');
    assert.equal(REFRACTIVE_DEPTH_LAYERS.FOREGROUND.layer, 'foreground');

    // Depth index: background (0) < midground (1) < foreground (2)
    assert.equal(REFRACTIVE_DEPTH_LAYERS.BACKGROUND.depthIndex, 0);
    assert.equal(REFRACTIVE_DEPTH_LAYERS.MIDGROUND.depthIndex, 1);
    assert.equal(REFRACTIVE_DEPTH_LAYERS.FOREGROUND.depthIndex, 2);

    // Blur: background > midground > foreground (0)
    assert.ok(REFRACTIVE_DEPTH_LAYERS.BACKGROUND.blurPx > REFRACTIVE_DEPTH_LAYERS.MIDGROUND.blurPx);
    assert.ok(REFRACTIVE_DEPTH_LAYERS.MIDGROUND.blurPx > REFRACTIVE_DEPTH_LAYERS.FOREGROUND.blurPx);
    assert.equal(REFRACTIVE_DEPTH_LAYERS.FOREGROUND.blurPx, 0);

    // Opacity: background < midground < foreground (1.0)
    assert.ok(REFRACTIVE_DEPTH_LAYERS.BACKGROUND.opacityMultiplier < REFRACTIVE_DEPTH_LAYERS.MIDGROUND.opacityMultiplier);
    assert.ok(REFRACTIVE_DEPTH_LAYERS.MIDGROUND.opacityMultiplier < REFRACTIVE_DEPTH_LAYERS.FOREGROUND.opacityMultiplier);
    assert.equal(REFRACTIVE_DEPTH_LAYERS.FOREGROUND.opacityMultiplier, 1.0);
  });
});
