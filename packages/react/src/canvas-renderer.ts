/**
 * @file packages/react/src/canvas-renderer.ts
 * @description High-performance 2D Canvas renderer adapter for @b1codes/loaders.
 * Renders particle fields, refractive depth layers, Chromatic Pulse color gradients,
 * Thermal Glow exit discharge effects, and static dot grids for accessibility.
 */

import type { ParticleRenderState } from '@b1codes/core';
import { THERMAL_GLOW_SPECTRUM, parseColorToRGB, interpolateRGB, rgbToHex } from '@b1codes/core';

export interface ThermalGlowState {
  active: boolean;
  progress: number; // 0.0 to 1.0
}

export interface RenderCanvasOptions {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  dpr: number;
  particles: ParticleRenderState[];
  backgroundColor: string;
  variant: 'orbital' | 'nebula' | 'cascade';
  intensity: number;
  thermalGlow: ThermalGlowState;
  reducedMotion: boolean;
}

const HEAT_START_RGB = parseColorToRGB(THERMAL_GLOW_SPECTRUM[0]);
const HEAT_END_RGB = parseColorToRGB(THERMAL_GLOW_SPECTRUM[1]);

export function renderParticlesToCanvas(options: RenderCanvasOptions): void {
  const {
    ctx,
    width,
    height,
    dpr,
    particles,
    backgroundColor,
    variant,
    intensity,
    thermalGlow,
    reducedMotion,
  } = options;

  ctx.save();
  ctx.scale(dpr, dpr);

  // Clear frame canvas
  ctx.clearRect(0, 0, width, height);

  // Background fill if specified
  if (backgroundColor && backgroundColor !== 'transparent') {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
  }

  const cx = width / 2;
  const cy = height / 2;

  // Render variant ambient baseline guides & glowing cores
  if (!reducedMotion && !thermalGlow.active) {
    if (variant === 'orbital') {
      renderOrbitalCore(ctx, cx, cy, width, height, particles[0]?.color || '#4A90E2');
    } else if (variant === 'cascade') {
      renderCascadeFloor(ctx, width, height, particles[0]?.color || '#4A90E2');
    } else if (variant === 'nebula') {
      renderNebulaAmbientGlow(ctx, cx, cy, width, height, particles[0]?.color || '#50E3C2');
    }
  }

  // Sort particles by refractive depth layer order (background -> midground -> foreground)
  const layerOrder: Record<string, number> = {
    background: 0,
    midground: 1,
    foreground: 2,
  };

  const sortedParticles = [...particles].sort(
    (a, b) => (layerOrder[a.layer] ?? 1) - (layerOrder[b.layer] ?? 1)
  );

  // Render each particle in the stack
  for (let i = 0; i < sortedParticles.length; i++) {
    const p = sortedParticles[i];

    let drawX = p.x;
    let drawY = p.y;
    let drawColor = p.color;
    let drawOpacity = p.opacity;

    // Scale particle base size according to intensity multiplier
    const baseRadius = Math.max(1.5, 3.5 * p.scale * (intensity / 0.7));

    // Handle Thermal Glow Exit Discharge transformation
    if (thermalGlow.active) {
      const t = thermalGlow.progress;
      // Scatter outward from center
      const dx = p.x - cx;
      const dy = p.y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const scatterMag = dist * (1 + t * 1.8);

      drawX = cx + (dx / dist) * scatterMag;
      drawY = cy + (dy / dist) * scatterMag;

      // Color shift along heat spectrum (#FF3B30 -> #FF9500)
      const heatRGB = interpolateRGB(HEAT_START_RGB, HEAT_END_RGB, t);
      drawColor = rgbToHex(heatRGB);

      // Fade opacity down to 0
      drawOpacity = Math.max(0, p.opacity * (1 - t));
    }

    if (drawOpacity <= 0.001) continue;

    ctx.save();
    ctx.globalAlpha = drawOpacity;

    // Apply refractive depth blur if supported and requested
    if (p.blurPx > 0 && typeof ctx.filter === 'string') {
      try {
        ctx.filter = `blur(${p.blurPx}px)`;
      } catch {
        // Fallback for browsers with restricted canvas filter support
      }
    }

    // Outer glow halo for foreground/midground particles
    if (p.layer === 'foreground' || p.layer === 'midground') {
      const glowRadius = baseRadius * (p.layer === 'foreground' ? 3.0 : 2.0);
      const gradient = ctx.createRadialGradient(
        drawX,
        drawY,
        0,
        drawX,
        drawY,
        glowRadius
      );
      gradient.addColorStop(0, drawColor);
      gradient.addColorStop(0.4, drawColor);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(drawX, drawY, glowRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Crisp core dot
    ctx.fillStyle = drawColor;
    ctx.beginPath();
    ctx.arc(drawX, drawY, baseRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  ctx.restore();
}

/**
 * Draws central gravitational core for OrbitalLoader.
 */
function renderOrbitalCore(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  width: number,
  height: number,
  color: string
): void {
  ctx.save();

  // Orbital central core radial glow
  const maxRadius = Math.min(width, height) * 0.2;
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxRadius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(0.5, color);
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.globalAlpha = 0.35;
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, cy, maxRadius, 0, Math.PI * 2);
  ctx.fill();

  // Central luminous core dot
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, Math.PI * 2);
  ctx.fill();

  // Ambient orbital guide lines
  ctx.globalAlpha = 0.12;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 4]);

  const rx = width * 0.35;
  const ry = height * 0.22;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, -Math.PI / 12, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

/**
 * Draws floor glow bar for CascadeLoader.
 */
function renderCascadeFloor(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  color: string
): void {
  ctx.save();
  const floorY = height * 0.85;

  // Horizontal glow gradient across floor baseline
  const gradient = ctx.createLinearGradient(0, floorY, width, floorY);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
  gradient.addColorStop(0.2, color);
  gradient.addColorStop(0.5, color);
  gradient.addColorStop(0.8, color);
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.globalAlpha = 0.3;
  ctx.strokeStyle = gradient;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(width * 0.1, floorY);
  ctx.lineTo(width * 0.9, floorY);
  ctx.stroke();

  ctx.restore();
}

/**
 * Draws soft ambient center diffuse glow for NebulaLoader.
 */
function renderNebulaAmbientGlow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  width: number,
  height: number,
  color: string
): void {
  ctx.save();
  const radius = Math.min(width, height) * 0.35;
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(0.5, color);
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.globalAlpha = 0.2;
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
