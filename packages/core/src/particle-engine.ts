/**
 * @file packages/core/src/particle-engine.ts
 * @description Shared JS particle engine and physics solver for b1codes particle loaders.
 * Computes momentum-driven particle positions, mass-based velocity ratios, refractive depth layer
 * properties, Chromatic Pulse color integration, and reduced-motion grid fallbacks.
 */

import {
  PARTICLE_MASS_TIERS,
  ParticleMassTier,
  REFRACTIVE_DEPTH_LAYERS,
  RefractiveDepthLayer,
  DRAG_RESISTANCE,
} from './constants.js';

import { ChromaticPulse } from './chromatic-pulse.js';

export interface ParticleEngineConfig {
  /** Total number of particles (defaults to 24) */
  particleCount?: number;
  /** Palette theme colors (defaults to ['#4A90E2', '#50E3C2', '#9013FE']) */
  palette?: string[];
  /** Velocity & time multiplier (defaults to 1.0) */
  speed?: number;
  /** Particle size & glow multiplier (defaults to 0.7) */
  intensity?: number;
  /** Enable/disable refractive depth layers (defaults to true) */
  depth?: boolean;
  /** Enable reduced-motion static dot grid (defaults to false) */
  reducedMotion?: boolean;
  /** Bounding box width in pixels (defaults to 48) */
  width?: number;
  /** Bounding box height in pixels (defaults to 48) */
  height?: number;
  /** Optional random seed for deterministic particle generation in tests */
  seed?: number;
}

export interface ParticleRenderState {
  id: number;
  x: number;
  y: number;
  scale: number;
  opacity: number;
  color: string;
  blurPx: number;
  layer: 'background' | 'midground' | 'foreground';
}

interface InternalParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseX: number;
  baseY: number;
  massTier: ParticleMassTier;
  depthLayer: RefractiveDepthLayer;
  phaseOffset: number;
}

/**
 * Fast deterministic pseudo-random number generator (Mulberry32).
 */
class PRNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  public next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Random number in range [min, max).
   */
  public range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}

export class ParticleEngine {
  private config: Required<Omit<ParticleEngineConfig, 'seed'>> & { seed?: number };
  private particles: InternalParticle[] = [];
  private chromaticPulse: ChromaticPulse;
  private elapsedMs = 0;
  private paused = false;
  private prng: PRNG;
  private cachedRenderState: ParticleRenderState[] = [];

  constructor(config: ParticleEngineConfig = {}) {
    this.config = {
      particleCount: config.particleCount ?? 24,
      palette: config.palette && config.palette.length >= 2
        ? config.palette
        : ['#4A90E2', '#50E3C2', '#9013FE'],
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

    this.initParticles();
    this.cachedRenderState = this.computeRenderState();
  }

  /**
   * Initializes particle positions, mass tiers, and depth layers.
   */
  private initParticles(): void {
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
      // Mass tier distribution: 20% cores, 50% motes, 30% dust
      const tierIndex = i % 10 < 2 ? 0 : i % 10 < 7 ? 1 : 2;
      const massTier = massTiers[tierIndex];

      // Depth layer distribution
      const layerIndex = depth ? (i % 3) : 2; // Default to foreground if depth disabled
      const depthLayer = depthLayers[layerIndex];

      // Orbital / radial initial dispersion around center
      const angle = this.prng.range(0, Math.PI * 2);
      const radius = this.prng.range(width * 0.1, width * 0.4);
      const px = cx + Math.cos(angle) * radius;
      const py = cy + Math.sin(angle) * radius;

      // Base velocity inverse to mass (lighter = faster initial tangent velocity)
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

  /**
   * Computes static grid layout for reduced-motion accessibility.
   */
  private computeReducedMotionState(): ParticleRenderState[] {
    const { particleCount, width, height, palette } = this.config;
    const cols = Math.ceil(Math.sqrt(particleCount));
    const rows = Math.ceil(particleCount / cols);
    const cellW = width / cols;
    const cellH = height / rows;
    const baseColor = palette[0] || '#FFFFFF';

    const states: ParticleRenderState[] = [];
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

  /**
   * Computes the current tick's particle render state array.
   */
  private computeRenderState(): ParticleRenderState[] {
    if (this.config.reducedMotion) {
      return this.computeReducedMotionState();
    }

    const pulseState = this.chromaticPulse.evaluateAt(this.elapsedMs);
    const dtSec = 0.016 * this.config.speed; // Standard frame tick normalized
    const cx = this.config.width / 2;
    const cy = this.config.height / 2;

    const renderStates: ParticleRenderState[] = [];

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      // Restore force towards orbital baseline
      const dx = cx - p.x;
      const dy = cy - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;

      // Physics kinematics: drag resistance + centripetal restoring force
      const forceMag = (20 / p.massTier.mass) * (dist / (this.config.width * 0.5));
      const fx = (dx / dist) * forceMag;
      const fy = (dy / dist) * forceMag;

      p.vx = (p.vx + fx * dtSec) * (1 - DRAG_RESISTANCE * dtSec);
      p.vy = (p.vy + fy * dtSec) * (1 - DRAG_RESISTANCE * dtSec);

      p.x += p.vx * p.massTier.velocityRatio * dtSec;
      p.y += p.vy * p.massTier.velocityRatio * dtSec;

      // Particle size & scale calculation
      const baseScale = p.massTier.sizeRatio * this.config.intensity;
      const finalScale = Number((baseScale * p.depthLayer.scale).toFixed(3));

      // Opacity calculation factoring pulse breathing, shimmer, and depth
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

  /**
   * Advances the particle simulation by deltaTimeMs milliseconds.
   */
  public step(deltaTimeMs: number): ParticleRenderState[] {
    if (this.paused) {
      return this.cachedRenderState;
    }

    this.elapsedMs += deltaTimeMs * this.config.speed;
    this.cachedRenderState = this.computeRenderState();
    return this.cachedRenderState;
  }

  /**
   * Pauses the simulation loop.
   */
  public pause(): void {
    this.paused = true;
  }

  /**
   * Resumes the simulation loop.
   */
  public resume(): void {
    this.paused = false;
  }

  /**
   * Returns whether the engine is currently paused.
   */
  public isPaused(): boolean {
    return this.paused;
  }

  /**
   * Resets simulation time and particle positions.
   */
  public reset(): void {
    this.elapsedMs = 0;
    const seed = this.config.seed ?? Math.floor(Math.random() * 1000000);
    this.prng = new PRNG(seed);
    this.initParticles();
    this.cachedRenderState = this.computeRenderState();
  }

  /**
   * Dynamically updates emitter configuration.
   */
  public updateConfig(newConfig: Partial<ParticleEngineConfig>): void {
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

  /**
   * Returns current render state without advancing simulation time.
   */
  public getRenderState(): ParticleRenderState[] {
    return this.cachedRenderState;
  }
}
