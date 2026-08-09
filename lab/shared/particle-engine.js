/**
 * @file lab/shared/particle-engine.js
 * @description Shared JS particle engine and physics solver for b1codes lab prototypes.
 * ES Module format for direct browser consumption.
 */

import {
  CHROMATIC_PULSE_DURATION,
  CHROMATIC_EASE_BEZIER,
  CHROMATIC_OPACITY_RANGE,
  PARTICLE_MASS_TIERS,
  REFRACTIVE_DEPTH_LAYERS,
  DRAG_RESISTANCE,
} from './constants.js';

/**
 * Solves a cubic bezier curve Y for a given progress t [0, 1].
 */
export function solveCubicBezier(
  t,
  x1 = CHROMATIC_EASE_BEZIER[0],
  y1 = CHROMATIC_EASE_BEZIER[1],
  x2 = CHROMATIC_EASE_BEZIER[2],
  y2 = CHROMATIC_EASE_BEZIER[3]
) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;

  let u = t;
  for (let i = 0; i < 8; i++) {
    const oneMinusU = 1 - u;
    const x = 3 * oneMinusU * oneMinusU * u * x1 + 3 * oneMinusU * u * u * x2 + u * u * u;
    const dx = 3 * oneMinusU * oneMinusU * x1 + 6 * oneMinusU * u * (x2 - x1) + 3 * u * u * (1 - x2);
    if (Math.abs(dx) < 1e-6) break;
    u -= (x - t) / dx;
    u = Math.max(0, Math.min(1, u));
  }

  const oneMinusU = 1 - u;
  return 3 * oneMinusU * oneMinusU * u * y1 + 3 * oneMinusU * u * u * y2 + u * u * u;
}

export function parseColorToRGB(colorStr) {
  let hex = String(colorStr).trim().replace(/^#/, '');
  if (hex.length === 3) {
    hex = hex.split('').map((c) => c + c).join('');
  }
  if (hex.length === 6) {
    const num = parseInt(hex, 16);
    if (!isNaN(num)) {
      return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
    }
  }

  const rgbMatch = colorStr.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
  if (rgbMatch) {
    return [parseInt(rgbMatch[1], 10), parseInt(rgbMatch[2], 10), parseInt(rgbMatch[3], 10)];
  }

  return [255, 255, 255];
}

export function interpolateRGB(rgbA, rgbB, t) {
  const clampedT = Math.max(0, Math.min(1, t));
  return [
    Math.round(rgbA[0] + (rgbB[0] - rgbA[0]) * clampedT),
    Math.round(rgbA[1] + (rgbB[1] - rgbA[1]) * clampedT),
    Math.round(rgbA[2] + (rgbB[2] - rgbA[2]) * clampedT),
  ];
}

export function rgbToHex(rgb) {
  const toHex = (c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0');
  return `#${toHex(rgb[0])}${toHex(rgb[1])}${toHex(rgb[2])}`;
}

export class ChromaticPulse {
  constructor(config = {}) {
    this.palette = config.palette && config.palette.length >= 2 ? config.palette : ['#4A90E2', '#50E3C2', '#9013FE'];
    this.durationMs = config.durationMs ?? CHROMATIC_PULSE_DURATION;
    this.bezierCurve = config.bezierCurve ?? CHROMATIC_EASE_BEZIER;
    this.opacityRange = config.opacityRange ?? CHROMATIC_OPACITY_RANGE;
    this.reducedMotion = config.reducedMotion ?? false;
    this.parsedPalette = this.palette.map(parseColorToRGB);
  }

  updateConfig(config = {}) {
    if (config.palette && config.palette.length >= 2) {
      this.palette = config.palette;
      this.parsedPalette = this.palette.map(parseColorToRGB);
    }
    if (config.durationMs !== undefined) this.durationMs = config.durationMs;
    if (config.bezierCurve !== undefined) this.bezierCurve = config.bezierCurve;
    if (config.opacityRange !== undefined) this.opacityRange = config.opacityRange;
    if (config.reducedMotion !== undefined) this.reducedMotion = config.reducedMotion;
  }

  evaluateAt(elapsedMs) {
    if (this.reducedMotion) {
      return { color: this.palette[0], opacity: 1.0, progress: 0 };
    }

    const totalDuration = Math.max(1, this.durationMs);
    const progress = (elapsedMs % totalDuration) / totalDuration;

    const count = this.parsedPalette.length;
    const scaledProgress = progress * count;
    const index = Math.floor(scaledProgress);
    const nextIndex = (index + 1) % count;
    const segmentProgress = scaledProgress - index;

    const easedSegment = solveCubicBezier(
      segmentProgress,
      this.bezierCurve[0],
      this.bezierCurve[1],
      this.bezierCurve[2],
      this.bezierCurve[3]
    );

    const interpolatedRGB = interpolateRGB(
      this.parsedPalette[index],
      this.parsedPalette[nextIndex],
      easedSegment
    );
    const color = rgbToHex(interpolatedRGB);

    const breathingFactor = 0.5 * (1 + Math.sin(progress * 2 * Math.PI));
    const opacity =
      this.opacityRange.min +
      (this.opacityRange.max - this.opacityRange.min) * breathingFactor;

    return {
      color,
      opacity: Number(opacity.toFixed(4)),
      progress: Number(progress.toFixed(4)),
    };
  }
}

class PRNG {
  constructor(seed) {
    this.state = seed >>> 0;
  }

  next() {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min, max) {
    return min + this.next() * (max - min);
  }
}

export class ParticleEngine {
  constructor(config = {}) {
    this.config = {
      particleCount: config.particleCount ?? 24,
      palette: config.palette && config.palette.length >= 2 ? config.palette : ['#4A90E2', '#50E3C2', '#9013FE'],
      speed: config.speed ?? 1.0,
      intensity: config.intensity ?? 0.7,
      depth: config.depth ?? true,
      reducedMotion: config.reducedMotion ?? false,
      width: config.width ?? 48,
      height: config.height ?? 48,
      seed: config.seed,
    };

    const initialSeed = this.config.seed ?? Math.floor(Math.random() * 1000000);
    this.prng = new PRNG(initialSeed);

    this.chromaticPulse = new ChromaticPulse({
      palette: this.config.palette,
      reducedMotion: this.config.reducedMotion,
    });

    this.elapsedMs = 0;
    this.paused = false;
    this.particles = [];
    this.initParticles();
    this.cachedRenderState = this.computeRenderState();
  }

  initParticles() {
    const { particleCount, width, height, depth } = this.config;
    const cx = width / 2;
    const cy = height / 2;

    const massTiers = [
      PARTICLE_MASS_TIERS.CORES,
      PARTICLE_MASS_TIERS.MOTES,
      PARTICLE_MASS_TIERS.DUST,
    ];

    const depthLayers = [
      REFRACTIVE_DEPTH_LAYERS.BACKGROUND,
      REFRACTIVE_DEPTH_LAYERS.MIDGROUND,
      REFRACTIVE_DEPTH_LAYERS.FOREGROUND,
    ];

    this.particles = [];

    for (let i = 0; i < particleCount; i++) {
      const tierIndex = i % 10 < 2 ? 0 : i % 10 < 7 ? 1 : 2;
      const massTier = massTiers[tierIndex];

      const layerIndex = depth ? (i % 3) : 2;
      const depthLayer = depthLayers[layerIndex];

      const angle = this.prng.range(0, Math.PI * 2);
      const radius = this.prng.range(width * 0.1, width * 0.4);
      const px = cx + Math.cos(angle) * radius;
      const py = cy + Math.sin(angle) * radius;

      const speedMag = (15 / massTier.mass) * (0.8 + this.prng.next() * 0.4);
      const vx = -Math.sin(angle) * speedMag;
      const vy = Math.cos(angle) * speedMag;

      this.particles.push({
        id: i,
        x: px,
        y: py,
        vx,
        vy,
        baseX: px,
        baseY: py,
        massTier,
        depthLayer,
        phaseOffset: this.prng.range(0, Math.PI * 2),
      });
    }
  }

  computeReducedMotionState() {
    const { particleCount, width, height, palette } = this.config;
    const cols = Math.ceil(Math.sqrt(particleCount));
    const rows = Math.ceil(particleCount / cols);
    const cellW = width / cols;
    const cellH = height / rows;
    const baseColor = palette[0] || '#FFFFFF';

    const states = [];
    for (let i = 0; i < particleCount; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = (col + 0.5) * cellW;
      const y = (row + 0.5) * cellH;

      states.push({
        id: i,
        x: Number(x.toFixed(2)),
        y: Number(y.toFixed(2)),
        scale: 1.0,
        opacity: 1.0,
        color: baseColor,
        blurPx: 0,
        layer: 'foreground',
      });
    }
    return states;
  }

  computeRenderState() {
    if (this.config.reducedMotion) {
      return this.computeReducedMotionState();
    }

    const pulseState = this.chromaticPulse.evaluateAt(this.elapsedMs);
    const dtSec = 0.016 * this.config.speed;
    const cx = this.config.width / 2;
    const cy = this.config.height / 2;

    const renderStates = [];

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      const dx = cx - p.x;
      const dy = cy - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;

      const forceMag = (20 / p.massTier.mass) * (dist / (this.config.width * 0.5));
      const fx = (dx / dist) * forceMag;
      const fy = (dy / dist) * forceMag;

      p.vx = (p.vx + fx * dtSec) * (1 - DRAG_RESISTANCE * dtSec);
      p.vy = (p.vy + fy * dtSec) * (1 - DRAG_RESISTANCE * dtSec);

      p.x += p.vx * p.massTier.velocityRatio * dtSec;
      p.y += p.vy * p.massTier.velocityRatio * dtSec;

      const baseScale = p.massTier.sizeRatio * this.config.intensity;
      const finalScale = Number((baseScale * p.depthLayer.scale).toFixed(3));

      const shimmer = 0.85 + 0.15 * Math.sin(this.elapsedMs * 0.003 * p.massTier.shimmerRate + p.phaseOffset);
      const finalOpacity = Number(
        (pulseState.opacity * p.depthLayer.opacityMultiplier * shimmer).toFixed(3)
      );

      renderStates.push({
        id: p.id,
        x: Number(p.x.toFixed(2)),
        y: Number(p.y.toFixed(2)),
        scale: Math.max(0.1, finalScale),
        opacity: Math.max(0, Math.min(1, finalOpacity)),
        color: pulseState.color,
        blurPx: p.depthLayer.blurPx,
        layer: p.depthLayer.layer,
      });
    }

    return renderStates;
  }

  step(deltaTimeMs) {
    if (this.paused) {
      return this.cachedRenderState;
    }

    this.elapsedMs += deltaTimeMs * this.config.speed;
    this.cachedRenderState = this.computeRenderState();
    return this.cachedRenderState;
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
  }

  isPaused() {
    return this.paused;
  }

  reset() {
    this.elapsedMs = 0;
    const seed = this.config.seed ?? Math.floor(Math.random() * 1000000);
    this.prng = new PRNG(seed);
    this.initParticles();
    this.cachedRenderState = this.computeRenderState();
  }

  updateConfig(newConfig = {}) {
    let reinitNeeded = false;

    if (newConfig.particleCount !== undefined && newConfig.particleCount !== this.config.particleCount) {
      this.config.particleCount = newConfig.particleCount;
      reinitNeeded = true;
    }
    if (newConfig.width !== undefined && newConfig.width !== this.config.width) {
      this.config.width = newConfig.width;
      reinitNeeded = true;
    }
    if (newConfig.height !== undefined && newConfig.height !== this.config.height) {
      this.config.height = newConfig.height;
      reinitNeeded = true;
    }
    if (newConfig.seed !== undefined) {
      this.config.seed = newConfig.seed;
      reinitNeeded = true;
    }

    if (newConfig.palette !== undefined) {
      this.config.palette = newConfig.palette;
      this.chromaticPulse.updateConfig({ palette: newConfig.palette });
    }
    if (newConfig.speed !== undefined) this.config.speed = newConfig.speed;
    if (newConfig.intensity !== undefined) this.config.intensity = newConfig.intensity;
    if (newConfig.depth !== undefined) this.config.depth = newConfig.depth;
    if (newConfig.reducedMotion !== undefined) {
      this.config.reducedMotion = newConfig.reducedMotion;
      this.chromaticPulse.updateConfig({ reducedMotion: newConfig.reducedMotion });
    }

    if (reinitNeeded) {
      const seed = this.config.seed ?? Math.floor(Math.random() * 1000000);
      this.prng = new PRNG(seed);
      this.initParticles();
    }

    this.cachedRenderState = this.computeRenderState();
  }

  getRenderState() {
    return this.cachedRenderState;
  }
}
