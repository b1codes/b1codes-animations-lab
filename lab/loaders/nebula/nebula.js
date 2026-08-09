/**
 * @file lab/loaders/nebula/nebula.js
 * @description NebulaLoader prototype controller.
 * Implements Perlin-noise-driven drift, 3 particle size tiers (dust, motes, cores),
 * inter-particle group attraction/repulsion forces, Chromatic Pulse breathing density cycles,
 * refractive depth stacking, and reduced-motion grid fallbacks.
 */

import {
  PARTICLE_MASS_TIERS,
  REFRACTIVE_DEPTH_LAYERS,
  CHROMATIC_PULSE_DURATION,
  THERMAL_GLOW_SPECTRUM,
  THERMAL_GLOW_TOTAL_DURATION,
} from '../../shared/constants.js';

import {
  ChromaticPulse,
  parseColorToRGB,
  interpolateRGB,
  rgbToHex,
} from '../../shared/particle-engine.js';

export interface NebulaLoaderOptions {
  /** Target SVG element ID or HTML container element */
  container: string | HTMLElement;
  /** Configurable particle count (30 to 60, default 45) */
  particleCount?: number;
  /** Consuming app color palette (minimum 2 hex colors) */
  palette?: string[];
  /** Animation speed multiplier (default 1.0) */
  speed?: number;
  /** Particle size & glow intensity multiplier (default 0.7) */
  intensity?: number;
  /** Enable multi-layer refractive depth (default true) */
  depth?: boolean;
  /** Enable reduced motion static grid fallback (default false) */
  reducedMotion?: boolean;
  /** SVG viewBox width (default 300) */
  width?: number;
  /** SVG viewBox height (default 300) */
  height?: number;
  /** Optional deterministic random seed */
  seed?: number;
}

interface NebulaParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  massTier: typeof PARTICLE_MASS_TIERS.CORES;
  depthLayer: typeof REFRACTIVE_DEPTH_LAYERS.FOREGROUND;
  phaseOffset: number;
  noiseSeedX: number;
  noiseSeedY: number;
}

class PRNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}

/**
 * Fast 2D Simplex/Perlin noise approximation generator.
 */
class PerlinNoise2D {
  private perm: number[] = [];

  constructor(prng: PRNG) {
    const p: number[] = [];
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(prng.next() * (i + 1));
      const temp = p[i];
      p[i] = p[j];
      p[j] = temp;
    }
    this.perm = p.concat(p);
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(t: number, a: number, b: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number): number {
    const h = hash & 7;
    const u = h < 4 ? x : y;
    const v = h < 4 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  public noise(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;

    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    const u = this.fade(xf);
    const v = this.fade(yf);

    const aa = this.perm[this.perm[X] + Y];
    const ab = this.perm[this.perm[X] + Y + 1];
    const ba = this.perm[this.perm[X + 1] + Y];
    const bb = this.perm[this.perm[X + 1] + Y + 1];

    const res = this.lerp(
      v,
      this.lerp(u, this.grad(aa, xf, yf), this.grad(ba, xf - 1, yf)),
      this.lerp(u, this.grad(ab, xf, yf - 1), this.grad(bb, xf - 1, yf - 1))
    );

    return (res + 1) / 2; // Normalized [0, 1]
  }
}

export class NebulaLoader {
  private containerEl: HTMLElement | null = null;
  private svgEl: SVGElement | null = null;
  private bgLayerEl: SVGGElement | null = null;
  private midLayerEl: SVGGElement | null = null;
  private fgLayerEl: SVGGElement | null = null;
  private reducedMotionGridEl: SVGGElement | null = null;

  private config: Required<Omit<NebulaLoaderOptions, 'container' | 'seed'>> & { seed?: number };
  private particles: NebulaParticle[] = [];
  private chromaticPulse: ChromaticPulse;
  private prng: PRNG;
  private perlin: PerlinNoise2D;

  private animFrameId: number | null = null;
  private lastTimestamp = 0;
  private elapsedMs = 0;
  private isRunning = false;
  private isPausedState = false;

  private fpsFrameCount = 0;
  private fpsLastCheckTime = 0;
  private currentFPS = 60;

  private isThermalActive = false;
  private thermalStartTime = 0;
  private onDismissCallback?: () => void;

  constructor(options: NebulaLoaderOptions) {
    if (typeof options.container === 'string') {
      this.containerEl = document.getElementById(options.container);
    } else {
      this.containerEl = options.container;
    }

    this.config = {
      particleCount: Math.max(20, Math.min(80, options.particleCount ?? 45)),
      palette: options.palette && options.palette.length >= 2 ? options.palette : ['#50E3C2', '#4A90E2', '#9013FE'],
      speed: options.speed ?? 1.0,
      intensity: options.intensity ?? 0.7,
      depth: options.depth ?? true,
      reducedMotion: options.reducedMotion ?? false,
      width: options.width ?? 300,
      height: options.height ?? 300,
      seed: options.seed,
    };

    const initialSeed = this.config.seed ?? Math.floor(Math.random() * 1000000);
    this.prng = new PRNG(initialSeed);
    this.perlin = new PerlinNoise2D(this.prng);

    this.chromaticPulse = new ChromaticPulse({
      palette: this.config.palette,
      reducedMotion: this.config.reducedMotion,
    });

    this.setupDOM();
    this.initNebulaParticles();
    this.renderInitialDOM();
  }

  private setupDOM(): void {
    if (!this.containerEl) return;

    this.svgEl = this.containerEl.querySelector('#nebula-loader') || this.containerEl.querySelector('svg');
    if (!this.svgEl) {
      this.containerEl.innerHTML = `
        <svg id="nebula-loader" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${this.config.width} ${this.config.height}" width="100%" height="100%" role="img" aria-label="Nebula Loading Indicator">
          <defs>
            <filter id="nebula-bg-blur" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4.5" />
            </filter>
            <filter id="nebula-mid-blur" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.5" />
            </filter>
            <filter id="nebula-glow-filter" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="5.0" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <radialGradient id="nebula-ambient-gas" cx="50%" cy="50%" r="65%">
              <stop offset="0%" stop-color="var(--nebula-pulse-color, #50E3C2)" stop-opacity="0.2" />
              <stop offset="50%" stop-color="var(--nebula-pulse-color, #50E3C2)" stop-opacity="0.08" />
              <stop offset="100%" stop-color="var(--nebula-pulse-color, #50E3C2)" stop-opacity="0.0" />
            </radialGradient>
          </defs>
          <g class="nebula-ambient-cloud">
            <circle cx="${this.config.width / 2}" cy="${this.config.height / 2}" r="${this.config.width * 0.4}" fill="url(#nebula-ambient-gas)" filter="url(#nebula-bg-blur)" />
          </g>
          <g id="nebula-particles-stack">
            <g id="nebula-layer-background" filter="url(#nebula-bg-blur)" opacity="0.45"></g>
            <g id="nebula-layer-midground" filter="url(#nebula-mid-blur)" opacity="0.75"></g>
            <g id="nebula-layer-foreground" filter="url(#nebula-glow-filter)"></g>
          </g>
          <g id="nebula-reduced-motion-grid" display="none"></g>
        </svg>
      `;
      this.svgEl = this.containerEl.querySelector('#nebula-loader') as SVGElement;
    }

    this.bgLayerEl = this.svgEl.querySelector('#nebula-layer-background');
    this.midLayerEl = this.svgEl.querySelector('#nebula-layer-midground');
    this.fgLayerEl = this.svgEl.querySelector('#nebula-layer-foreground');
    this.reducedMotionGridEl = this.svgEl.querySelector('#nebula-reduced-motion-grid');

    if (this.config.reducedMotion) {
      this.containerEl.classList.add('reduced-motion-active');
    }
  }

  /**
   * Initializes nebula cloud particle positions across 3 size tiers (dust, motes, cores).
   */
  private initNebulaParticles(): void {
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
    const cx = width / 2;
    const cy = height / 2;

    for (let i = 0; i < particleCount; i++) {
      // Tier distribution: 20% Cores (large), 50% Motes (medium), 30% Dust (small)
      const tierIndex = i % 10 < 2 ? 0 : i % 10 < 7 ? 1 : 2;
      const massTier = massTiers[tierIndex];

      const layerIndex = depth ? (i % 3) : 2;
      const depthLayer = depthLayers[layerIndex];

      // Gaussian-ish cluster dispersion around viewport center
      const angle = this.prng.range(0, Math.PI * 2);
      const dist = this.prng.range(width * 0.05, width * 0.38);
      const x = cx + Math.cos(angle) * dist;
      const y = cy + Math.sin(angle) * dist;

      this.particles.push({
        id: i,
        x,
        y,
        vx: this.prng.range(-5, 5),
        vy: this.prng.range(-5, 5),
        massTier,
        depthLayer,
        phaseOffset: this.prng.range(0, Math.PI * 2),
        noiseSeedX: this.prng.range(0, 100),
        noiseSeedY: this.prng.range(0, 100),
      });
    }
  }

  private renderInitialDOM(): void {
    if (!this.bgLayerEl || !this.midLayerEl || !this.fgLayerEl || !this.reducedMotionGridEl) return;

    this.bgLayerEl.innerHTML = '';
    this.midLayerEl.innerHTML = '';
    this.fgLayerEl.innerHTML = '';
    this.reducedMotionGridEl.innerHTML = '';

    // Create SVG particle circles
    this.particles.forEach((p) => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('id', `nebula-particle-${p.id}`);
      circle.setAttribute('class', 'nebula-particle');
      circle.setAttribute('data-mass-tier', p.massTier.name);

      const targetLayer =
        p.depthLayer.layer === 'background'
          ? this.bgLayerEl
          : p.depthLayer.layer === 'midground'
          ? this.midLayerEl
          : this.fgLayerEl;

      targetLayer?.appendChild(circle);
    });

    // Create static reduced motion grid
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
   * Main render tick step: computes Perlin noise drift, inter-particle attraction/repulsion,
   * density breathing cycle, and SVG position updates.
   */
  private updateRenderFrame(): void {
    if (!this.svgEl) return;

    const pulseState = this.chromaticPulse.evaluateAt(this.elapsedMs);
    this.svgEl.style.setProperty('--nebula-pulse-color', pulseState.color);

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
        const circleEl = this.svgEl?.querySelector(`#nebula-particle-${p.id}`) as SVGCircleElement | null;
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

    // Density breathing factor (0.5 to 1.0) synced with CHROMATIC_PULSE_DURATION
    const breathPhase = (this.elapsedMs % CHROMATIC_PULSE_DURATION) / CHROMATIC_PULSE_DURATION;
    const densityBreathing = 0.75 + 0.25 * Math.sin(breathPhase * Math.PI * 2);

    const dtSec = 0.016 * this.config.speed;
    const noiseTime = (this.elapsedMs * 0.0003 * this.config.speed);

    // Compute Perlin vector field drift and inter-particle forces
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      // Perlin noise flow field angle
      const noiseVal = this.perlin.noise(
        p.x * 0.005 + p.noiseSeedX,
        p.y * 0.005 + noiseTime + p.noiseSeedY
      );
      const flowAngle = noiseVal * Math.PI * 4;

      // Base drift force inverse to mass (lighter dust scatters faster, heavy cores drift smoothly)
      const driftSpeed = (35 / p.massTier.mass) * p.massTier.velocityRatio;
      let fx = Math.cos(flowAngle) * driftSpeed;
      let fy = Math.sin(flowAngle) * driftSpeed;

      // Soft attraction/repulsion forces between neighboring particles
      for (let j = 0; j < this.particles.length; j++) {
        if (i === j) continue;
        const other = this.particles[j];
        const dx = other.x - p.x;
        const dy = other.y - p.y;
        const distSq = dx * dx + dy * dy || 1;
        const dist = Math.sqrt(distSq);

        if (dist < 25) {
          // Soft short-range repulsion
          const repulseMag = (15 / dist) * (1 / p.massTier.mass);
          fx -= (dx / dist) * repulseMag;
          fy -= (dy / dist) * repulseMag;
        } else if (dist < 75) {
          // Soft medium-range cluster attraction (modulated by density breathing)
          const attractMag = (dist * 0.08) * densityBreathing;
          fx += (dx / dist) * attractMag;
          fy += (dy / dist) * attractMag;
        }
      }

      // Soft boundary containment towards viewport center
      const distFromCenter = Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2);
      const maxRadius = this.config.width * 0.42;
      if (distFromCenter > maxRadius) {
        const pullMag = (distFromCenter - maxRadius) * 2.5;
        fx += ((cx - p.x) / distFromCenter) * pullMag;
        fy += ((cy - p.y) / distFromCenter) * pullMag;
      }

      // Kinematics integration with drag resistance
      p.vx = (p.vx + fx * dtSec) * (1 - 0.12 * dtSec);
      p.vy = (p.vy + fy * dtSec) * (1 - 0.12 * dtSec);

      p.x += p.vx * dtSec;
      p.y += p.vy * dtSec;

      // Update SVG DOM elements
      const circleEl = this.svgEl.querySelector(`#nebula-particle-${p.id}`) as SVGCircleElement | null;
      if (!circleEl) continue;

      const baseScale = p.massTier.sizeRatio * this.config.intensity;
      const finalRadius = Math.max(1.2, 4.2 * baseScale * p.depthLayer.scale);

      const shimmer = 0.85 + 0.15 * Math.sin(this.elapsedMs * 0.003 * p.massTier.shimmerRate + p.phaseOffset);
      const finalOpacity = Math.max(0.1, Math.min(1.0, pulseState.opacity * p.depthLayer.opacityMultiplier * shimmer * densityBreathing));

      circleEl.setAttribute('cx', p.x.toFixed(2));
      circleEl.setAttribute('cy', p.y.toFixed(2));
      circleEl.setAttribute('r', finalRadius.toFixed(2));
      circleEl.setAttribute('fill', pulseState.color);
      circleEl.setAttribute('opacity', finalOpacity.toFixed(3));
    }
  }

  /**
   * Animation frame loop tick.
   */
  private tick = (timestamp: number): void => {
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
  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.isPausedState = false;
    this.lastTimestamp = 0;
    this.animFrameId = requestAnimationFrame(this.tick);
  }

  /**
   * Stops the animation loop.
   */
  public stop(): void {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  public pause(): void {
    this.isPausedState = true;
  }

  public resume(): void {
    this.isPausedState = false;
  }

  public isPaused(): boolean {
    return this.isPausedState;
  }

  public setPalette(palette: string[]): void {
    if (!palette || palette.length < 2) return;
    this.config.palette = palette;
    this.chromaticPulse.updateConfig({ palette });
    this.renderInitialDOM();
  }

  public setParticleCount(count: number): void {
    const clamped = Math.max(20, Math.min(80, count));
    if (clamped === this.config.particleCount) return;
    this.config.particleCount = clamped;
    this.initNebulaParticles();
    this.renderInitialDOM();
  }

  public setSpeed(speed: number): void {
    this.config.speed = Math.max(0.1, Math.min(5.0, speed));
  }

  public setIntensity(intensity: number): void {
    this.config.intensity = Math.max(0.1, Math.min(1.5, intensity));
  }

  public setDepth(enabled: boolean): void {
    if (enabled === this.config.depth) return;
    this.config.depth = enabled;
    this.initNebulaParticles();
    this.renderInitialDOM();
  }

  public setReducedMotion(enabled: boolean): void {
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

  public getFPS(): number {
    return this.currentFPS;
  }

  /**
   * Triggers Thermal Glow exit discharge sequence (~350ms),
   * accelerating particles outward before dissolving and firing onDismiss.
   */
  public resolve(onDismiss?: () => void): void {
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
  public reset(): void {
    this.stop();
    this.isThermalActive = false;
    this.thermalStartTime = 0;
    this.onDismissCallback = undefined;
    if (this.svgEl) this.svgEl.style.display = 'block';
    this.elapsedMs = 0;
    const seed = this.config.seed ?? Math.floor(Math.random() * 1000000);
    this.prng = new PRNG(seed);
    this.initNebulaParticles();
    this.renderInitialDOM();
    this.start();
  }

  public destroy(): void {
    this.stop();
    if (this.containerEl) {
      this.containerEl.innerHTML = '';
    }
  }
}
