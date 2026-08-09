import 'dart:ui';

/// Canonical source of truth for physical constants, particle mass tiers,
/// Chromatic Pulse specs, and refractive depth layer parameters for b1codes_loaders.
class LoaderConstants {
  /// Base cycle duration for full particle field color rotation through the palette (3200ms).
  static const int chromaticPulseDurationMs = 3200;

  /// Cubic bezier control points for CHROMATIC_EASE: [0.45, 0.0, 0.55, 1.0].
  static const List<double> chromaticEaseBezier = [0.45, 0.0, 0.55, 1.0];

  /// Opacity breathing range [min, max].
  static const double chromaticOpacityMin = 0.55;
  static const double chromaticOpacityMax = 1.0;

  /// Drag resistance friction coefficient.
  static const double dragResistance = 0.15;

  /// Spring stiffness constant.
  static const double springStiffness = 180.0;

  /// Spring damping constant.
  static const double springDamping = 12.0;

  /// Thermal Glow Phase 1 Excitation duration (50ms).
  static const int thermalGlowExcitationMs = 50;

  /// Thermal Glow Phase 2 Dissipation duration (300ms).
  static const int thermalGlowDissipationMs = 300;

  /// Total Thermal Glow exit duration (350ms).
  static const int thermalGlowTotalDurationMs = 350;

  /// Thermal Heat color spectrum transition sequence (#FF3B30 -> #FF9500).
  static const List<Color> thermalGlowSpectrum = [
    Color(0xFFFF3B30),
    Color(0xFFFF9500),
  ];
}

/// Simulated mass tier properties for particles.
class ParticleMassTier {
  final String name;
  final double mass;
  final double sizeRatio;
  final double velocityRatio;
  final double shimmerRate;

  const ParticleMassTier({
    required this.name,
    required this.mass,
    required this.sizeRatio,
    required this.velocityRatio,
    required this.shimmerRate,
  });

  static const dust = ParticleMassTier(
    name: 'dust',
    mass: 0.5,
    sizeRatio: 0.6,
    velocityRatio: 1.4,
    shimmerRate: 1.5,
  );

  static const motes = ParticleMassTier(
    name: 'motes',
    mass: 1.0,
    sizeRatio: 1.0,
    velocityRatio: 1.0,
    shimmerRate: 1.0,
  );

  static const cores = ParticleMassTier(
    name: 'cores',
    mass: 2.5,
    sizeRatio: 1.8,
    velocityRatio: 0.6,
    shimmerRate: 0.7,
  );
}

/// Refractive depth layer parameters.
class RefractiveDepthLayer {
  final String layer;
  final int depthIndex;
  final double blurPx;
  final double opacityMultiplier;
  final double scale;

  const RefractiveDepthLayer({
    required this.layer,
    required this.depthIndex,
    required this.blurPx,
    required this.opacityMultiplier,
    required this.scale,
  });

  static const background = RefractiveDepthLayer(
    layer: 'background',
    depthIndex: 0,
    blurPx: 4.0,
    opacityMultiplier: 0.45,
    scale: 0.75,
  );

  static const midground = RefractiveDepthLayer(
    layer: 'midground',
    depthIndex: 1,
    blurPx: 1.0,
    opacityMultiplier: 0.75,
    scale: 0.90,
  );

  static const foreground = RefractiveDepthLayer(
    layer: 'foreground',
    depthIndex: 2,
    blurPx: 0.0,
    opacityMultiplier: 1.00,
    scale: 1.00,
  );
}
