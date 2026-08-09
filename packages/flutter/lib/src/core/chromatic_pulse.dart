import 'dart:math' as math;
import 'dart:ui';
import 'constants.dart';

class ChromaticPulseState {
  final Color color;
  final double opacity;
  final double progress;

  const ChromaticPulseState({
    required this.color,
    required this.opacity,
    required this.progress,
  });
}

/// Cubic bezier solver for CHROMATIC_EASE.
double solveCubicBezier(
  double t, [
  double x1 = 0.45,
  double y1 = 0.0,
  double x2 = 0.55,
  double y2 = 1.0,
]) {
  if (t <= 0) return 0.0;
  if (t >= 1) return 1.0;

  double u = t;
  for (int i = 0; i < 8; i++) {
    final oneMinusU = 1.0 - u;
    final x = 3 * oneMinusU * oneMinusU * u * x1 +
        3 * oneMinusU * u * u * x2 +
        u * u * u;
    final dx = 3 * oneMinusU * oneMinusU * x1 +
        6 * oneMinusU * u * (x2 - x1) +
        3 * u * u * (1 - x2);
    if (dx.abs() < 1e-6) break;
    u -= (x - t) / dx;
    u = u.clamp(0.0, 1.0);
  }

  final oneMinusU = 1.0 - u;
  return 3 * oneMinusU * oneMinusU * u * y1 +
      3 * oneMinusU * u * u * y2 +
      u * u * u;
}

/// Color linear interpolation.
Color lerpColor(Color a, Color b, double t) {
  final clampedT = t.clamp(0.0, 1.0);
  final r = (a.r + (b.r - a.r) * clampedT).clamp(0.0, 1.0);
  final g = (a.g + (b.g - a.g) * clampedT).clamp(0.0, 1.0);
  final bl = (a.b + (b.b - a.b) * clampedT).clamp(0.0, 1.0);
  final alpha = (a.a + (b.a - a.a) * clampedT).clamp(0.0, 1.0);
  return Color.from(alpha: alpha, red: r, green: g, blue: bl);
}

/// Chromatic Pulse color cycle engine in Dart.
class ChromaticPulse {
  List<Color> palette;
  int durationMs;
  bool reducedMotion;

  ChromaticPulse({
    required this.palette,
    this.durationMs = LoaderConstants.chromaticPulseDurationMs,
    this.reducedMotion = false,
  }) {
    if (palette.length < 2) {
      palette = [const Color(0xFF4A90E2), const Color(0xFF50E3C2)];
    }
  }

  void updateConfig({List<Color>? palette, int? durationMs, bool? reducedMotion}) {
    if (palette != null && palette.length >= 2) {
      this.palette = palette;
    }
    if (durationMs != null) this.durationMs = durationMs;
    if (reducedMotion != null) this.reducedMotion = reducedMotion;
  }

  ChromaticPulseState evaluateAt(double elapsedMs) {
    if (reducedMotion) {
      return ChromaticPulseState(
        color: palette[0],
        opacity: 1.0,
        progress: 0.0,
      );
    }

    final totalDuration = math.max(1, durationMs);
    final progress = (elapsedMs % totalDuration) / totalDuration;

    final count = palette.length;
    final scaledProgress = progress * count;
    final index = scaledProgress.floor();
    final nextIndex = (index + 1) % count;
    final segmentProgress = scaledProgress - index;

    final easedSegment = solveCubicBezier(
      segmentProgress,
      LoaderConstants.chromaticEaseBezier[0],
      LoaderConstants.chromaticEaseBezier[1],
      LoaderConstants.chromaticEaseBezier[2],
      LoaderConstants.chromaticEaseBezier[3],
    );

    final color = lerpColor(palette[index], palette[nextIndex], easedSegment);

    final breathingFactor = 0.5 * (1 + math.sin(progress * 2 * math.pi));
    final opacity = LoaderConstants.chromaticOpacityMin +
        (LoaderConstants.chromaticOpacityMax - LoaderConstants.chromaticOpacityMin) *
            breathingFactor;

    return ChromaticPulseState(
      color: color,
      opacity: opacity.clamp(0.0, 1.0),
      progress: progress,
    );
  }
}
