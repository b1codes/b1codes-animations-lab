/**
 * @file packages/react-native/src/skia-renderer.tsx
 * @description Skia Canvas renderer adapter for @b1codes/loaders-react-native.
 * Renders particle stacks, refractive depth blur layers, ambient variant glow,
 * Chromatic Pulse color gradients, and Thermal Glow exit discharge using @shopify/react-native-skia.
 */

import React from 'react';
import type { ParticleRenderState } from '@b1codes/core';
import { THERMAL_GLOW_SPECTRUM, parseColorToRGB, interpolateRGB, rgbToHex } from '@b1codes/core';

// Safe import of @shopify/react-native-skia for cross-environment compatibility
let Skia: any = null;
let Canvas: any = null;
let Group: any = null;
let Circle: any = null;
let Blur: any = null;
let RadialGradient: any = null;
let vec: any = null;

try {
  const skiaModule = require('@shopify/react-native-skia');
  Canvas = skiaModule.Canvas;
  Group = skiaModule.Group;
  Circle = skiaModule.Circle;
  Blur = skiaModule.Blur;
  RadialGradient = skiaModule.RadialGradient;
  vec = skiaModule.vec;
  Skia = skiaModule.Skia;
} catch {
  // Graceful fallback in environments without native Skia module initialized
}

export interface ThermalGlowState {
  active: boolean;
  progress: number;
}

export interface SkiaRendererProps {
  width: number;
  height: number;
  particles: ParticleRenderState[];
  backgroundColor: string;
  variant: 'orbital' | 'nebula' | 'cascade';
  intensity: number;
  thermalGlow: ThermalGlowState;
  reducedMotion: boolean;
}

const HEAT_START_RGB = parseColorToRGB(THERMAL_GLOW_SPECTRUM[0]);
const HEAT_END_RGB = parseColorToRGB(THERMAL_GLOW_SPECTRUM[1]);

export function SkiaParticleCanvas(props: SkiaRendererProps) {
  const {
    width,
    height,
    particles,
    backgroundColor,
    variant,
    intensity,
    thermalGlow,
    reducedMotion,
  } = props;

  const cx = width / 2;
  const cy = height / 2;

  // Process particles with refractive depth and Thermal Glow transformations
  const bgParticles: any[] = [];
  const midParticles: any[] = [];
  const fgParticles: any[] = [];

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    let drawX = p.x;
    let drawY = p.y;
    let drawColor = p.color;
    let drawOpacity = p.opacity;

    const baseRadius = Math.max(1.5, 3.5 * p.scale * (intensity / 0.7));

    if (thermalGlow.active) {
      const t = thermalGlow.progress;
      const easedT = 1 - Math.pow(1 - t, 4);
      const dx = p.x - cx;
      const dy = p.y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const scatterMag = dist * (1 + easedT * 1.8);

      drawX = cx + (dx / dist) * scatterMag;
      drawY = cy + (dy / dist) * scatterMag;

      const heatRGB = interpolateRGB(HEAT_START_RGB, HEAT_END_RGB, t);
      drawColor = rgbToHex(heatRGB);
      drawOpacity = Math.max(0, p.opacity * (1 - t));
    }

    if (drawOpacity <= 0.001) continue;

    const item = {
      id: p.id,
      x: drawX,
      y: drawY,
      radius: baseRadius,
      color: drawColor,
      opacity: drawOpacity,
      layer: p.layer,
    };

    if (p.layer === 'background') {
      bgParticles.push(item);
    } else if (p.layer === 'midground') {
      midParticles.push(item);
    } else {
      fgParticles.push(item);
    }
  }

  // If Skia Canvas component is available, render via react-native-skia Canvas
  if (Canvas) {
    const primaryColor = particles[0]?.color || '#4A90E2';

    return (
      <Canvas style={{ width, height, backgroundColor }}>
        {/* Variant Ambient Cores */}
        {!reducedMotion && !thermalGlow.active && variant === 'orbital' && (
          <Group>
            <Circle cx={cx} cy={cy} r={Math.min(width, height) * 0.2} opacity={0.35}>
              <RadialGradient
                c={vec(cx, cy)}
                r={Math.min(width, height) * 0.2}
                colors={[primaryColor, primaryColor, 'rgba(0,0,0,0)']}
              />
            </Circle>
            <Circle cx={cx} cy={cy} r={3} color={primaryColor} opacity={0.9} />
          </Group>
        )}

        {/* Refractive Depth Blur Layers */}
        {/* Background Layer */}
        <Group>
          <Blur blur={4} />
          {bgParticles.map((p) => (
            <Circle
              key={`bg-${p.id}`}
              cx={p.x}
              cy={p.y}
              r={p.radius}
              color={p.color}
              opacity={p.opacity}
            />
          ))}
        </Group>

        {/* Midground Layer */}
        <Group>
          <Blur blur={1} />
          {midParticles.map((p) => (
            <Circle
              key={`mid-${p.id}`}
              cx={p.x}
              cy={p.y}
              r={p.radius}
              color={p.color}
              opacity={p.opacity}
            />
          ))}
        </Group>

        {/* Foreground Layer (Crisp) */}
        <Group>
          {fgParticles.map((p) => (
            <Circle
              key={`fg-${p.id}`}
              cx={p.x}
              cy={p.y}
              r={p.radius}
              color={p.color}
              opacity={p.opacity}
            />
          ))}
        </Group>
      </Canvas>
    );
  }

  // Pure React Native View fallback for test/mock environments
  return (
    <div
      style={{
        position: 'relative',
        width: `${width}px`,
        height: `${height}px`,
        backgroundColor,
        overflow: 'hidden',
      }}
    >
      {[...bgParticles, ...midParticles, ...fgParticles].map((p) => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.x - p.radius}px`,
            top: `${p.y - p.radius}px`,
            width: `${p.radius * 2}px`,
            height: `${p.radius * 2}px`,
            borderRadius: '50%',
            backgroundColor: p.color,
            opacity: p.opacity,
          }}
        />
      ))}
    </div>
  );
}
