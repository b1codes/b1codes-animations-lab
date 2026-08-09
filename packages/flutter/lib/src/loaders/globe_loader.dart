import 'package:flutter/material.dart';
import 'b1codes_loader_controller.dart';
import 'base_loader.dart';

/// A loading indicator consisting of a rotating 3D sphere/globe of nodes that glow.
/// Designed to indicate large searching or data fetching operations.
class GlobeLoader extends StatelessWidget {
  final List<Color> palette;
  final Size size;
  final int particleCount;
  final double speed;
  final double intensity;
  final bool depth;
  final Color? backgroundColor;
  final String semanticsLabel;
  final VoidCallback? onCycleComplete;
  final VoidCallback? onDismiss;
  final bool? reducedMotion;
  final B1CodesLoaderController? controller;

  const GlobeLoader({
    super.key,
    required this.palette,
    this.size = const Size(48.0, 48.0),
    this.particleCount = 24,
    this.speed = 1.0,
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
    return BaseLoaderWidget(
      palette: palette,
      size: size,
      particleCount: particleCount,
      speed: speed,
      intensity: intensity,
      depth: depth,
      backgroundColor: backgroundColor,
      semanticsLabel: semanticsLabel,
      onCycleComplete: onCycleComplete,
      onDismiss: onDismiss,
      reducedMotion: reducedMotion,
      controller: controller,
      variant: 'globe',
    );
  }
}
