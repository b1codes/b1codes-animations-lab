/**
 * @file lab/loaders/globe/globe.js
 * @description GlobeLoader prototype controller.
 * Implements a rotating 3D spherical node cluster with Fibonacci sphere positioning,
 * 3D rotation kinematics, perspective projection, depth-sorted refractive layers,
 * Chromatic Pulse color integration, and reduced-motion grid fallbacks.
 */

import {
  PARTICLE_MASS_TIERS,
  REFRACTIVE_DEPTH_LAYERS,
  THERMAL_GLOW_SPECTRUM,
  THERMAL_GLOW_TOTAL_DURATION,
} from '../../shared/constants.js';

import {
  ChromaticPulse,
  parseColorToRGB,
  interpolateRGB,
  rgbToHex,
} from '../../shared/particle-engine.js';

/**
 * @typedef {Object} GlobeLoaderOptions
 * @property {string | HTMLElement} container - Target SVG element ID or HTML container element
 * @property {number} [particleCount=24] - Configurable particle count (16 to 48)
 * @property {string[]} [palette] - Consuming app color palette (minimum 2 hex colors)
 * @property {number} [speed=1.0] - Animation speed multiplier
 * @property {number} [intensity=0.7] - Particle size & glow intensity multiplier
 * @property {boolean} [depth=true] - Enable multi-layer refractive depth
 * @property {boolean} [reducedMotion=false] - Enable reduced motion static grid fallback
 * @property {number} [width=200] - SVG viewBox width
 * @property {number} [height=200] - SVG viewBox height
 * @property {number} [seed] - Optional deterministic random seed
 */

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

export class GlobeLoader {
  containerEl = null;
  svgEl = null;
  bgLayerEl = null;
  midLayerEl = null;
  fgLayerEl = null;
  reducedMotionGridEl = null;

  config = null;
  particles = [];
  chromaticPulse = null;
  prng = null;

  animFrameId = null;
  lastTimestamp = 0;
  elapsedMs = 0;
  isRunning = false;
  isPausedState = false;

  fpsFrameCount = 0;
  fpsLastCheckTime = 0;
  currentFPS = 60;

  isThermalActive = false;
  thermalStartTime = 0;
  onDismissCallback = undefined;

  /**
   * @param {GlobeLoaderOptions} options
   */
  constructor(options) {
    if (typeof options.container === 'string') {
      this.containerEl = document.getElementById(options.container);
    } else {
      this.containerEl = options.container;
    }

    this.config = {
      particleCount: Math.max(12, Math.min(48, options.particleCount ?? 24)),
      palette: options.palette && options.palette.length >= 2 ? options.palette : ['#4A90E2', '#50E3C2', '#9013FE'],
      speed: options.speed ?? 1.0,
      intensity: options.intensity ?? 0.7,
      depth: options.depth ?? true,
      reducedMotion: options.reducedMotion ?? false,
      width: options.width ?? 200,
      height: options.height ?? 200,
      seed: options.seed,
    };

    const initialSeed = this.config.seed ?? Math.floor(Math.random() * 1000000);
    this.prng = new PRNG(initialSeed);

    this.chromaticPulse = new ChromaticPulse({
      palette: this.config.palette,
      reducedMotion: this.config.reducedMotion,
    });

    this.setupDOM();
    this.initGlobeParticles();
    this.renderInitialDOM();
  }

  setupDOM() {
    if (!this.containerEl) return;

    this.svgEl = this.containerEl.querySelector('#globe-loader') || this.containerEl.querySelector('svg');
    if (!this.svgEl) {
      this.containerEl.innerHTML = `
        <svg id="globe-loader" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${this.config.width} ${this.config.height}" width="100%" height="100%" role="img" aria-label="Globe Loading Indicator">
          <defs>
            <filter id="globe-bg-blur" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4.0" />
            </filter>
            <filter id="globe-mid-blur" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.0" />
            </filter>
            <filter id="globe-glow-filter" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="5.0" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <radialGradient id="globe-ambient-gradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="var(--globe-pulse-color, #4A90E2)" stop-opacity="0.35" />
              <stop offset="60%" stop-color="var(--globe-pulse-color, #4A90E2)" stop-opacity="0.1" />
              <stop offset="100%" stop-color="var(--globe-pulse-color, #4A90E2)" stop-opacity="0.0" />
            </radialGradient>
          </defs>
          <g class="globe-ambient-field">
            <circle cx="${this.config.width / 2}" cy="${this.config.height / 2}" r="${this.config.width * 0.35}" fill="url(#globe-ambient-gradient)" filter="url(#globe-bg-blur)" />
          </g>
          <g class="globe-rings-layer" opacity="0.2">
            <ellipse cx="${this.config.width / 2}" cy="${this.config.height / 2}" rx="${this.config.width * 0.32}" ry="${this.config.height * 0.12}" fill="none" stroke="var(--globe-pulse-color, #4A90E2)" stroke-width="1" stroke-dasharray="3 4" transform="rotate(-15 ${this.config.width / 2} ${this.config.height / 2})" />
            <ellipse cx="${this.config.width / 2}" cy="${this.config.height / 2}" rx="${this.config.width * 0.32}" ry="${this.config.height * 0.24}" fill="none" stroke="var(--globe-pulse-color, #4A90E2)" stroke-width="1" stroke-dasharray="3 4" transform="rotate(15 ${this.config.width / 2} ${this.config.height / 2})" />
          </g>
          <g id="globe-particles-stack">
            <g id="globe-layer-background" filter="url(#globe-bg-blur)" opacity="0.4"></g>
            <g id="globe-layer-midground" filter="url(#globe-mid-blur)" opacity="0.75"></g>
            <g id="globe-layer-foreground" filter="url(#globe-glow-filter)"></g>
          </g>
          <g id="globe-reduced-motion-grid" display="none"></g>
        </svg>
      `;
      this.svgEl = this.containerEl.querySelector('#globe-loader');
    }

    this.bgLayerEl = this.svgEl.querySelector('#globe-layer-background');
    this.midLayerEl = this.svgEl.querySelector('#globe-layer-midground');
    this.fgLayerEl = this.svgEl.querySelector('#globe-layer-foreground');
    this.reducedMotionGridEl = this.svgEl.querySelector('#globe-reduced-motion-grid');

    if (this.config.reducedMotion) {
      this.containerEl.classList.add('reduced-motion-active');
    }
  }

  /**
   * Initializes 3D spherical node parameters using Fibonacci sphere distribution.
   */
  initGlobeParticles() {
    const { particleCount, width, depth } = this.config;
    const sphereRadius = width * 0.35;

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
    const goldenRatio = (1 + Math.sqrt(5)) / 2;

    for (let i = 0; i < particleCount; i++) {
      const tierIndex = i % 10 < 2 ? 0 : i % 10 < 7 ? 1 : 2;
      const massTier = massTiers[tierIndex];

      const layerIndex = depth ? (i % 3) : 2;
      const depthLayer = depthLayers[layerIndex];

      // Fibonacci sphere 3D coordinate distribution
      const theta = 2 * Math.PI * i / goldenRatio;
      const phi = Math.acos(1 - 2 * (i + 0.5) / particleCount);

      const x3d = sphereRadius * Math.sin(phi) * Math.cos(theta);
      const y3d = sphereRadius * Math.sin(phi) * Math.sin(theta);
      const z3d = sphereRadius * Math.cos(phi);

      this.particles.push({
        id: i,
        x3d,
        y3d,
        z3d,
        massTier,
        depthLayer,
        shimmerOffset: this.prng.range(0, Math.PI * 2),
      });
    }
  }

  renderInitialDOM() {
    if (!this.bgLayerEl || !this.midLayerEl || !this.fgLayerEl || !this.reducedMotionGridEl) return;

    this.bgLayerEl.innerHTML = '';
    this.midLayerEl.innerHTML = '';
    this.fgLayerEl.innerHTML = '';
    this.reducedMotionGridEl.innerHTML = '';

    // Create SVG particle circles in depth layers
    this.particles.forEach((p) => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('id', `globe-particle-${p.id}`);
      circle.setAttribute('class', 'globe-particle');
      circle.setAttribute('data-mass-tier', p.massTier.name);

      const targetLayer =
        p.depthLayer.layer === 'background'
          ? this.bgLayerEl
          : p.depthLayer.layer === 'midground'
          ? this.midLayerEl
          : this.fgLayerEl;

      targetLayer?.appendChild(circle);
    });

    // Create reduced motion static grid
    const cols = Math.ceil(Math.sqrt(this.config.particleCount));
    const rows = Math.ceil(this.config.particleCount / cols);
    const cellW = this.config.width / cols;
    const cellH = this.config.height / rows;

    for (let i = 0; i < this.config.particleCount; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = (col + 0.5) * cellW;
      const y = (row + 0.5) * cellH;

      const gridDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      gridDot.setAttribute('cx', x.toFixed(2));
      gridDot.setAttribute('cy', y.toFixed(2));
      gridDot.setAttribute('r', '4');
      gridDot.setAttribute('fill', this.config.palette[0]);
      gridDot.setAttribute('opacity', '0.85');
      this.reducedMotionGridEl.appendChild(gridDot);
    }

    this.updateRenderFrame();
  }

  /**
   * Main render tick step computing 3D rotation, perspective projection, depth sorting, and SVG attribute updates.
   */
  updateRenderFrame() {
    if (!this.svgEl) return;

    const pulseState = this.chromaticPulse.evaluateAt(this.elapsedMs);
    this.svgEl.style.setProperty('--globe-pulse-color', pulseState.color);

    if (this.config.reducedMotion) {
      if (this.reducedMotionGridEl) {
        this.reducedMotionGridEl.setAttribute('display', 'block');
      }
      return;
    } else if (this.reducedMotionGridEl) {
      this.reducedMotionGridEl.setAttribute('display', 'none');
    }

    const cx = this.config.width / 2;
    const cy = this.config.height / 2;

    if (this.isThermalActive) {
      const elapsedThermal = this.elapsedMs - this.thermalStartTime;
      const progress = Math.min(1.0, elapsedThermal / THERMAL_GLOW_TOTAL_DURATION);

      if (progress >= 1.0) {
        this.stop();
        if (this.svgEl) this.svgEl.style.display = 'none';
        const cb = this.onDismissCallback;
        this.onDismissCallback = undefined;
        cb?.();
        return;
      }

      const heatStartRGB = parseColorToRGB(THERMAL_GLOW_SPECTRUM[0]);
      const heatEndRGB = parseColorToRGB(THERMAL_GLOW_SPECTRUM[1]);
      const currentHeatRGB = interpolateRGB(heatStartRGB, heatEndRGB, progress);
      const thermalColor = rgbToHex(currentHeatRGB);
      const easedProgress = 1 - Math.pow(1 - progress, 4);

      this.particles.forEach((p) => {
        const circleEl = this.svgEl?.querySelector(`#globe-particle-${p.id}`);
        if (!circleEl) return;

        const dx = (p.x3d || 0);
        const dy = (p.y3d || 0);
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const scatterMag = dist * (1 + easedProgress * 2.0);

        const drawX = cx + (dx / dist) * scatterMag;
        const drawY = cy + (dy / dist) * scatterMag;

        const baseScale = p.massTier.sizeRatio * this.config.intensity;
        const finalRadius = Math.max(1.5, 3.5 * baseScale * p.depthLayer.scale);
        const finalOpacity = Math.max(0, pulseState.opacity * p.depthLayer.opacityMultiplier * (1 - progress));

        circleEl.setAttribute('cx', drawX.toFixed(2));
        circleEl.setAttribute('cy', drawY.toFixed(2));
        circleEl.setAttribute('r', finalRadius.toFixed(2));
        circleEl.setAttribute('fill', thermalColor);
        circleEl.setAttribute('opacity', finalOpacity.toFixed(3));
      });
      return;
    }

    // 3D rotation angles
    const rotY = this.elapsedMs * 0.0008 * this.config.speed;
    const pitch = 0.35; // ~20 deg tilt angle
    const cosY = Math.cos(rotY);
    const sinY = Math.sin(rotY);
    const cosP = Math.cos(pitch);
    const sinP = Math.sin(pitch);
    const cameraDist = this.config.width * 1.5;

    this.particles.forEach((p) => {
      const circleEl = this.svgEl?.querySelector(`#globe-particle-${p.id}`);
      if (!circleEl) return;

      // Rotate around Y-axis then tilt X-axis pitch
      const xRot = p.x3d * cosY + p.z3d * sinY;
      const zRot = -p.x3d * sinY + p.z3d * cosY;

      const yRot = p.y3d * cosP - zRot * sinP;
      const zFinal = p.y3d * sinP + zRot * cosP;

      // Perspective projection factor
      const perspective = cameraDist / (cameraDist - zFinal);
      const projX = cx + xRot * perspective;
      const projY = cy + yRot * perspective;

      // Front/back depth factor (zFinal > 0 is front face of sphere)
      const depthFactor = (zFinal + this.config.width * 0.35) / (this.config.width * 0.7);
      const frontFactor = Math.max(0.2, Math.min(1.0, depthFactor));

      const baseScale = p.massTier.sizeRatio * this.config.intensity;
      const finalRadius = Math.max(1.2, 3.8 * baseScale * perspective * p.depthLayer.scale);

      const shimmer = 0.85 + 0.15 * Math.sin(this.elapsedMs * 0.003 * p.massTier.shimmerRate + p.shimmerOffset);
      const finalOpacity = Math.max(0.1, Math.min(1.0, pulseState.opacity * p.depthLayer.opacityMultiplier * shimmer * frontFactor));

      circleEl.setAttribute('cx', projX.toFixed(2));
      circleEl.setAttribute('cy', projY.toFixed(2));
      circleEl.setAttribute('r', finalRadius.toFixed(2));
      circleEl.setAttribute('fill', pulseState.color);
      circleEl.setAttribute('opacity', finalOpacity.toFixed(3));
    });
  }

  tick = (timestamp) => {
    if (!this.isRunning) return;

    if (!this.lastTimestamp) this.lastTimestamp = timestamp;
    const deltaMs = timestamp - this.lastTimestamp;
    this.lastTimestamp = timestamp;

    this.fpsFrameCount++;
    if (timestamp - this.fpsLastCheckTime >= 1000) {
      this.currentFPS = Math.round((this.fpsFrameCount * 1000) / (timestamp - this.fpsLastCheckTime));
      this.fpsFrameCount = 0;
      this.fpsLastCheckTime = timestamp;
    }

    if (!this.isPausedState) {
      const stepMs = Math.min(64, deltaMs);
      this.elapsedMs += stepMs * this.config.speed;
      this.updateRenderFrame();
    }

    this.animFrameId = requestAnimationFrame(this.tick);
  };

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.isPausedState = false;
    this.lastTimestamp = 0;
    this.animFrameId = requestAnimationFrame(this.tick);
  }

  stop() {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  pause() {
    this.isPausedState = true;
  }

  resume() {
    this.isPausedState = false;
  }

  isPaused() {
    return this.isPausedState;
  }

  setPalette(palette) {
    if (!palette || palette.length < 2) return;
    this.config.palette = palette;
    this.chromaticPulse.updateConfig({ palette });
    this.renderInitialDOM();
  }

  setParticleCount(count) {
    const clamped = Math.max(12, Math.min(48, count));
    if (clamped === this.config.particleCount) return;
    this.config.particleCount = clamped;
    this.initGlobeParticles();
    this.renderInitialDOM();
  }

  setSpeed(speed) {
    this.config.speed = Math.max(0.1, Math.min(5.0, speed));
  }

  setIntensity(intensity) {
    this.config.intensity = Math.max(0.1, Math.min(1.5, intensity));
  }

  setDepth(enabled) {
    if (enabled === this.config.depth) return;
    this.config.depth = enabled;
    this.initGlobeParticles();
    this.renderInitialDOM();
  }

  setReducedMotion(enabled) {
    this.config.reducedMotion = enabled;
    this.chromaticPulse.updateConfig({ reducedMotion: enabled });
    if (this.containerEl) {
      if (enabled) {
        this.containerEl.classList.add('reduced-motion-active');
      } else {
        this.containerEl.classList.remove('reduced-motion-active');
      }
    }
    this.updateRenderFrame();
  }

  getFPS() {
    return this.currentFPS;
  }

  resolve(onDismiss) {
    if (this.isThermalActive) return;
    this.onDismissCallback = onDismiss;

    if (this.config.reducedMotion) {
      this.stop();
      if (this.svgEl) this.svgEl.style.display = 'none';
      const cb = this.onDismissCallback;
      this.onDismissCallback = undefined;
      cb?.();
      return;
    }

    this.isThermalActive = true;
    this.thermalStartTime = this.elapsedMs;
  }

  reset() {
    this.stop();
    this.isThermalActive = false;
    this.thermalStartTime = 0;
    this.onDismissCallback = undefined;
    if (this.svgEl) this.svgEl.style.display = 'block';
    this.elapsedMs = 0;
    const seed = this.config.seed ?? Math.floor(Math.random() * 1000000);
    this.prng = new PRNG(seed);
    this.initGlobeParticles();
    this.renderInitialDOM();
    this.start();
  }

  destroy() {
    this.stop();
    if (this.containerEl) {
      this.containerEl.innerHTML = '';
    }
  }
}
