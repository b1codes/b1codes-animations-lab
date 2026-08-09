/**
 * @file packages/react/src/demo/LoaderDemo.tsx
 * @description Standalone interactive demo component for @b1codes/loaders.
 * Demonstrates OrbitalLoader, NebulaLoader, and CascadeLoader with live controls:
 * palette picker, speed/intensity sliders, imperative handle actions (resolve, pause, resume),
 * and reduced-motion toggle.
 */

import React, { useRef, useState } from 'react';
import { OrbitalLoader, NebulaLoader, CascadeLoader } from '../index.js';
import type { LoaderRef } from '../types.js';

const PALETTES = [
  { name: 'LLC Tech Luxury', colors: ['#4A90E2', '#50E3C2', '#9013FE'] },
  { name: 'Cyberpunk Neon', colors: ['#FF007F', '#00F0FF', '#7F00FF'] },
  { name: 'Solar Thermal', colors: ['#FF3B30', '#FF9500', '#FFCC00'] },
  { name: 'Emerald Prism', colors: ['#10B981', '#06B6D4', '#3B82F6'] },
];

export function LoaderDemo() {
  const [selectedVariant, setSelectedVariant] = useState<'orbital' | 'nebula' | 'cascade'>('orbital');
  const [paletteIndex, setPaletteIndex] = useState(0);
  const [size, setSize] = useState(160);
  const [speed, setSpeed] = useState(1.0);
  const [intensity, setIntensity] = useState(0.7);
  const [particleCount, setParticleCount] = useState(24);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [statusText, setStatusText] = useState('Idle');

  const loaderRef = useRef<LoaderRef | null>(null);

  const currentPalette = PALETTES[paletteIndex].colors;

  const handleResolve = () => {
    setStatusText('Resolving (Thermal Glow exit discharge)...');
    loaderRef.current?.resolve();
  };

  const handlePauseToggle = () => {
    if (isPaused) {
      loaderRef.current?.resume();
      setIsPaused(false);
      setStatusText('Resumed animation loop');
    } else {
      loaderRef.current?.pause();
      setIsPaused(true);
      setStatusText('Paused animation loop');
    }
  };

  return (
    <div
      style={{
        fontFamily: 'system-ui, -apple-system, sans-serif',
        backgroundColor: '#0D0F12',
        color: '#F3F4F6',
        minHeight: '100vh',
        padding: '32px',
        boxSizing: 'border-box',
      }}
    >
      <header style={{ marginBottom: '32px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, margin: '0 0 8px 0', color: '#FFFFFF' }}>
          @b1codes/loaders — Interactive Playground
        </h1>
        <p style={{ color: '#9CA3AF', margin: 0 }}>
          React 19+ particle loading components driven by Chromatic Pulse & physics mechanics
        </p>
      </header>

      <main style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {/* Preview Panel */}
        <section
          style={{
            flex: '1 1 360px',
            maxWidth: '500px',
            backgroundColor: '#161920',
            border: '1px solid #2D3748',
            borderRadius: '16px',
            padding: '32px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '380px',
          }}
        >
          <div style={{ marginBottom: '24px', position: 'relative' }}>
            {selectedVariant === 'orbital' && (
              <OrbitalLoader
                ref={loaderRef}
                palette={currentPalette}
                size={size}
                speed={speed}
                intensity={intensity}
                particleCount={particleCount}
                reducedMotion={reducedMotion}
                onCycleComplete={() => setStatusText('Chromatic Pulse cycle complete')}
                onDismiss={() => setStatusText('Dismissed after resolution')}
              />
            )}
            {selectedVariant === 'nebula' && (
              <NebulaLoader
                ref={loaderRef}
                palette={currentPalette}
                size={size}
                speed={speed}
                intensity={intensity}
                particleCount={particleCount}
                reducedMotion={reducedMotion}
                onCycleComplete={() => setStatusText('Chromatic Pulse cycle complete')}
                onDismiss={() => setStatusText('Dismissed after resolution')}
              />
            )}
            {selectedVariant === 'cascade' && (
              <CascadeLoader
                ref={loaderRef}
                palette={currentPalette}
                size={size}
                speed={speed}
                intensity={intensity}
                particleCount={particleCount}
                reducedMotion={reducedMotion}
                onCycleComplete={() => setStatusText('Chromatic Pulse cycle complete')}
                onDismiss={() => setStatusText('Dismissed after resolution')}
              />
            )}
          </div>

          <div style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '16px' }}>
            Status: <span style={{ color: '#60A5FA' }}>{statusText}</span>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleResolve}
              style={{
                backgroundColor: '#EF4444',
                color: '#FFF',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              resolve()
            </button>
            <button
              onClick={handlePauseToggle}
              style={{
                backgroundColor: isPaused ? '#10B981' : '#F59E0B',
                color: '#FFF',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {isPaused ? 'resume()' : 'pause()'}
            </button>
          </div>
        </section>

        {/* Controls Panel */}
        <section
          style={{
            flex: '1 1 320px',
            maxWidth: '420px',
            backgroundColor: '#161920',
            border: '1px solid #2D3748',
            borderRadius: '16px',
            padding: '24px',
          }}
        >
          <h2 style={{ fontSize: '18px', margin: '0 0 20px 0' }}>Configuration</h2>

          {/* Variant Selector */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: '#9CA3AF' }}>
              Loader Variant
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['orbital', 'nebula', 'cascade'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => {
                    setSelectedVariant(v);
                    setStatusText(`Switched to ${v}`);
                  }}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid #374151',
                    backgroundColor: selectedVariant === v ? '#3B82F6' : '#1F2937',
                    color: '#FFF',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Palette Selector */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: '#9CA3AF' }}>
              Theme Palette
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {PALETTES.map((p, idx) => (
                <button
                  key={p.name}
                  onClick={() => setPaletteIndex(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: paletteIndex === idx ? '1px solid #3B82F6' : '1px solid #374151',
                    backgroundColor: '#1F2937',
                    color: '#FFF',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: '13px' }}>{p.name}</span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {p.colors.map((c) => (
                      <span
                        key={c}
                        style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          backgroundColor: c,
                          display: 'inline-block',
                        }}
                      />
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Sliders */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#9CA3AF' }}>
              <span>Size: {size}px</span>
            </label>
            <input
              type="range"
              min="32"
              max="280"
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#9CA3AF' }}>
              <span>Speed: {speed.toFixed(1)}x</span>
            </label>
            <input
              type="range"
              min="0.2"
              max="3.0"
              step="0.1"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#9CA3AF' }}>
              <span>Intensity: {intensity.toFixed(1)}</span>
            </label>
            <input
              type="range"
              min="0.2"
              max="1.5"
              step="0.1"
              value={intensity}
              onChange={(e) => setIntensity(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#9CA3AF' }}>
              <span>Particles: {particleCount}</span>
            </label>
            <input
              type="range"
              min="12"
              max="60"
              value={particleCount}
              onChange={(e) => setParticleCount(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          {/* Toggles */}
          <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #374151' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
              <input
                type="checkbox"
                checked={reducedMotion}
                onChange={(e) => setReducedMotion(e.target.checked)}
              />
              <span>Force prefers-reduced-motion (Static Dot Grid)</span>
            </label>
          </div>
        </section>
      </main>
    </div>
  );
}
