import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../core/constants.dart';
import '../core/chromatic_pulse.dart';
import '../core/particle_engine.dart';

class ParticlePainter extends CustomPainter {
  final List<ParticleRenderState> particles;
  final String variant;
  final double intensity;
  final Color? backgroundColor;
  final bool isThermalActive;
  final double thermalProgress;
  final bool reducedMotion;

  ParticlePainter({
    required this.particles,
    required this.variant,
    required this.intensity,
    this.backgroundColor,
    required this.isThermalActive,
    required this.thermalProgress,
    required this.reducedMotion,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final width = size.width;
    final height = size.height;
    final cx = width / 2;
    final cy = height / 2;

    // Draw background fill if provided
    if (backgroundColor != null && backgroundColor != Colors.transparent) {
      final bgPaint = Paint()..color = backgroundColor!;
      canvas.drawRect(Rect.fromLTWH(0, 0, width, height), bgPaint);
    }

    // Draw variant ambient backgrounds
    if (!reducedMotion && !isThermalActive && particles.isNotEmpty) {
      final primaryColor = particles[0].color;
      if (variant == 'orbital') {
        _drawOrbitalAmbient(canvas, size, cx, cy, primaryColor);
      } else if (variant == 'cascade') {
        _drawCascadeFloor(canvas, size, primaryColor);
      } else if (variant == 'nebula') {
        _drawNebulaAmbient(canvas, size, cx, cy, primaryColor);
      } else if (variant == 'neural') {
        _drawNebulaAmbient(canvas, size, cx, cy, primaryColor);
        _drawNeuralWeb(canvas, size, primaryColor);
      } else if (variant == 'globe') {
        _drawNebulaAmbient(canvas, size, cx, cy, primaryColor);
        _drawGlobeRings(canvas, size, cx, cy, primaryColor);
      }
    }

    // Sort particles by depth layer
    final layerOrder = {'background': 0, 'midground': 1, 'foreground': 2};
    final sorted = List<ParticleRenderState>.from(particles)
      ..sort((a, b) => (layerOrder[a.layer] ?? 1).compareTo(layerOrder[b.layer] ?? 1));

    for (final p in sorted) {
      double drawX = p.x;
      double drawY = p.y;
      Color drawColor = p.color;
      double drawOpacity = p.opacity;

      final baseRadius = math.max(1.5, 3.5 * p.scale * (intensity / 0.7));

      if (isThermalActive) {
        final t = thermalProgress;
        final dx = p.x - cx;
        final dy = p.y - cy;
        final dist = math.sqrt(dx * dx + dy * dy);
        final safeDist = dist == 0 ? 1.0 : dist;
        final easedT = 1.0 - math.pow(1.0 - t, 4.0).toDouble();
        final scatterMag = safeDist * (1 + easedT * 1.8);

        drawX = cx + (dx / safeDist) * scatterMag;
        drawY = cy + (dy / safeDist) * scatterMag;

        drawColor = lerpColor(
          LoaderConstants.thermalGlowSpectrum[0],
          LoaderConstants.thermalGlowSpectrum[1],
          t,
        );
        drawOpacity = math.max(0.0, p.opacity * (1.0 - t));
      }

      if (drawOpacity <= 0.001) continue;

      // Outer glow halo for foreground & midground particles
      if (p.layer == 'foreground' || p.layer == 'midground') {
        final glowRadius = baseRadius * (p.layer == 'foreground' ? 3.0 : 2.0);
        final glowPaint = Paint()
          ..shader = RadialGradient(
            colors: [
              drawColor.withValues(alpha: drawOpacity * 0.8),
              drawColor.withValues(alpha: drawOpacity * 0.2),
              drawColor.withValues(alpha: 0.0),
            ],
            stops: const [0.0, 0.4, 1.0],
          ).createShader(Rect.fromCircle(center: Offset(drawX, drawY), radius: glowRadius));

        canvas.drawCircle(Offset(drawX, drawY), glowRadius, glowPaint);
      }

      // Crisp core particle dot
      final corePaint = Paint()
        ..color = drawColor.withValues(alpha: drawOpacity)
        ..style = PaintingStyle.fill;

      if (p.blurPx > 0.0) {
        corePaint.maskFilter = MaskFilter.blur(BlurStyle.normal, p.blurPx);
      }

      canvas.drawCircle(Offset(drawX, drawY), baseRadius, corePaint);
    }
  }

  void _drawOrbitalAmbient(Canvas canvas, Size size, double cx, double cy, Color color) {
    final maxRadius = math.min(size.width, size.height) * 0.2;
    final glowPaint = Paint()
      ..shader = RadialGradient(
        colors: [
          color.withValues(alpha: 0.35),
          color.withValues(alpha: 0.15),
          color.withValues(alpha: 0.0),
        ],
      ).createShader(Rect.fromCircle(center: Offset(cx, cy), radius: maxRadius));

    canvas.drawCircle(Offset(cx, cy), maxRadius, glowPaint);

    final dotPaint = Paint()
      ..color = color.withValues(alpha: 0.9)
      ..style = PaintingStyle.fill;
    canvas.drawCircle(Offset(cx, cy), 3.0, dotPaint);
  }

  void _drawCascadeFloor(Canvas canvas, Size size, Color color) {
    final floorY = size.height * 0.85;
    final paint = Paint()
      ..shader = LinearGradient(
        colors: [
          color.withValues(alpha: 0.0),
          color.withValues(alpha: 0.3),
          color.withValues(alpha: 0.6),
          color.withValues(alpha: 0.3),
          color.withValues(alpha: 0.0),
        ],
      ).createShader(Rect.fromLTWH(0, floorY, size.width, 2.0))
      ..strokeWidth = 2.0
      ..style = PaintingStyle.stroke;

    canvas.drawLine(Offset(size.width * 0.1, floorY), Offset(size.width * 0.9, floorY), paint);
  }

  void _drawNebulaAmbient(Canvas canvas, Size size, double cx, double cy, Color color) {
    final radius = math.min(size.width, size.height) * 0.35;
    final paint = Paint()
      ..shader = RadialGradient(
        colors: [
          color.withValues(alpha: 0.2),
          color.withValues(alpha: 0.1),
          color.withValues(alpha: 0.0),
        ],
      ).createShader(Rect.fromCircle(center: Offset(cx, cy), radius: radius));

    canvas.drawCircle(Offset(cx, cy), radius, paint);
  }

  void _drawNeuralWeb(Canvas canvas, Size size, Color color) {
    if (particles.length < 2) return;

    final maxConnectDist = math.min(size.width, size.height) * 0.38;
    final nowSec = DateTime.now().millisecondsSinceEpoch / 1000.0;
    int edgeCount = 0;

    for (int i = 0; i < particles.length; i++) {
      for (int j = i + 1; j < particles.length; j++) {
        final p1 = particles[i];
        final p2 = particles[j];

        final dx = p1.x - p2.x;
        final dy = p1.y - p2.y;
        final dist = math.sqrt(dx * dx + dy * dy);

        if (dist <= maxConnectDist) {
          edgeCount++;
          final lineAlpha = (1.0 - dist / maxConnectDist) * 0.45 * math.min(p1.opacity, p2.opacity);
          final linePaint = Paint()
            ..color = color.withValues(alpha: lineAlpha)
            ..strokeWidth = 1.2
            ..style = PaintingStyle.stroke;

          canvas.drawLine(Offset(p1.x, p1.y), Offset(p2.x, p2.y), linePaint);

          if (edgeCount % 3 == 0) {
            final pulseProgress = (nowSec * 1.2 + edgeCount * 0.25) % 1.0;
            final px = p1.x + (p2.x - p1.x) * pulseProgress;
            final py = p1.y + (p2.y - p1.y) * pulseProgress;

            final pulsePaint = Paint()
              ..color = Colors.white.withValues(alpha: lineAlpha * 1.8)
              ..style = PaintingStyle.fill;

            canvas.drawCircle(Offset(px, py), 2.2, pulsePaint);
          }
        }
      }
    }
  }

  void _drawGlobeRings(Canvas canvas, Size size, double cx, double cy, Color color) {
    final paint = Paint()
      ..color = color.withValues(alpha: 0.2)
      ..strokeWidth = 1.0
      ..style = PaintingStyle.stroke;

    final rx = size.width * 0.32;
    final ry = size.height * 0.12;

    canvas.save();
    canvas.translate(cx, cy);
    canvas.rotate(-0.26); // -15 deg
    canvas.drawOval(Rect.fromCenter(center: Offset.zero, width: rx * 2, height: ry * 2), paint);
    canvas.restore();

    canvas.save();
    canvas.translate(cx, cy);
    canvas.rotate(0.26); // +15 deg
    canvas.drawOval(Rect.fromCenter(center: Offset.zero, width: rx * 2, height: ry * 4), paint);
    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant ParticlePainter oldDelegate) {
    return true;
  }
}
