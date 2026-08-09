/**
 * @file lab/loaders/cascade/cascade.js
 * @description CascadeLoader prototype controller.
 * Implements gravity-driven particle descent, wind drift, floor contact pooling & glow effects,
 * speed staggers, Chromatic Pulse color integration, refractive depth stacking, and reduced-motion grid fallbacks.
 */

import {
  PARTICLE_MASS_TIERS,
  REFRACTIVE_DEPTH_LAYERS,
} from '../../shared/constants.js';

import { ChromaticPulse } from '../../shared/particle-engine.js';

export interface CascadeLoaderOptions {
  /** Target SVG element ID or HTML container element */
  container: string | HTMLElement;
  /** Configurable particle count (20 to 40, default 30) */
  particleCount?: number;
  /** Consuming app color palette (minimum 2 hex colors) */
  palette?: string[];
  /** Animation speed multiplier (default 1.0) */
  speed?: number;
  /** Gravity acceleration multiplier (default 1.0) */
  gravity?: number;
  /** Horizontal wind drift multiplier (default 1.0) */
  wind?: number;
  /** Particle size & glow intensity multiplier (default 0.7) */
  intensity?: number;
  /** Enable multi-layer refractive depth (default true) */
  depth?: boolean;
  /** Enable reduced motion static grid fallback (default false) */
  reducedMotion?: boolean;
  /** SVG viewBox width (default 200) */
  width?: number;
  /** SVG viewBox height (default 300) */
  height?: number;
  /** Optional deterministic random seed */
  seed?: number;
}

interface CascadeParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  massTier: typeof PARTICLE_MASS_TIERS.CORES;
  depthLayer: typeof REFRACTIVE_DEPTH_LAYERS.FOREGROUND;
  phaseOffset: number;
  windOffset: number;
  speedStagger: number;
  isPooling: boolean;
  poolTimerMs: number;
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

export class CascadeLoader {
  private containerEl: HTMLElement | null = null;
  private svgEl: SVGElement | null = null;
  private bgLayerEl: SVGGElement | null = null;
  private midLayerEl: SVGGElement | null = null;
  private fgLayerEl: SVGGElement | null = null;
  private reducedMotionGridEl: SVGGElement | null = null;

  private config: Required<Omit<CascadeLoaderOptions, 'container' | 'seed'>> & { seed?: number };
  private particles: CascadeParticle[] = [];
  private chromaticPulse: ChromaticPulse;
  private prng: PRNG;

  private animFrameId: number | null = null;
  private lastTimestamp = 0;
  private elapsedMs = 0;
  private isRunning = false;
  private isPausedState = false;

  private fpsFrameCount = 0;
  private fpsLastCheckTime = 0;
  private currentFPS = 60;

  constructor(options: CascadeLoaderOptions) {
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

  private setupDOM(): void {
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
            <rect class="floor-glow-bar" x="15" y="252" width="${this.config.width - 30}" height="4" rx="2" fill="url(#cascade-floor-glow-gradient)" filter="url(#cascade-glow-filter)" />
            <line class="floor-baseline" x1="20" y1="254" x2="${this.config.width - 20}" y2="254" stroke="var(--cascade-pulse-color, #4A90E2)" stroke-opacity="0.25" stroke-dasharray="3 3" />
          </g>
          <g id="cascade-particles-stack">
            <g id="cascade-layer-background" filter="url(#cascade-bg-blur)" opacity="0.45"></g>
            <g id="cascade-layer-midground" filter="url(#cascade-mid-blur)" opacity="0.75"></g>
            <g id="cascade-layer-foreground" filter="url(#cascade-glow-filter)"></g>
          </g>
          <g id="cascade-reduced-motion-grid" display="none"></g>
        </svg>
      `;
      this.svgEl = this.containerEl.querySelector('#cascade-loader') as SVGElement;
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
  private initCascadeParticles(): void {
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

  private respawnParticle(p: CascadeParticle): void {
    const { width } = this.config;
    p.x = this.prng.range(15, width - 15);
    p.y = this.prng.range(-35, -5);
    p.vx = this.prng.range(-4, 4);
    p.vy = this.prng.range(10, 40);
    p.isPooling = false;
    p.poolTimerMs = 0;
    p.speedStagger = 0.85 + this.prng.next() * 0.35;
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
  private updateRenderFrame(): void {
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

    const dtSec = 0.016 * this.config.speed;
    const gravityAcc = 220 * this.config.gravity; // Gravity acceleration (px/s^2)
    const floorY = 254; // Soft floor surface contact line

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const circleEl = this.svgEl.querySelector(`#cascade-particle-${p.id}`) as SVGCircleElement | null;
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
    const clamped = Math.max(12, Math.min(50, count));
    if (clamped === this.config.particleCount) return;
    this.config.particleCount = clamped;
    this.initCascadeParticles();
    this.renderInitialDOM();
  }

  public setSpeed(speed: number): void {
    this.config.speed = Math.max(0.1, Math.min(5.0, speed));
  }

  public setGravity(gravity: number): void {
    this.config.gravity = Math.max(0.1, Math.min(4.0, gravity));
  }

  public setWind(wind: number): void {
    this.config.wind = Math.max(0.0, Math.min(4.0, wind));
  }

  public setIntensity(intensity: number): void {
    this.config.intensity = Math.max(0.1, Math.min(1.5, intensity));
  }

  public setDepth(enabled: boolean): void {
    if (enabled === this.config.depth) return;
    this.config.depth = enabled;
    this.initCascadeParticles();
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

  public destroy(): void {
    this.stop();
    if (this.containerEl) {
      this.containerEl.innerHTML = '';
    }
  }
}
