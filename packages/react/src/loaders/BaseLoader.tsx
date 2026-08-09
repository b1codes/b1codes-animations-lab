/**
 * @file packages/react/src/loaders/BaseLoader.tsx
 * @description Shared base component for @b1codes/loaders React Web implementations.
 * Enforces render isolation (requestAnimationFrame loop in useRef, zero React re-renders per frame),
 * respects prefers-reduced-motion, provides imperative ref control, and calls lifecycle hooks.
 */

import React, {
  forwardRef,
  memo,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { ParticleEngine, CHROMATIC_PULSE_DURATION } from '@b1codes/core';
import { renderParticlesToCanvas } from '../canvas-renderer.js';
import type { LoaderProps, LoaderRef, LoaderSize } from '../types.js';

export interface BaseLoaderInternalProps extends LoaderProps {
  variant: 'orbital' | 'nebula' | 'cascade';
  defaultParticleCount: number;
}

function parseSize(size?: number | LoaderSize): LoaderSize {
  if (typeof size === 'number') {
    return { width: size, height: size };
  }
  if (size && typeof size.width === 'number' && typeof size.height === 'number') {
    return { width: size.width, height: size.height };
  }
  return { width: 48, height: 48 };
}

export const BaseLoader = memo(
  forwardRef<LoaderRef, BaseLoaderInternalProps>((props, ref) => {
    const {
      palette,
      size,
      particleCount: particleCountProp,
      speed = 1.0,
      intensity = 0.7,
      depth = true,
      backgroundColor = 'transparent',
      'aria-label': ariaLabel = 'Loading',
      className,
      style,
      onCycleComplete,
      onDismiss,
      reducedMotion: forcedReducedMotion,
      variant,
      defaultParticleCount,
    } = props;

    const { width, height } = parseSize(size);
    const particleCount = particleCountProp ?? defaultParticleCount;

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const engineRef = useRef<ParticleEngine | null>(null);
    const animFrameRef = useRef<number | null>(null);
    const lastTimestampRef = useRef<number>(0);
    const elapsedMsRef = useRef<number>(0);
    const lastCycleRef = useRef<number>(0);
    const isPausedRef = useRef<boolean>(false);

    const thermalGlowRef = useRef<{
      active: boolean;
      startTime: number;
    }>({ active: false, startTime: 0 });

    const [isReducedMotionState, setIsReducedMotionState] = useState<boolean>(() => {
      if (typeof forcedReducedMotion === 'boolean') {
        return forcedReducedMotion;
      }
      if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      }
      return false;
    });

    // Sync reduced-motion preference changes
    useEffect(() => {
      if (typeof forcedReducedMotion === 'boolean') {
        setIsReducedMotionState(forcedReducedMotion);
        return;
      }

      if (typeof window === 'undefined' || !window.matchMedia) return;

      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      const handleChange = (e: MediaQueryListEvent) => {
        setIsReducedMotionState(e.matches);
      };

      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
      } else if ('addListener' in mediaQuery) {
        // Fallback for older Safari
        (mediaQuery as any).addListener(handleChange);
        return () => (mediaQuery as any).removeListener(handleChange);
      }
    }, [forcedReducedMotion]);

    // Imperative Control Handle via forwardRef
    useImperativeHandle(
      ref,
      (): LoaderRef => ({
        resolve: () => {
          if (thermalGlowRef.current.active) return;
          thermalGlowRef.current = {
            active: true,
            startTime: typeof performance !== 'undefined' ? performance.now() : Date.now(),
          };
        },
        pause: () => {
          isPausedRef.current = true;
          engineRef.current?.pause();
        },
        resume: () => {
          isPausedRef.current = false;
          engineRef.current?.resume();
          lastTimestampRef.current = typeof performance !== 'undefined' ? performance.now() : Date.now();
        },
        isPaused: () => isPausedRef.current || (engineRef.current?.isPaused() ?? false),
      }),
      []
    );

    // Main particle simulation & render loop
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Initialize ParticleEngine
      const engine = new ParticleEngine({
        particleCount,
        palette,
        speed,
        intensity,
        depth,
        reducedMotion: isReducedMotionState,
        width,
        height,
      });
      engineRef.current = engine;

      // Reduced motion state render: static single-frame draw
      if (isReducedMotionState) {
        const particles = engine.getRenderState();
        renderParticlesToCanvas({
          ctx,
          width,
          height,
          dpr,
          particles,
          backgroundColor,
          variant,
          intensity,
          thermalGlow: { active: false, progress: 0 },
          reducedMotion: true,
        });
        return;
      }

      // Live 60fps animation loop
      lastTimestampRef.current = typeof performance !== 'undefined' ? performance.now() : Date.now();
      elapsedMsRef.current = 0;
      lastCycleRef.current = 0;
      thermalGlowRef.current = { active: false, startTime: 0 };

      const tick = (now: number) => {
        if (!canvas || !ctx || !engineRef.current) return;

        const deltaTime = Math.min(64, now - lastTimestampRef.current);
        lastTimestampRef.current = now;

        if (!isPausedRef.current) {
          elapsedMsRef.current += deltaTime * speed;

          // Track full Chromatic Pulse cycles (duration = 3200ms / speed)
          const cycleDuration = CHROMATIC_PULSE_DURATION / Math.max(0.1, speed);
          const currentCycle = Math.floor(elapsedMsRef.current / cycleDuration);

          if (currentCycle > lastCycleRef.current) {
            lastCycleRef.current = currentCycle;
            onCycleComplete?.();
          }

          // Step particle physics solver
          const particles = engine.step(deltaTime);

          // Handle Thermal Glow Exit Discharge sequence (~350ms total)
          let thermalProgress = 0;
          let isThermalActive = false;

          if (thermalGlowRef.current.active) {
            isThermalActive = true;
            const elapsedThermal = now - thermalGlowRef.current.startTime;
            thermalProgress = Math.min(1.0, elapsedThermal / 350);

            if (thermalProgress >= 1.0) {
              // Exit animation completed
              ctx.clearRect(0, 0, width * dpr, height * dpr);
              onDismiss?.();
              return; // Stop animation loop
            }
          }

          // Render canvas frame
          renderParticlesToCanvas({
            ctx,
            width,
            height,
            dpr,
            particles,
            backgroundColor,
            variant,
            intensity,
            thermalGlow: {
              active: isThermalActive,
              progress: thermalProgress,
            },
            reducedMotion: false,
          });
        }

        animFrameRef.current = requestAnimationFrame(tick);
      };

      animFrameRef.current = requestAnimationFrame(tick);

      return () => {
        if (animFrameRef.current !== null) {
          cancelAnimationFrame(animFrameRef.current);
        }
      };
    }, [
      width,
      height,
      particleCount,
      palette,
      speed,
      intensity,
      depth,
      backgroundColor,
      variant,
      isReducedMotionState,
      onCycleComplete,
      onDismiss,
    ]);

    return (
      <div
        className={`b1codes-loader b1codes-loader-${variant} ${className ?? ''}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          width: `${width}px`,
          height: `${height}px`,
          backgroundColor,
          overflow: 'hidden',
          ...style,
        }}
        role="img"
        aria-label={ariaLabel}
      >
        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
          }}
        />
      </div>
    );
  })
);

BaseLoader.displayName = 'BaseLoader';
