/**
 * @file lab/loaders/orbital/orbital.js
 * @description OrbitalLoader prototype controller.
 * Implements Keplerian-ish orbital mechanics where closer particles orbit faster
 * and farther particles drift slower, organic orbit breakdowns/re-stabilization,
 * Chromatic Pulse color integration, refractive depth stacking, and reduced-motion grid fallbacks.
 */

import {
  PARTICLE_MASS_TIERS,
  REFRACTIVE_DEPTH_LAYERS,
} from '../../shared/constants.js';

import { ChromaticPulse } from '../../shared/particle-engine.js';

export interface OrbitalLoaderOptions {
  /** Target SVG element ID or HTML container element */
  container: string | HTMLElement;
  /** Configurable particle count (12 to 24, default 18) */
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
  /** SVG viewBox width (default 200) */
  width?: number;
  /** SVG viewBox height (default 200) */
  height?: number;
  /** Optional deterministic random seed */
  seed?: number;
}

interface OrbitalParticle {
  id: number;
  massTier: typeof PARTICLE_MASS_TIERS.CORES;
  depthLayer: typeof REFRACTIVE_DEPTH_LAYERS.FOREGROUND;
  semiMajorA: number;
  semiMinorB: number;
  ellipseRotation: number;
  angularVelocity: number;
  orbitalPhase: number;
  shimmerOffset: number;
  isPerturbed: boolean;
  perturbTimerMs: number;
  perturbOffsetR: number;
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

export class OrbitalLoader {
  private containerEl: HTMLElement | null = null;
  private svgEl: SVGElement | null = null;
  private bgLayerEl: SVGGElement | null = null;
  private midLayerEl: SVGGElement | null = null;
  private fgLayerEl: SVGGElement | null = null;
  private reducedMotionGridEl: SVGGElement | null = null;

  private config: Required<Omit<OrbitalLoaderOptions, 'container' | 'seed'>> & { seed?: number };
  private particles: OrbitalParticle[] = [];
  private chromaticPulse: ChromaticPulse;
  private prng: PRNG;

  private animFrameId: number | null = null;
  private lastTimestamp = 0;
  private elapsedMs = 0;
  private isRunning = false;
  private isPausedState = false;

  private nextPerturbCountdownMs = 2500;
  private fpsFrameCount = 0;
  private fpsLastCheckTime = 0;
  private currentFPS = 60;

  constructor(options: OrbitalLoaderOptions) {
    if (typeof options.container === 'string') {
      this.containerEl = document.getElementById(options.container);
    } else {
      this.containerEl = options.container;
    }

    this.config = {
      particleCount: Math.max(8, Math.min(36, options.particleCount ?? 18)),
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
    this.initOrbitalParticles();
    this.renderInitialDOM();
  }

  private setupDOM(): void {
    if (!this.containerEl) return;

    this.svgEl = this.containerEl.querySelector('#orbital-loader') || this.containerEl.querySelector('svg');
    if (!this.svgEl) {
      this.containerEl.innerHTML = `
        <svg id="orbital-loader" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${this.config.width} ${this.config.height}" width="100%" height="100%" role="img" aria-label="Orbital Loading Indicator">
          <defs>
            <filter id="refractive-bg-blur" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4.0" />
            </filter>
            <filter id="refractive-mid-blur" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.0" />
            </filter>
            <filter id="orbital-glow-filter" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6.0" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <radialGradient id="gravitational-core-gradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="var(--orbital-pulse-color, #4A90E2)" stop-opacity="0.8" />
              <stop offset="50%" stop-color="var(--orbital-pulse-color, #4A90E2)" stop-opacity="0.25" />
              <stop offset="100%" stop-color="var(--orbital-pulse-color, #4A90E2)" stop-opacity="0.0" />
            </radialGradient>
          </defs>
          <g class="gravitational-field">
            <circle class="core-glow-outer" cx="${this.config.width / 2}" cy="${this.config.height / 2}" r="32" fill="url(#gravitational-core-gradient)" filter="url(#orbital-glow-filter)" />
            <circle class="core-dot" cx="${this.config.width / 2}" cy="${this.config.height / 2}" r="4" fill="var(--orbital-pulse-color, #4A90E2)" opacity="0.9" />
          </g>
          <g class="orbital-guides" opacity="0.15">
            <ellipse cx="100" cy="100" rx="40" ry="24" transform="rotate(-15 100 100)" fill="none" stroke="var(--orbital-pulse-color, #FFFFFF)" stroke-width="1" stroke-dasharray="2 4" />
            <ellipse cx="100" cy="100" rx="65" ry="42" transform="rotate(30 100 100)" fill="none" stroke="var(--orbital-pulse-color, #FFFFFF)" stroke-width="1" stroke-dasharray="2 4" />
            <ellipse cx="100" cy="100" rx="85" ry="58" transform="rotate(-45 100 100)" fill="none" stroke="var(--orbital-pulse-color, #FFFFFF)" stroke-width="1" stroke-dasharray="2 4" />
          </g>
          <g id="orbital-particles-stack">
            <g id="orbital-layer-background" filter="url(#refractive-bg-blur)" opacity="0.5"></g>
            <g id="orbital-layer-midground" filter="url(#refractive-mid-blur)" opacity="0.8"></g>
            <g id="orbital-layer-foreground" filter="url(#orbital-glow-filter)"></g>
          </g>
          <g id="orbital-reduced-motion-grid" display="none"></g>
        </svg>
      `;
      this.svgEl = this.containerEl.querySelector('#orbital-loader') as SVGElement;
    }

    this.bgLayerEl = this.svgEl.querySelector('#orbital-layer-background');
    this.midLayerEl = this.svgEl.querySelector('#orbital-layer-midground');
    this.fgLayerEl = this.svgEl.querySelector('#orbital-layer-foreground');
    this.reducedMotionGridEl = this.svgEl.querySelector('#orbital-reduced-motion-grid');

    if (this.config.reducedMotion) {
      this.containerEl.classList.add('reduced-motion-active');
    }
  }

  /**
   * Initializes Keplerian particle orbital parameters.
   * Particles follow Kepler's Law: closer particles orbit faster, farther ones drift slower.
   */
  private initOrbitalParticles(): void {
    const { particleCount, width, depth } = this.config;
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

    const minSemiMajor = width * 0.12; // ~24px
    const maxSemiMajor = width * 0.42; // ~84px

    for (let i = 0; i < particleCount; i++) {
      const tierIndex = i % 10 < 2 ? 0 : i % 10 < 7 ? 1 : 2;
      const massTier = massTiers[tierIndex];

      const layerIndex = depth ? (i % 3) : 2;
      const depthLayer = depthLayers[layerIndex];

      // Distribute semi-major axis radii smoothly from inner orbit to outer orbit
      const normalizedR = (i + 0.5) / particleCount;
      const semiMajorA = minSemiMajor + (maxSemiMajor - minSemiMajor) * normalizedR;
      
      // Eccentricity ratio (b/a) between 0.55 and 0.85 (elliptical shape)
      const eccentricity = this.prng.range(0.55, 0.85);
      const semiMinorB = semiMajorA * eccentricity;

      // Orbit plane tilt / rotation angle (-60deg to +60deg)
      const ellipseRotation = this.prng.range(-Math.PI / 3, Math.PI / 3);

      // Keplerian angular velocity calculation: \omega \propto a^{-1.5}
      // Closer particles (small semiMajorA) orbit significantly faster!
      const baseKeplerSpeed = Math.pow(40 / semiMajorA, 1.5) * 0.0022;
      const angularVelocity = baseKeplerSpeed * massTier.velocityRatio;

      const orbitalPhase = this.prng.range(0, Math.PI * 2);
      const shimmerOffset = this.prng.range(0, Math.PI * 2);

      this.particles.push({
        id: i,
        massTier,
        depthLayer,
        semiMajorA,
        semiMinorB,
        ellipseRotation,
        angularVelocity,
        orbitalPhase,
        shimmerOffset,
        isPerturbed: false,
        perturbTimerMs: 0,
        perturbOffsetR: 0,
      });
    }
  }

  private renderInitialDOM(): void {
    if (!this.bgLayerEl || !this.midLayerEl || !this.fgLayerEl || !this.reducedMotionGridEl) return;

    this.bgLayerEl.innerHTML = '';
    this.midLayerEl.innerHTML = '';
    this.fgLayerEl.innerHTML = '';
    this.reducedMotionGridEl.innerHTML = '';

    // Create SVG particle circles in depth layers
    this.particles.forEach((p) => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('id', `orbital-particle-${p.id}`);
      circle.setAttribute('class', 'orbital-particle');
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
   * Main render loop step executing frame calculations.
   */
  private updateRenderFrame(): void {
    if (!this.svgEl) return;

    const pulseState = this.chromaticPulse.evaluateAt(this.elapsedMs);
    this.svgEl.style.setProperty('--orbital-pulse-color', pulseState.color);

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

    this.particles.forEach((p) => {
      const circleEl = this.svgEl?.querySelector(`#orbital-particle-${p.id}`) as SVGCircleElement | null;
      if (!circleEl) return;

      // Handle organic orbit breakdown decay & stabilization
      let effectiveR_A = p.semiMajorA;
      let effectiveR_B = p.semiMinorB;

      if (p.isPerturbed) {
        p.perturbTimerMs -= 16 * this.config.speed;
        const decayT = Math.max(0, p.perturbTimerMs / 1200); // 1.2s stabilization curve
        const radialPulse = Math.sin((1 - decayT) * Math.PI * 3) * p.perturbOffsetR * decayT;
        effectiveR_A += radialPulse;
        effectiveR_B += radialPulse * 0.7;

        if (p.perturbTimerMs <= 0) {
          p.isPerturbed = false;
          circleEl.classList.remove('perturbed');
        }
      }

      // Compute parametric ellipse position (Keplerian orbital path)
      const θ = p.orbitalPhase;
      const cosRot = Math.cos(p.ellipseRotation);
      const sinRot = Math.sin(p.ellipseRotation);

      const unrotatedX = effectiveR_A * Math.cos(θ);
      const unrotatedY = effectiveR_B * Math.sin(θ);

      const px = cx + (unrotatedX * cosRot - unrotatedY * sinRot);
      const py = cy + (unrotatedX * sinRot + unrotatedY * cosRot);

      // Particle scale calculation
      const baseScale = p.massTier.sizeRatio * this.config.intensity;
      const finalRadius = Math.max(1.5, 4.0 * baseScale * p.depthLayer.scale);

      // Shimmer & opacity
      const shimmer = 0.85 + 0.15 * Math.sin(this.elapsedMs * 0.003 * p.massTier.shimmerRate + p.shimmerOffset);
      const finalOpacity = Math.max(0.1, Math.min(1.0, pulseState.opacity * p.depthLayer.opacityMultiplier * shimmer));

      // Apply SVG attributes
      circleEl.setAttribute('cx', px.toFixed(2));
      circleEl.setAttribute('cy', py.toFixed(2));
      circleEl.setAttribute('r', finalRadius.toFixed(2));
      circleEl.setAttribute('fill', pulseState.color);
      circleEl.setAttribute('opacity', finalOpacity.toFixed(3));
    });
  }

  /**
   * Triggers an organic orbit breakdown event on a random particle.
   */
  public triggerOrbitPerturbation(): void {
    if (this.particles.length === 0 || this.config.reducedMotion) return;

    // Pick a particle to break orbit
    const candidateIdx = Math.floor(this.prng.next() * this.particles.length);
    const p = this.particles[candidateIdx];
    p.isPerturbed = true;
    p.perturbTimerMs = 1200; // 1.2 seconds breakdown & re-stabilization
    p.perturbOffsetR = this.prng.range(15, 30); // 15-30px outward/inward surge

    const circleEl = this.svgEl?.querySelector(`#orbital-particle-${p.id}`);
    if (circleEl) {
      circleEl.classList.add('perturbed');
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
      const stepMs = Math.min(64, deltaMs); // Cap max frame jump
      this.elapsedMs += stepMs * this.config.speed;

      // Update particle orbital phases (\theta_i += \omega_i \times dt)
      const dtSec = (stepMs / 1000) * this.config.speed;
      this.particles.forEach((p) => {
        p.orbitalPhase = (p.orbitalPhase + p.angularVelocity * dtSec * 1000) % (Math.PI * 2);
      });

      // Organic orbit breakdown timer tick
      this.nextPerturbCountdownMs -= stepMs;
      if (this.nextPerturbCountdownMs <= 0) {
        this.triggerOrbitPerturbation();
        this.nextPerturbCountdownMs = this.prng.range(3000, 6000); // Trigger every 3-6s
      }

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

  /**
   * Pauses simulation updates.
   */
  public pause(): void {
    this.isPausedState = true;
  }

  /**
   * Resumes simulation updates.
   */
  public resume(): void {
    this.isPausedState = false;
  }

  public isPaused(): boolean {
    return this.isPausedState;
  }

  /**
   * Updates configuration dynamically.
   */
  public setPalette(palette: string[]): void {
    if (!palette || palette.length < 2) return;
    this.config.palette = palette;
    this.chromaticPulse.updateConfig({ palette });
    this.renderInitialDOM();
  }

  public setParticleCount(count: number): void {
    const clamped = Math.max(8, Math.min(36, count));
    if (clamped === this.config.particleCount) return;
    this.config.particleCount = clamped;
    this.initOrbitalParticles();
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
    this.initOrbitalParticles();
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
