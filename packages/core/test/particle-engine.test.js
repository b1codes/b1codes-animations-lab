import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ChromaticPulse,
  solveCubicBezier,
  parseColorToRGB,
  interpolateRGB,
  rgbToHex,
  ParticleEngine,
} from '../dist/index.js';

describe('Chromatic Pulse Palette & Easing Engine', () => {
  it('parses hex and rgb colors correctly', () => {
    assert.deepEqual(parseColorToRGB('#FF0000'), [255, 0, 0]);
    assert.deepEqual(parseColorToRGB('#00FF00'), [0, 255, 0]);
    assert.deepEqual(parseColorToRGB('#000'), [0, 0, 0]);
    assert.deepEqual(parseColorToRGB('rgb(100, 150, 200)'), [100, 150, 200]);
  });

  it('interpolates RGB values and converts back to hex', () => {
    const red = [255, 0, 0];
    const blue = [0, 0, 255];
    const mid = interpolateRGB(red, blue, 0.5);
    assert.deepEqual(mid, [128, 0, 128]);
    assert.equal(rgbToHex(mid), '#800080');
  });

  it('evaluates cubic bezier curve boundaries', () => {
    assert.equal(solveCubicBezier(0), 0);
    assert.equal(solveCubicBezier(1), 1);
    const midValue = solveCubicBezier(0.5);
    assert.ok(midValue > 0 && midValue < 1);
  });

  it('cycles colors and modulates breathing opacity over elapsed time', () => {
    const pulse = new ChromaticPulse({
      palette: ['#FF0000', '#00FF00', '#0000FF'],
      durationMs: 3200,
    });

    const start = pulse.evaluateAt(0);
    assert.equal(start.color.toLowerCase(), '#ff0000');
    assert.ok(start.opacity >= 0.55 && start.opacity <= 1.0);

    const mid = pulse.evaluateAt(1600);
    assert.ok(mid.color !== start.color);
    assert.equal(mid.progress, 0.5);

    const fullCycle = pulse.evaluateAt(3200);
    assert.equal(fullCycle.color.toLowerCase(), '#ff0000');
    assert.equal(fullCycle.progress, 0);
  });

  it('handles reduced motion mode in ChromaticPulse', () => {
    const pulse = new ChromaticPulse({
      palette: ['#123456', '#abcdef'],
      reducedMotion: true,
    });

    const state = pulse.evaluateAt(1000);
    assert.equal(state.color, '#123456');
    assert.equal(state.opacity, 1.0);
    assert.equal(state.progress, 0);
  });
});

describe('Particle Engine & Physics Solver Core', () => {
  it('outputs correct particle render state array per tick', () => {
    const engine = new ParticleEngine({
      particleCount: 12,
      seed: 42,
      width: 100,
      height: 100,
    });

    const renderStates = engine.getRenderState();
    assert.equal(renderStates.length, 12);

    const p0 = renderStates[0];
    assert.equal(typeof p0.id, 'number');
    assert.equal(typeof p0.x, 'number');
    assert.equal(typeof p0.y, 'number');
    assert.equal(typeof p0.scale, 'number');
    assert.equal(typeof p0.opacity, 'number');
    assert.equal(typeof p0.color, 'string');
    assert.equal(typeof p0.blurPx, 'number');
    assert.ok(['background', 'midground', 'foreground'].includes(p0.layer));
  });

  it('is deterministic when initialized with a fixed random seed', () => {
    const engine1 = new ParticleEngine({ particleCount: 10, seed: 12345 });
    const engine2 = new ParticleEngine({ particleCount: 10, seed: 12345 });

    const state1 = engine1.step(50);
    const state2 = engine2.step(50);

    assert.deepEqual(state1, state2);
  });

  it('assigns mass-based velocity and refractive depth layers', () => {
    const engine = new ParticleEngine({ particleCount: 15, seed: 99, depth: true });
    const renderStates = engine.getRenderState();

    const layers = new Set(renderStates.map((p) => p.layer));
    assert.ok(layers.has('background'));
    assert.ok(layers.has('midground'));
    assert.ok(layers.has('foreground'));

    const bgParticle = renderStates.find((p) => p.layer === 'background');
    const fgParticle = renderStates.find((p) => p.layer === 'foreground');

    assert.ok(bgParticle.blurPx > fgParticle.blurPx);
    assert.equal(fgParticle.blurPx, 0);
  });

  it('supports pause and resume lifecycle controls', () => {
    const engine = new ParticleEngine({ particleCount: 8, seed: 100 });

    engine.step(100);
    const stateBeforePause = engine.getRenderState();

    engine.pause();
    assert.equal(engine.isPaused(), true);

    const stateWhilePaused = engine.step(100);
    assert.deepEqual(stateWhilePaused, stateBeforePause);

    engine.resume();
    assert.equal(engine.isPaused(), false);

    const stateAfterResume = engine.step(100);
    assert.notDeepEqual(stateAfterResume, stateBeforePause);
  });

  it('outputs static dot grid in reduced-motion mode', () => {
    const engine = new ParticleEngine({
      particleCount: 9,
      width: 90,
      height: 90,
      palette: ['#FF1020', '#304050'],
      reducedMotion: true,
    });

    const states = engine.getRenderState();
    assert.equal(states.length, 9);

    states.forEach((p) => {
      assert.equal(p.opacity, 1.0);
      assert.equal(p.scale, 1.0);
      assert.equal(p.blurPx, 0);
      assert.equal(p.color, '#FF1020');
      assert.equal(p.layer, 'foreground');
    });

    // Verify grid spacing (3x3 grid in 90x90 container: cell size 30x30, centers at 15, 45, 75)
    assert.equal(states[0].x, 15);
    assert.equal(states[0].y, 15);
    assert.equal(states[1].x, 45);
    assert.equal(states[1].y, 15);
    assert.equal(states[2].x, 75);
    assert.equal(states[2].y, 15);
    assert.equal(states[3].x, 15);
    assert.equal(states[3].y, 45);

    // Verify tick step does not change reduced motion grid positions
    const steppedStates = engine.step(1000);
    assert.deepEqual(steppedStates, states);
  });

  it('supports dynamic configuration updates', () => {
    const engine = new ParticleEngine({ particleCount: 10, seed: 50 });
    assert.equal(engine.getRenderState().length, 10);

    engine.updateConfig({ particleCount: 20 });
    assert.equal(engine.getRenderState().length, 20);

    engine.updateConfig({ reducedMotion: true });
    assert.equal(engine.getRenderState()[0].color, '#4A90E2');
    assert.equal(engine.getRenderState()[0].blurPx, 0);
  });
});
