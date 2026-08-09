/**
 * @file lab/loaders/neural/neural.js
 * @description NeuralLoader prototype controller.
 * Implements a neural network visualization of connected nodes with signal pulses moving along graph edges.
 * Features harmonic node drift, distance-weighted glowing edge connections, continuous multi-pulse edge routing,
 * Chromatic Pulse color integration, refractive depth stacking, and reduced-motion grid fallbacks.
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
 * @typedef {Object} NeuralLoaderOptions
 * @property {string | HTMLElement} container - Target SVG element ID or HTML container element
 * @property {number} [particleCount=16] - Configurable node count (12 to 24)
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

export class NeuralLoader {
  containerEl = null;
  svgEl = null;
  bgLayerEl = null;
  midLayerEl = null;
  fgLayerEl = null;
  edgesLayerEl = null;
  pulsesLayerEl = null;
  reducedMotionGridEl = null;

  config = null;
  nodes = [];
  edges = [];
  pulses = [];
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
   * @param {NeuralLoaderOptions} options
   */
  constructor(options) {
    if (typeof options.container === 'string') {
      this.containerEl = document.getElementById(options.container);
    } else {
      this.containerEl = options.container;
    }

    this.config = {
      particleCount: Math.max(8, Math.min(32, options.particleCount ?? 16)),
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
    this.initNeuralNetwork();
    this.renderInitialDOM();
  }

  setupDOM() {
    if (!this.containerEl) return;

    this.svgEl = this.containerEl.querySelector('#neural-loader') || this.containerEl.querySelector('svg');
    if (!this.svgEl) {
      this.containerEl.innerHTML = `
        <svg id="neural-loader" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${this.config.width} ${this.config.height}" width="100%" height="100%" role="img" aria-label="Neural Network Loading Indicator">
          <defs>
            <filter id="neural-bg-blur" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4.0" />
            </filter>
            <filter id="neural-mid-blur" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.0" />
            </filter>
            <filter id="neural-glow-filter" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="5.0" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <radialGradient id="neural-ambient-gradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="var(--neural-pulse-color, #4A90E2)" stop-opacity="0.3" />
              <stop offset="50%" stop-color="var(--neural-pulse-color, #4A90E2)" stop-opacity="0.1" />
              <stop offset="100%" stop-color="var(--neural-pulse-color, #4A90E2)" stop-opacity="0.0" />
            </radialGradient>
          </defs>
          <g class="neural-ambient-field">
            <circle cx="${this.config.width / 2}" cy="${this.config.height / 2}" r="${this.config.width * 0.35}" fill="url(#neural-ambient-gradient)" filter="url(#neural-bg-blur)" />
          </g>
          <g id="neural-edges-layer"></g>
          <g id="neural-pulses-layer" filter="url(#neural-glow-filter)"></g>
          <g id="neural-particles-stack">
            <g id="neural-layer-background" filter="url(#neural-bg-blur)" opacity="0.5"></g>
            <g id="neural-layer-midground" filter="url(#neural-mid-blur)" opacity="0.8"></g>
            <g id="neural-layer-foreground" filter="url(#neural-glow-filter)"></g>
          </g>
          <g id="neural-reduced-motion-grid" display="none"></g>
        </svg>
      `;
      this.svgEl = this.containerEl.querySelector('#neural-loader');
    }

    this.edgesLayerEl = this.svgEl.querySelector('#neural-edges-layer');
    this.pulsesLayerEl = this.svgEl.querySelector('#neural-pulses-layer');
    this.bgLayerEl = this.svgEl.querySelector('#neural-layer-background');
    this.midLayerEl = this.svgEl.querySelector('#neural-layer-midground');
    this.fgLayerEl = this.svgEl.querySelector('#neural-layer-foreground');
    this.reducedMotionGridEl = this.svgEl.querySelector('#neural-reduced-motion-grid');

    if (this.config.reducedMotion) {
      this.containerEl.classList.add('reduced-motion-active');
    }
  }

  /**
   * Initializes neural network nodes, graph connectivity, and travelling signal pulses.
   */
  initNeuralNetwork() {
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

    this.nodes = [];

    // Position nodes in organic web layout around center
    for (let i = 0; i < particleCount; i++) {
      const tierIndex = i % 10 < 2 ? 0 : i % 10 < 7 ? 1 : 2;
      const massTier = massTiers[tierIndex];

      const layerIndex = depth ? (i % 3) : 2;
      const depthLayer = depthLayers[layerIndex];

      // Golden spiral distribution with random jitter
      const angle = i * 2.39996 + this.prng.range(-0.3, 0.3);
      const radius = (Math.sqrt(i + 0.5) / Math.sqrt(particleCount)) * (width * 0.38);

      const anchorX = cx + Math.cos(angle) * radius;
      const anchorY = cy + Math.sin(angle) * radius;

      this.nodes.push({
        id: i,
        anchorX,
        anchorY,
        x: anchorX,
        y: anchorY,
        driftRadiusX: this.prng.range(4, 10),
        driftRadiusY: this.prng.range(4, 10),
        driftFreqX: this.prng.range(0.001, 0.0025),
        driftFreqY: this.prng.range(0.001, 0.0025),
        phaseX: this.prng.range(0, Math.PI * 2),
        phaseY: this.prng.range(0, Math.PI * 2),
        massTier,
        depthLayer,
      });
    }

    // Connect node graph edges based on distance threshold
    this.edges = [];
    const maxConnectDist = width * 0.38;

    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const dx = this.nodes[i].anchorX - this.nodes[j].anchorX;
        const dy = this.nodes[i].anchorY - this.nodes[j].anchorY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= maxConnectDist) {
          this.edges.push({
            id: `edge-${i}-${j}`,
            fromIndex: i,
            toIndex: j,
            dist,
            maxDist: maxConnectDist,
          });
        }
      }
    }

    // Spawn initial signal pulses travelling along graph edges
    const pulseCount = Math.max(3, Math.min(8, Math.floor(particleCount / 2.5)));
    this.pulses = [];

    for (let p = 0; p < pulseCount; p++) {
      if (this.edges.length === 0) break;
      const edge = this.edges[p % this.edges.length];
      this.pulses.push({
        id: p,
        fromIndex: edge.fromIndex,
        toIndex: edge.toIndex,
        progress: this.prng.range(0, 1),
        speed: this.prng.range(0.0008, 0.0016),
      });
    }
  }

  renderInitialDOM() {
    if (!this.bgLayerEl || !this.midLayerEl || !this.fgLayerEl || !this.edgesLayerEl || !this.pulsesLayerEl || !this.reducedMotionGridEl) return;

    this.bgLayerEl.innerHTML = '';
    this.midLayerEl.innerHTML = '';
    this.fgLayerEl.innerHTML = '';
    this.edgesLayerEl.innerHTML = '';
    this.pulsesLayerEl.innerHTML = '';
    this.reducedMotionGridEl.innerHTML = '';

    // Create SVG node circles
    this.nodes.forEach((n) => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('id', `neural-node-${n.id}`);
      circle.setAttribute('class', 'neural-particle');
      circle.setAttribute('data-mass-tier', n.massTier.name);

      const targetLayer =
        n.depthLayer.layer === 'background'
          ? this.bgLayerEl
          : n.depthLayer.layer === 'midground'
          ? this.midLayerEl
          : this.fgLayerEl;

      targetLayer?.appendChild(circle);
    });

    // Create SVG edge lines
    this.edges.forEach((e) => {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('id', `neural-edge-${e.fromIndex}-${e.toIndex}`);
      line.setAttribute('class', 'neural-edge');
      line.setAttribute('stroke-width', '1.2');
      this.edgesLayerEl.appendChild(line);
    });

    // Create SVG pulse glow dots
    this.pulses.forEach((p) => {
      const pulseCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      pulseCircle.setAttribute('id', `neural-pulse-${p.id}`);
      pulseCircle.setAttribute('class', 'neural-pulse-dot');
      pulseCircle.setAttribute('r', '3');
      this.pulsesLayerEl.appendChild(pulseCircle);
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
   * Main render tick step: updates node positions, edge connections, pulse routing, and DOM attributes.
   */
  updateRenderFrame() {
    if (!this.svgEl) return;

    const pulseState = this.chromaticPulse.evaluateAt(this.elapsedMs);
    this.svgEl.style.setProperty('--neural-pulse-color', pulseState.color);

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

      // Scatter nodes outward
      this.nodes.forEach((n) => {
        const circleEl = this.svgEl?.querySelector(`#neural-node-${n.id}`);
        if (!circleEl) return;

        const dx = n.x - cx;
        const dy = n.y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const scatterMag = dist * (1 + easedProgress * 1.8);

        const drawX = cx + (dx / dist) * scatterMag;
        const drawY = cy + (dy / dist) * scatterMag;

        const baseScale = n.massTier.sizeRatio * this.config.intensity;
        const finalRadius = Math.max(1.5, 3.5 * baseScale * n.depthLayer.scale);
        const finalOpacity = Math.max(0, pulseState.opacity * n.depthLayer.opacityMultiplier * (1 - progress));

        circleEl.setAttribute('cx', drawX.toFixed(2));
        circleEl.setAttribute('cy', drawY.toFixed(2));
        circleEl.setAttribute('r', finalRadius.toFixed(2));
        circleEl.setAttribute('fill', thermalColor);
        circleEl.setAttribute('opacity', finalOpacity.toFixed(3));
      });

      // Dissolve edge lines
      this.edges.forEach((e) => {
        const lineEl = this.svgEl?.querySelector(`#neural-edge-${e.fromIndex}-${e.toIndex}`);
        if (!lineEl) return;

        const nodeA = this.nodes[e.fromIndex];
        const nodeB = this.nodes[e.toIndex];
        if (!nodeA || !nodeB) return;

        lineEl.setAttribute('stroke', thermalColor);
        lineEl.setAttribute('opacity', (Math.max(0, 0.4 * (1 - progress))).toFixed(3));
      });

      return;
    }

    // Update node positions with harmonic drift
    this.nodes.forEach((n) => {
      const offsetX = Math.sin(this.elapsedMs * n.driftFreqX * this.config.speed + n.phaseX) * n.driftRadiusX;
      const offsetY = Math.cos(this.elapsedMs * n.driftFreqY * this.config.speed + n.phaseY) * n.driftRadiusY;

      n.x = n.anchorX + offsetX;
      n.y = n.anchorY + offsetY;

      const circleEl = this.svgEl?.querySelector(`#neural-node-${n.id}`);
      if (!circleEl) return;

      const baseScale = n.massTier.sizeRatio * this.config.intensity;
      const finalRadius = Math.max(1.5, 3.8 * baseScale * n.depthLayer.scale);

      const shimmer = 0.85 + 0.15 * Math.sin(this.elapsedMs * 0.003 * n.massTier.shimmerRate);
      const finalOpacity = Math.max(0.1, Math.min(1.0, pulseState.opacity * n.depthLayer.opacityMultiplier * shimmer));

      circleEl.setAttribute('cx', n.x.toFixed(2));
      circleEl.setAttribute('cy', n.y.toFixed(2));
      circleEl.setAttribute('r', finalRadius.toFixed(2));
      circleEl.setAttribute('fill', pulseState.color);
      circleEl.setAttribute('opacity', finalOpacity.toFixed(3));
    });

    // Update edge lines
    this.edges.forEach((e) => {
      const lineEl = this.svgEl?.querySelector(`#neural-edge-${e.fromIndex}-${e.toIndex}`);
      if (!lineEl) return;

      const nodeA = this.nodes[e.fromIndex];
      const nodeB = this.nodes[e.toIndex];
      if (!nodeA || !nodeB) return;

      const dx = nodeA.x - nodeB.x;
      const dy = nodeA.y - nodeB.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const lineOpacity = Math.max(0, (1 - dist / e.maxDist)) * 0.45 * pulseState.opacity;

      lineEl.setAttribute('x1', nodeA.x.toFixed(2));
      lineEl.setAttribute('y1', nodeA.y.toFixed(2));
      lineEl.setAttribute('x2', nodeB.x.toFixed(2));
      lineEl.setAttribute('y2', nodeB.y.toFixed(2));
      lineEl.setAttribute('stroke', pulseState.color);
      lineEl.setAttribute('opacity', lineOpacity.toFixed(3));
    });

    // Update signal pulses travelling along edges
    const stepSec = 0.016 * this.config.speed;
    this.pulses.forEach((p) => {
      p.progress += p.speed * stepSec * 1000;

      if (p.progress >= 1.0) {
        // Reached destination node -> reroute to a random connected edge
        p.progress = 0.0;
        const currentNodeIdx = p.toIndex;
        const connectedEdges = this.edges.filter(
          (edge) => edge.fromIndex === currentNodeIdx || edge.toIndex === currentNodeIdx
        );

        if (connectedEdges.length > 0) {
          const nextEdge = connectedEdges[Math.floor(this.prng.next() * connectedEdges.length)];
          if (nextEdge.fromIndex === currentNodeIdx) {
            p.fromIndex = nextEdge.fromIndex;
            p.toIndex = nextEdge.toIndex;
          } else {
            p.fromIndex = nextEdge.toIndex;
            p.toIndex = nextEdge.fromIndex;
          }
        }
      }

      const pulseEl = this.svgEl?.querySelector(`#neural-pulse-${p.id}`);
      if (!pulseEl) return;

      const nodeA = this.nodes[p.fromIndex];
      const nodeB = this.nodes[p.toIndex];
      if (!nodeA || !nodeB) return;

      const px = nodeA.x + (nodeB.x - nodeA.x) * p.progress;
      const py = nodeA.y + (nodeB.y - nodeA.y) * p.progress;

      pulseEl.setAttribute('cx', px.toFixed(2));
      pulseEl.setAttribute('cy', py.toFixed(2));
      pulseEl.setAttribute('fill', '#FFFFFF');
      pulseEl.setAttribute('opacity', (pulseState.opacity * 0.95).toFixed(3));
    });
  }

  /**
   * Animation frame loop tick.
   */
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
    const clamped = Math.max(8, Math.min(32, count));
    if (clamped === this.config.particleCount) return;
    this.config.particleCount = clamped;
    this.initNeuralNetwork();
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
    this.initNeuralNetwork();
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
    this.initNeuralNetwork();
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
