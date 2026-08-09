/**
 * @file packages/react-native/src/loaders/BaseLoader.native.tsx
 * @description Shared base component for @b1codes/loaders-react-native.
 * Handles AccessibilityInfo.isReduceMotionEnabled auto-detection, particle engine physics loop,
 * Skia rendering integration, imperative ref controls, and lifecycle callbacks.
 */

import React, {
  forwardRef,
  memo,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { AccessibilityInfo, View } from 'react-native';
import { ParticleEngine, CHROMATIC_PULSE_DURATION, ParticleRenderState } from '@b1codes/core';
import { SkiaParticleCanvas } from '../skia-renderer.js';
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
      accessibilityLabel = 'Loading',
      style,
      onCycleComplete,
      onDismiss,
      reducedMotion: forcedReducedMotion,
      variant,
      defaultParticleCount,
    } = props;

    const { width, height } = parseSize(size);
    const particleCount = particleCountProp ?? defaultParticleCount;

    const engineRef = useRef<ParticleEngine | null>(null);
    const animFrameRef = useRef<number | null>(null);
    const lastTimestampRef = useRef<number>(0);
    const elapsedMsRef = useRef<number>(0);
    const lastCycleRef = useRef<number>(0);
    const isPausedRef = useRef<boolean>(false);

    const thermalGlowRef = useRef<{
      active: boolean;
      startTime: number;
      progress: number;
    }>({ active: false, startTime: 0, progress: 0 });

    const [particlesState, setParticlesState] = useState<ParticleRenderState[]>([]);
    const [isReducedMotionState, setIsReducedMotionState] = useState<boolean>(() => {
      return forcedReducedMotion ?? false;
    });

    // Detect platform system AccessibilityInfo reduced motion setting
    useEffect(() => {
      if (typeof forcedReducedMotion === 'boolean') {
        setIsReducedMotionState(forcedReducedMotion);
        return;
      }

      let isMounted = true;
      if (AccessibilityInfo && typeof AccessibilityInfo.isReduceMotionEnabled === 'function') {
        AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
          if (isMounted) setIsReducedMotionState(enabled);
        });
      }

      const subscription = AccessibilityInfo?.addEventListener?.(
        'reduceMotionChanged',
        (enabled: boolean) => {
          if (isMounted) setIsReducedMotionState(enabled);
        }
      );

      return () => {
        isMounted = false;
        if (subscription && typeof subscription.remove === 'function') {
          subscription.remove();
        }
      };
    }, [forcedReducedMotion]);

    // Imperative control handle
    useImperativeHandle(
      ref,
      (): LoaderRef => ({
        resolve: () => {
          if (thermalGlowRef.current.active) return;
          thermalGlowRef.current = {
            active: true,
            startTime: typeof performance !== 'undefined' ? performance.now() : Date.now(),
            progress: 0,
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

    // Particle simulation loop
    useEffect(() => {
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

      if (isReducedMotionState) {
        setParticlesState(engine.getRenderState());
        return;
      }

      lastTimestampRef.current = typeof performance !== 'undefined' ? performance.now() : Date.now();
      elapsedMsRef.current = 0;
      lastCycleRef.current = 0;
      thermalGlowRef.current = { active: false, startTime: 0, progress: 0 };

      const tick = (now: number) => {
        if (!engineRef.current) return;

        const deltaTime = Math.min(64, now - lastTimestampRef.current);
        lastTimestampRef.current = now;

        if (!isPausedRef.current) {
          elapsedMsRef.current += deltaTime * speed;

          const cycleDuration = CHROMATIC_PULSE_DURATION / Math.max(0.1, speed);
          const currentCycle = Math.floor(elapsedMsRef.current / cycleDuration);

          if (currentCycle > lastCycleRef.current) {
            lastCycleRef.current = currentCycle;
            onCycleComplete?.();
          }

          const currentParticles = engine.step(deltaTime);

          // Handle Thermal Glow Exit Discharge
          if (thermalGlowRef.current.active) {
            const elapsedThermal = now - thermalGlowRef.current.startTime;
            const progress = Math.min(1.0, elapsedThermal / 350);
            thermalGlowRef.current.progress = progress;

            if (progress >= 1.0) {
              setParticlesState([]);
              onDismiss?.();
              return; // Stop animation loop
            }
          }

          setParticlesState([...currentParticles]);
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
      variant,
      isReducedMotionState,
      onCycleComplete,
      onDismiss,
    ]);

    return (
      <View
        style={[
          {
            width,
            height,
            backgroundColor,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          },
          style,
        ]}
        accessible={true}
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel}
      >
        <SkiaParticleCanvas
          width={width}
          height={height}
          particles={particlesState}
          backgroundColor={backgroundColor}
          variant={variant}
          intensity={intensity}
          thermalGlow={thermalGlowRef.current}
          reducedMotion={isReducedMotionState}
        />
      </View>
    );
  })
);

BaseLoader.displayName = 'BaseLoader';
