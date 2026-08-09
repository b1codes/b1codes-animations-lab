/**
 * @file packages/core/src/chromatic-pulse.ts
 * @description Chromatic Pulse color cycle engine. Handles smooth palette color rotation,
 * cubic-bezier easing, opacity breathing, and reduced-motion fallbacks.
 */

import {
  CHROMATIC_PULSE_DURATION,
  CHROMATIC_EASE_BEZIER,
  CHROMATIC_OPACITY_RANGE,
} from './constants.js';

export interface ChromaticPulseConfig {
  /** Array of theme colors (minimum 2 hex/rgb strings) */
  palette: string[];
  /** Duration multiplier or override in milliseconds (defaults to CHROMATIC_PULSE_DURATION: 3200ms) */
  durationMs?: number;
  /** Cubic bezier control points [x1, y1, x2, y2] (defaults to [0.45, 0, 0.55, 1]) */
  bezierCurve?: readonly [number, number, number, number];
  /** Opacity range [min, max] (defaults to min: 0.55, max: 1.0) */
  opacityRange?: { min: number; max: number };
  /** Reduced motion active flag */
  reducedMotion?: boolean;
}

export interface ChromaticPulseState {
  /** Current interpolated hex color string */
  color: string;
  /** Current breathing opacity value */
  opacity: number;
  /** Normalized pulse progress (0.0 to 1.0) */
  progress: number;
}

/**
 * Solves a cubic bezier curve Y for a given progress t [0, 1].
 */
export function solveCubicBezier(
  t: number,
  x1 = CHROMATIC_EASE_BEZIER[0],
  y1 = CHROMATIC_EASE_BEZIER[1],
  x2 = CHROMATIC_EASE_BEZIER[2],
  y2 = CHROMATIC_EASE_BEZIER[3]
): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;

  // Newton-Raphson iteration to solve for parameter u where X(u) = t
  let u = t;
  for (let i = 0; i < 8; i++) {
    const oneMinusU = 1 - u;
    const x = 3 * oneMinusU * oneMinusU * u * x1 + 3 * oneMinusU * u * u * x2 + u * u * u;
    const dx = 3 * oneMinusU * oneMinusU * x1 + 6 * oneMinusU * u * (x2 - x1) + 3 * u * u * (1 - x2);
    if (Math.abs(dx) < 1e-6) break;
    u -= (x - t) / dx;
    u = Math.max(0, Math.min(1, u));
  }

  // Calculate Y(u)
  const oneMinusU = 1 - u;
  return 3 * oneMinusU * oneMinusU * u * y1 + 3 * oneMinusU * u * u * y2 + u * u * u;
}

/**
 * Helper to parse a hex color string into [r, g, b] (0-255).
 */
export function parseColorToRGB(colorStr: string): [number, number, number] {
  let hex = colorStr.trim().replace(/^#/, '');
  if (hex.length === 3) {
    hex = hex.split('').map((c) => c + c).join('');
  }
  if (hex.length === 6) {
    const num = parseInt(hex, 16);
    if (!isNaN(num)) {
      return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
    }
  }

  // Handle rgb(r, g, b) format
  const rgbMatch = colorStr.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
  if (rgbMatch) {
    return [parseInt(rgbMatch[1], 10), parseInt(rgbMatch[2], 10), parseInt(rgbMatch[3], 10)];
  }

  // Default fallback if parsing fails
  return [255, 255, 255];
}

/**
 * Interpolates (lerps) between two [r, g, b] colors by ratio factor t [0, 1].
 */
export function interpolateRGB(
  rgbA: [number, number, number],
  rgbB: [number, number, number],
  t: number
): [number, number, number] {
  const clampedT = Math.max(0, Math.min(1, t));
  return [
    Math.round(rgbA[0] + (rgbB[0] - rgbA[0]) * clampedT),
    Math.round(rgbA[1] + (rgbB[1] - rgbA[1]) * clampedT),
    Math.round(rgbA[2] + (rgbB[2] - rgbA[2]) * clampedT),
  ];
}

/**
 * Converts [r, g, b] numbers into a 6-digit hex color string (#rrggbb).
 */
export function rgbToHex(rgb: [number, number, number]): string {
  const toHex = (c: number) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0');
  return `#${toHex(rgb[0])}${toHex(rgb[1])}${toHex(rgb[2])}`;
}

/**
 * ChromaticPulse engine class for stateful color rotation and breathing updates.
 */
export class ChromaticPulse {
  private palette: string[];
  private durationMs: number;
  private bezierCurve: readonly [number, number, number, number];
  private opacityRange: { min: number; max: number };
  private reducedMotion: boolean;
  private parsedPalette: [number, number, number][];

  constructor(config: ChromaticPulseConfig) {
    this.palette = config.palette && config.palette.length >= 2 ? config.palette : ['#FFFFFF', '#888888'];
    this.durationMs = config.durationMs ?? CHROMATIC_PULSE_DURATION;
    this.bezierCurve = config.bezierCurve ?? CHROMATIC_EASE_BEZIER;
    this.opacityRange = config.opacityRange ?? CHROMATIC_OPACITY_RANGE;
    this.reducedMotion = config.reducedMotion ?? false;
    this.parsedPalette = this.palette.map(parseColorToRGB);
  }

  public updateConfig(config: Partial<ChromaticPulseConfig>): void {
    if (config.palette && config.palette.length >= 2) {
      this.palette = config.palette;
      this.parsedPalette = this.palette.map(parseColorToRGB);
    }
    if (config.durationMs !== undefined) this.durationMs = config.durationMs;
    if (config.bezierCurve !== undefined) this.bezierCurve = config.bezierCurve;
    if (config.opacityRange !== undefined) this.opacityRange = config.opacityRange;
    if (config.reducedMotion !== undefined) this.reducedMotion = config.reducedMotion;
  }

  /**
   * Computes the ChromaticPulse state at elapsed time t in milliseconds.
   */
  public evaluateAt(elapsedMs: number): ChromaticPulseState {
    if (this.reducedMotion) {
      return {
        color: this.palette[0],
        opacity: 1.0,
        progress: 0,
      };
    }

    const totalDuration = Math.max(1, this.durationMs);
    const progress = (elapsedMs % totalDuration) / totalDuration; // [0, 1)

    // Palette interpolation around a full loop back to index 0
    const count = this.parsedPalette.length;
    const scaledProgress = progress * count;
    const index = Math.floor(scaledProgress);
    const nextIndex = (index + 1) % count;
    const segmentProgress = scaledProgress - index;

    // Apply cubic bezier easing to the segment transition
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

    // Opacity breathing modulating smoothly in sync with progress
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
