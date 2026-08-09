/**
 * @file lab/loaders/cascade/cascade.js
 * @description CascadeLoader prototype controller.
 * Implements gravity-driven particle descent, wind drift, floor contact pooling & glow effects,
 * speed staggers, Chromatic Pulse color integration, refractive depth stacking, and reduced-motion grid fallbacks.
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
 * @typedef {Object} CascadeLoaderOptions
 * @property {string | HTMLElement} container - Target SVG element ID or HTML container element
 * @property {number} [particleCount=30] - Configurable particle count (20 to 40)
 * @property {string[]} [palette] - Consuming app color palette (minimum 2 hex colors)
 * @property {number} [speed=1.0] - Animation speed multiplier
 * @property {number} [gravity=1.0] - Gravity acceleration multiplier
 * @property {number} [wind=1.0] - Horizontal wind drift multiplier
 * @property {number} [intensity=0.7] - Particle size & glow intensity multiplier
 * @property {boolean} [depth=true] - Enable multi-layer refractive depth
 * @property {boolean} [reducedMotion=false] - Enable reduced motion static grid fallback
 * @property {number} [width=200] - SVG viewBox width
 * @property {number} [height=300] - SVG viewBox height
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

export class CascadeLoader {
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
   * @param {CascadeLoaderOptions} options
   */
  constructor(options) {
    if (typeof options.container === 'string') {
      this.containerEl = document.getElementById(options.container);
    } else {
      this.containerEl = options.container;
    }

    this.config = {
      particleCount: Math.max(12, Math.min(50, options.particleCount ?? 30)),
      palette: options.palette && options.palette.length >= 2 ? options.palette : ['#4A90E2', '#50E3C2', '#9013FE'],
      speed: options.speed ?? 1.0,
      gravity: options.gravity ?? 1.0,
      wind: options.wind ?? 1.0,
      intensity: options.intensity ?? 0.7,
      depth: options.depth ?? true,
      reducedMotion: options.reducedMotion ?? false,
      width: options.width ?? 200,
      height: options.height ?? 300,
      seed: options.seed,
    };

    const initialSeed = this.config.seed ?? Math.floor(Math.random() * 1000000);
    this.prng = new PRNG(initialSeed);

    this.chromaticPulse = new ChromaticPulse({
      palette: this.config.palette,
      reducedMotion: this.config.reducedMotion,
    });

    this.setupDOM();
    this.initCascadeParticles();
    this.renderInitialDOM();
  }

  setupDOM() {
    if (!this.containerEl) return;

    this.svgEl = this.containerEl.querySelector('#cascade-loader') || this.containerEl.querySelector('svg');
    if (!this.svgEl) {
      this.containerEl.innerHTML = `
        <svg id="cascade-loader" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${this.config.width} ${this.config.height}" width="100%" height="100%" role="img" aria-label="Cascade Loading Indicator">
          <defs>
            <filter id="cascade-bg-blur" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4.0" />
            </filter>
            <filter id="cascade-mid-blur" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.0" />
            </filter>
            <filter id="cascade-glow-filter" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="5.0" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="cascade-floor-glow-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="var(--cascade-pulse-color, #4A90E2)" stop-opacity="0.0" />
              <stop offset="25%" stop-color="var(--cascade-pulse-color, #4A90E2)" stop-opacity="0.3" />
              <stop offset="50%" stop-color="var(--cascade-pulse-color, #4A90E2)" stop-opacity="0.6" />
              <stop offset="75%" stop-color="var(--cascade-pulse-color, #4A90E2)" stop-opacity="0.3" />
              <stop offset="100%" stop-color="var(--cascade-pulse-color, #4A90E2)" stop-opacity="0.0" />
            </linearGradient>
          </defs>
          <g class="cascade-floor-surface">
            <rect class="floor-glow-bar" x="15" y="${this.config.height - 48}" width="${this.config.width - 30}" height="4" rx="2" fill="url(#cascade-floor-glow-gradient)" filter="url(#cascade-glow-filter)" />
            <line class="floor-baseline" x1="20" y1="${this.config.height - 46}" x2="${this.config.width - 20}" y2="${this.config.height - 46}" stroke="var(--cascade-pulse-color, #4A90E2)" stroke-opacity="0.25" stroke-dasharray="3 3" />
          </g>
          <g id="cascade-particles-stack">
            <g id="cascade-layer-background" filter="url(#cascade-bg-blur)" opacity="0.45"></g>
            <g id="cascade-layer-midground" filter="url(#cascade-mid-blur)" opacity="0.75"></g>
            <g id="cascade-layer-foreground" filter="url(#cascade-glow-filter)"></g>
          </g>
          <g id="cascade-reduced-motion-grid" display="none"></g>
        </svg>
      `;
      this.svgEl = this.containerEl.querySelector('#cascade-loader');
    }

    this.bgLayerEl = this.svgEl.querySelector('#cascade-layer-background');
    this.midLayerEl = this.svgEl.querySelector('#cascade-layer-midground');
    this.fgLayerEl = this.svgEl.querySelector('#cascade-layer-foreground');
    this.reducedMotionGridEl = this.svgEl.querySelector('#cascade-reduced-motion-grid');

    if (this.config.reducedMotion) {
      this.containerEl.classList.add('reduced-motion-active');
    }
  }

  /**
   * Initializes cascading particles with vertical position staggers along descent path.
   */
  initCascadeParticles() {
    const { particleCount, width, height, depth } = this.config;
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

      // Stagger vertical initial spawn across height [0, height * 0.85] for smooth startup flow
      const x = this.prng.range(15, width - 15);
      const y = this.prng.range(-30, height * 0.8);
      const speedStagger = 0.85 + this.prng.next() * 0.35;

      this.particles.push({
        id: i,
        x,
        y,
        vx: this.prng.range(-4, 4),
        vy: this.prng.range(20, 60),
        massTier,
        depthLayer,
        phaseOffset: this.prng.range(0, Math.PI * 2),
        windOffset: this.prng.range(0, Math.PI * 2),
        speedStagger,
        isPooling: false,
        poolTimerMs: 0,
      });
    }
  }

  respawnParticle(p) {
    const { width } = this.config;
    p.x = this.prng.range(15, width - 15);
    p.y = this.prng.range(-35, -5);
    p.vx = this.prng.range(-4, 4);
    p.vy = this.prng.range(10, 40);
    p.isPooling = false;
    p.poolTimerMs = 0;
    p.speedStagger = 0.85 + this.prng.next() * 0.35;
  }

  renderInitialDOM() {
    if (!this.bgLayerEl || !this.midLayerEl || !this.fgLayerEl || !this.reducedMotionGridEl) return;

    this.bgLayerEl.innerHTML = '';
    this.midLayerEl.innerHTML = '';
    this.fgLayerEl.innerHTML = '';
    this.reducedMotionGridEl.innerHTML = '';

    // Create SVG particle circles
    this.particles.forEach((p) => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('id', `cascade-particle-${p.id}`);
      circle.setAttribute('class', 'cascade-particle');
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
   * Main render frame step: updates gravity acceleration, wind sway, floor pooling deceleration,
   * thermal dissolve & respawn sequences.
   */
  updateRenderFrame() {
    if (!this.svgEl) return;

    const pulseState = this.chromaticPulse.evaluateAt(this.elapsedMs);
    this.svgEl.style.setProperty('--cascade-pulse-color', pulseState.color);

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
        const circleEl = this.svgEl?.querySelector(`#cascade-particle-${p.id}`);
        if (!circleEl) return;

        const dx = p.x - cx;
        const dy = p.y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const scatterMag = dist * (1 + easedProgress * 1.8);

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

    const dtSec = 0.016 * this.config.speed;
    const gravityAcc = 250 * this.config.gravity;
    const floorY = this.config.height - 46;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const circleEl = this.svgEl.querySelector(`#cascade-particle-${p.id}`);
      if (!circleEl) continue;

      if (p.isPooling) {
        // Floor pooling state: decelerate, flare horizontally, dissolve over 320ms
        p.poolTimerMs += 16 * 1000 * dtSec;
        const poolProgress = Math.min(1.0, p.poolTimerMs / 320);

        p.vx *= 0.92;
        p.vy *= 0.85;
        p.x += p.vx * dtSec;
        p.y = Math.min(floorY + 2, p.y + p.vy * dtSec);

        if (poolProgress >= 1.0) {
          circleEl.classList.remove('pooling');
          this.respawnParticle(p);
          continue;
        }

        // Expanded pool scale and dissolve fade-out
        const baseScale = p.massTier.sizeRatio * this.config.intensity;
        const poolRadius = Math.max(1.5, 4.0 * baseScale * p.depthLayer.scale * (1.0 + poolProgress * 0.4));
        const poolOpacity = Math.max(0, (1.0 - poolProgress) * pulseState.opacity * p.depthLayer.opacityMultiplier);

        circleEl.setAttribute('cx', p.x.toFixed(2));
        circleEl.setAttribute('cy', p.y.toFixed(2));
        circleEl.setAttribute('r', poolRadius.toFixed(2));
        circleEl.setAttribute('fill', pulseState.color);
        circleEl.setAttribute('opacity', poolOpacity.toFixed(3));
      } else {
        // Standard cascade descent: gravity acceleration + horizontal wind drift
        const massFactor = 1.0 / p.massTier.mass;
        const windDrift = Math.sin(this.elapsedMs * 0.002 + p.windOffset) * 28 * this.config.wind * massFactor;
        
        p.vy += gravityAcc * massFactor * p.speedStagger * dtSec;
        p.vx = (p.vx + windDrift * dtSec) * (1 - 0.05 * dtSec);

        p.x += p.vx * dtSec;
        p.y += p.vy * dtSec;

        // Keep horizontal boundaries in frame with soft bounce
        if (p.x < 10) {
          p.x = 10;
          p.vx = Math.abs(p.vx) * 0.5;
        } else if (p.x > this.config.width - 10) {
          p.x = this.config.width - 10;
          p.vx = -Math.abs(p.vx) * 0.5;
        }

        // Check soft floor contact line
        if (p.y >= floorY) {
          p.y = floorY;
          p.isPooling = true;
          p.poolTimerMs = 0;
          p.vx = (this.prng.next() > 0.5 ? 1 : -1) * this.prng.range(15, 35); // Horizontal splash flare
          p.vy = 0;
          circleEl.classList.add('pooling');
        }

        const baseScale = p.massTier.sizeRatio * this.config.intensity;
        const finalRadius = Math.max(1.2, 4.0 * baseScale * p.depthLayer.scale);

        const shimmer = 0.85 + 0.15 * Math.sin(this.elapsedMs * 0.003 * p.massTier.shimmerRate + p.phaseOffset);
        const finalOpacity = Math.max(0.1, Math.min(1.0, pulseState.opacity * p.depthLayer.opacityMultiplier * shimmer));

        circleEl.setAttribute('cx', p.x.toFixed(2));
        circleEl.setAttribute('cy', p.y.toFixed(2));
        circleEl.setAttribute('r', finalRadius.toFixed(2));
        circleEl.setAttribute('fill', pulseState.color);
        circleEl.setAttribute('opacity', finalOpacity.toFixed(3));
      }
    }
  }

  /**
   * Animation frame loop tick.
   */
  tick = (timestamp) => {
    if (!this.isRunning) return;

    if (!this.lastTimestamp) this.lastTimestamp = timestamp;
    const deltaMs = timestamp - this.lastTimestamp;
    this.lastTimestamp = timestamp;

    // 60FPS telemetry tracking
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

  /**
   * Starts the animation loop.
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.isPausedState = false;
    this.lastTimestamp = 0;
    this.animFrameId = requestAnimationFrame(this.tick);
  }

  /**
   * Stops the animation loop.
   */
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
    const clamped = Math.max(12, Math.min(50, count));
    if (clamped === this.config.particleCount) return;
    this.config.particleCount = clamped;
    this.initCascadeParticles();
    this.renderInitialDOM();
  }

  setSpeed(speed) {
    this.config.speed = Math.max(0.1, Math.min(5.0, speed));
  }

  setGravity(gravity) {
    this.config.gravity = Math.max(0.1, Math.min(4.0, gravity));
  }

  setWind(wind) {
    this.config.wind = Math.max(0.0, Math.min(4.0, wind));
  }

  setIntensity(intensity) {
    this.config.intensity = Math.max(0.1, Math.min(1.5, intensity));
  }

  setDepth(enabled) {
    if (enabled === this.config.depth) return;
    this.config.depth = enabled;
    this.initCascadeParticles();
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

  /**
   * Triggers Thermal Glow exit discharge sequence (~350ms),
   * accelerating particles outward before dissolving and firing onDismiss.
   */
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

  /**
   * Resets loader simulation to initial state.
   */
  reset() {
    this.stop();
    this.isThermalActive = false;
    this.thermalStartTime = 0;
    this.onDismissCallback = undefined;
    if (this.svgEl) this.svgEl.style.display = 'block';
    this.elapsedMs = 0;
    const seed = this.config.seed ?? Math.floor(Math.random() * 1000000);
    this.prng = new PRNG(seed);
    this.initCascadeParticles();
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
