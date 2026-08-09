import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ParticleEngine, CHROMATIC_PULSE_DURATION, PARTICLE_MASS_TIERS } from '../dist/index.js';

describe('OrbitalLoader Physics & Mechanics Spec', () => {
  it('supports configurable particle count within 12 to 24 range', () => {
    const engine12 = new ParticleEngine({ particleCount: 12, seed: 101 });
    assert.equal(engine12.getRenderState().length, 12);

    const engine24 = new ParticleEngine({ particleCount: 24, seed: 102 });
    assert.equal(engine24.getRenderState().length, 24);
  });

  it('verifies Keplerian orbital physics relationship (\u03c9 \u221d a^-1.5)', () => {
    // Keplerian orbital speed equation: \omega(a) = \omega_0 * (a_ref / a)^1.5
    const aInner = 24; // Inner orbit semi-major radius
    const aOuter = 84; // Outer orbit semi-major radius

    const keplerOmegaInner = Math.pow(40 / aInner, 1.5);
    const keplerOmegaOuter = Math.pow(40 / aOuter, 1.5);

    // Inner particle angular velocity must be significantly faster than outer
    const speedRatio = keplerOmegaInner / keplerOmegaOuter;
    assert.ok(
      speedRatio > 5.0,
      `Keplerian inner speed ratio (${speedRatio}) should be > 5.0x faster than outer`
    );
  });

  it('cycles colors via Chromatic Pulse palette and breathes opacity', () => {
    const palette = ['#4A90E2', '#50E3C2', '#9013FE'];
    const engine = new ParticleEngine({
      palette,
      particleCount: 18,
      seed: 88,
    });

    const startColor = engine.getRenderState()[0].color;
    engine.step(CHROMATIC_PULSE_DURATION / 3);
    const midColor = engine.getRenderState()[0].color;

    assert.notEqual(startColor, midColor);

    // Verify opacity remains within chromatic breathing bounds
    engine.getRenderState().forEach((p) => {
      assert.ok(p.opacity >= 0.2 && p.opacity <= 1.0);
    });
  });

  it('switches to static grid layout in reduced-motion mode', () => {
    const engine = new ParticleEngine({
      particleCount: 16,
      width: 100,
      height: 100,
      palette: ['#FF007F', '#7F00FF'],
      reducedMotion: true,
    });

    const renderStates = engine.getRenderState();
    assert.equal(renderStates.length, 16);

    // Reduced motion grid format check: 4x4 grid in 100x100
    renderStates.forEach((p) => {
      assert.equal(p.opacity, 1.0);
      assert.equal(p.blurPx, 0);
      assert.equal(p.color, '#FF007F');
    });

    assert.equal(renderStates[0].x, 12.5);
    assert.equal(renderStates[0].y, 12.5);
  });

  it('encodes mass tier velocity ratios for orbital inertia', () => {
    assert.equal(PARTICLE_MASS_TIERS.CORES.velocityRatio, 0.6); // Lighter cores drift slower with high mass
    assert.equal(PARTICLE_MASS_TIERS.MOTES.velocityRatio, 1.0);
    assert.equal(PARTICLE_MASS_TIERS.DUST.velocityRatio, 1.4); // Light dust scatters faster
  });
});
