import 'package:flutter/material.dart';
import 'b1codes_loader_controller.dart';
import 'base_loader.dart';

/// Particles cascade down from top, pool briefly at floor baseline, dissolve, and recycle.
class CascadeLoader extends StatelessWidget {
  final List<Color> palette;
  final Size size;
  final int particleCount;
  final double speed;
  final double gravity;
  final double wind;
  final double intensity;
  final bool depth;
  final Color? backgroundColor;
  final String semanticsLabel;
  final VoidCallback? onCycleComplete;
  final VoidCallback? onDismiss;
  final bool? reducedMotion;
  final B1CodesLoaderController? controller;

  const CascadeLoader({
    super.key,
    required this.palette,
    this.size = const Size(48.0, 48.0),
    this.particleCount = 30,
    this.speed = 1.0,
    this.gravity = 1.0,
    this.wind = 1.0,
    this.intensity = 0.7,
    this.depth = true,
    this.backgroundColor,
    this.semanticsLabel = 'Loading',
    this.onCycleComplete,
    this.onDismiss,
    this.reducedMotion,
    this.controller,
  });

  @override
  Widget build(BuildContext context) {
    final effectiveSpeed = speed * ((gravity + wind) / 2);

    return BaseLoaderWidget(
      palette: palette,
      size: size,
      particleCount: particleCount,
      speed: effectiveSpeed,
      intensity: intensity,
      depth: depth,
      backgroundColor: backgroundColor,
      semanticsLabel: semanticsLabel,
      onCycleComplete: onCycleComplete,
      onDismiss: onDismiss,
      reducedMotion: reducedMotion,
      controller: controller,
      variant: 'cascade',
    );
  }
}
