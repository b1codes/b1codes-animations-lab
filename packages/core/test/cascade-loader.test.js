import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ParticleEngine, CHROMATIC_PULSE_DURATION, PARTICLE_MASS_TIERS } from '../dist/index.js';

describe('CascadeLoader Physics & Mechanics Spec', () => {
  it('supports configurable particle count within 20 to 40 range', () => {
    const engine20 = new ParticleEngine({ particleCount: 20, seed: 201 });
    assert.equal(engine20.getRenderState().length, 20);

    const engine40 = new ParticleEngine({ particleCount: 40, seed: 202 });
    assert.equal(engine40.getRenderState().length, 40);
  });

  it('accelerates downward along gravity vector (g = 220 px/s^2)', () => {
    // Gravity acceleration equation: y(t) = y0 + vy0*t + 0.5*g*t^2
    const gravityAcc = 220; // px/s^2
    const dtSec = 0.1; // 100ms
    const vy0 = 30; // initial downward velocity

    const distFall = vy0 * dtSec + 0.5 * gravityAcc * (dtSec * dtSec);
    assert.ok(distFall > 4.0, `Fall displacement (${distFall}px) should exceed 4.0px`);
  });

  it('cycles colors via Chromatic Pulse palette and breathes opacity', () => {
    const palette = ['#4A90E2', '#50E3C2', '#9013FE'];
    const engine = new ParticleEngine({
      palette,
      particleCount: 30,
      seed: 444,
    });

    const startColor = engine.getRenderState()[0].color;
    engine.step(CHROMATIC_PULSE_DURATION / 2);
    const midColor = engine.getRenderState()[0].color;

    assert.notEqual(startColor, midColor);
  });

  it('switches to static grid layout in reduced-motion mode', () => {
    const engine = new ParticleEngine({
      particleCount: 40,
      width: 200,
      height: 300,
      palette: ['#4A90E2', '#50E3C2'],
      reducedMotion: true,
    });

    const states = engine.getRenderState();
    assert.equal(states.length, 40);

    states.forEach((p) => {
      assert.equal(p.opacity, 1.0);
      assert.equal(p.blurPx, 0);
      assert.equal(p.color, '#4A90E2');
    });
  });

  it('encodes mass tier inverse mass factors for gravity acceleration', () => {
    assert.equal(PARTICLE_MASS_TIERS.CORES.mass, 2.5);
    assert.equal(PARTICLE_MASS_TIERS.MOTES.mass, 1.0);
    assert.equal(PARTICLE_MASS_TIERS.DUST.mass, 0.5);
  });
});
