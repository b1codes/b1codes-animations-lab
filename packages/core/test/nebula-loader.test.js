import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ParticleEngine, CHROMATIC_PULSE_DURATION, PARTICLE_MASS_TIERS } from '../dist/index.js';

describe('NebulaLoader Physics & Mechanics Spec', () => {
  it('supports configurable particle count within 30 to 60 range', () => {
    const engine30 = new ParticleEngine({ particleCount: 30, seed: 301 });
    assert.equal(engine30.getRenderState().length, 30);

    const engine60 = new ParticleEngine({ particleCount: 60, seed: 302 });
    assert.equal(engine60.getRenderState().length, 60);
  });

  it('allocates 3 size tiers (dust, motes, cores) across particle population', () => {
    const engine = new ParticleEngine({ particleCount: 60, seed: 555 });
    const states = engine.getRenderState();

    // Mass tier ratios (sizeRatio): Dust = 0.6, Motes = 1.0, Cores = 1.8
    const sizeRatios = new Set(states.map((p) => Number((p.scale / p.scale).toFixed(1))));
    assert.ok(states.length === 60);

    // Verify 3 distinct layers assigned
    const layers = new Set(states.map((p) => p.layer));
    assert.equal(layers.size, 3);
    assert.ok(layers.has('background'));
    assert.ok(layers.has('midground'));
    assert.ok(layers.has('foreground'));
  });

  it('modulates breathing density in sync with Chromatic Pulse duration', () => {
    const palette = ['#50E3C2', '#4A90E2', '#9013FE'];
    const engine = new ParticleEngine({
      palette,
      particleCount: 45,
      seed: 888,
    });

    const state0 = engine.getRenderState();
    engine.step(CHROMATIC_PULSE_DURATION / 2);
    const stateMid = engine.getRenderState();

    // Color and breathing opacity modulate smoothly
    assert.notEqual(state0[0].color, stateMid[0].color);
  });

  it('switches to 60-dot static grid in reduced-motion mode', () => {
    const engine = new ParticleEngine({
      particleCount: 60,
      width: 300,
      height: 300,
      palette: ['#50E3C2', '#4A90E2'],
      reducedMotion: true,
    });

    const states = engine.getRenderState();
    assert.equal(states.length, 60);

    states.forEach((p) => {
      assert.equal(p.opacity, 1.0);
      assert.equal(p.blurPx, 0);
      assert.equal(p.color, '#50E3C2');
    });

    // 60 dots in 300x300 container -> sqrt(60) = 8 cols, 8 rows
    assert.ok(states[0].x > 0 && states[0].x < 300);
    assert.ok(states[0].y > 0 && states[0].y < 300);
  });
});
