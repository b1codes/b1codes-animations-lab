import 'dart:math' as math;
import 'dart:ui';
import 'constants.dart';
import 'chromatic_pulse.dart';

class ParticleRenderState {
  final int id;
  final double x;
  final double y;
  final double scale;
  final double opacity;
  final Color color;
  final double blurPx;
  final String layer;

  const ParticleRenderState({
    required this.id,
    required this.x,
    required this.y,
    required this.scale,
    required this.opacity,
    required this.color,
    required this.blurPx,
    required this.layer,
  });
}

class _InternalParticle {
  final int id;
  double x;
  double y;
  double vx;
  double vy;
  double baseX;
  double baseY;
  final ParticleMassTier massTier;
  final RefractiveDepthLayer depthLayer;
  final double phaseOffset;

  _InternalParticle({
    required this.id,
    required this.x,
    required this.y,
    required this.vx,
    required this.vy,
    required this.baseX,
    required this.baseY,
    required this.massTier,
    required this.depthLayer,
    required this.phaseOffset,
  });
}

class _PRNG {
  int state;

  _PRNG(int seed) : state = seed & 0xFFFFFFFF;

  double next() {
    state = (state + 0x6d2b79f5) & 0xFFFFFFFF;
    int t = state;
    t = (t ^ (t >> 15)) * (t | 1);
    t = (t ^ (t >> 7)) * (t | 61);
    return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296.0;
  }

  double range(double min, double max) {
    return min + next() * (max - min);
  }
}

class ParticleEngine {
  int particleCount;
  List<Color> palette;
  double speed;
  double intensity;
  bool depth;
  bool reducedMotion;
  double width;
  double height;
  int? seed;

  late _PRNG _prng;
  late ChromaticPulse _chromaticPulse;
  List<_InternalParticle> _particles = [];
  List<ParticleRenderState> _cachedRenderState = [];
  double _elapsedMs = 0;
  bool _paused = false;

  ParticleEngine({
    this.particleCount = 24,
    List<Color>? palette,
    this.speed = 1.0,
    this.intensity = 0.7,
    this.depth = true,
    this.reducedMotion = false,
    this.width = 48.0,
    this.height = 48.0,
    this.seed,
  }) : palette = palette ?? const [Color(0xFF4A90E2), Color(0xFF50E3C2), Color(0xFF9013FE)] {
    final initialSeed = seed ?? math.Random().nextInt(1000000);
    _prng = _PRNG(initialSeed);

    _chromaticPulse = ChromaticPulse(
      palette: this.palette,
      reducedMotion: reducedMotion,
    );

    _initParticles();
    _cachedRenderState = _computeRenderState();
  }

  void _initParticles() {
    final cx = width / 2;
    final cy = height / 2;

    final massTiers = [
      ParticleMassTier.cores,
      ParticleMassTier.motes,
      ParticleMassTier.dust,
    ];

    final depthLayers = [
      RefractiveDepthLayer.background,
      RefractiveDepthLayer.midground,
      RefractiveDepthLayer.foreground,
    ];

    _particles = [];

    for (int i = 0; i < particleCount; i++) {
      final tierIndex = i % 10 < 2 ? 0 : i % 10 < 7 ? 1 : 2;
      final massTier = massTiers[tierIndex];

      final layerIndex = depth ? (i % 3) : 2;
      final depthLayer = depthLayers[layerIndex];

      final angle = _prng.range(0, math.pi * 2);
      final radius = _prng.range(width * 0.1, width * 0.4);
      final px = cx + math.cos(angle) * radius;
      final py = cy + math.sin(angle) * radius;

      final speedMag = (15.0 / massTier.mass) * (0.8 + _prng.next() * 0.4);
      final vx = -math.sin(angle) * speedMag;
      final vy = math.cos(angle) * speedMag;

      _particles.add(_InternalParticle(
        id: i,
        x: px,
        y: py,
        vx: vx,
        vy: vy,
        baseX: px,
        baseY: py,
        massTier: massTier,
        depthLayer: depthLayer,
        phaseOffset: _prng.range(0, math.pi * 2),
      ));
    }
  }

  List<ParticleRenderState> _computeReducedMotionState() {
    final cols = math.sqrt(particleCount).ceil();
    final rows = (particleCount / cols).ceil();
    final cellW = width / cols;
    final cellH = height / rows;
    final baseColor = palette.isNotEmpty ? palette[0] : const Color(0xFFFFFFFF);

    final states = <ParticleRenderState>[];
    for (int i = 0; i < particleCount; i++) {
      final col = i % cols;
      final row = i ~/ cols;
      final x = (col + 0.5) * cellW;
      final y = (row + 0.5) * cellH;

      states.add(ParticleRenderState(
        id: i,
        x: x,
        y: y,
        scale: 1.0,
        opacity: 1.0,
        color: baseColor,
        blurPx: 0.0,
        layer: 'foreground',
      ));
    }
    return states;
  }

  List<ParticleRenderState> _computeRenderState() {
    if (reducedMotion) {
      return _computeReducedMotionState();
    }

    final pulseState = _chromaticPulse.evaluateAt(_elapsedMs);
    final dtSec = 0.016 * speed;
    final cx = width / 2;
    final cy = height / 2;

    final renderStates = <ParticleRenderState>[];

    for (int i = 0; i < _particles.length; i++) {
      final p = _particles[i];

      final dx = cx - p.x;
      final dy = cy - p.y;
      final dist = math.sqrt(dx * dx + dy * dy);
      final safeDist = dist == 0 ? 1.0 : dist;

      final forceMag = (20.0 / p.massTier.mass) * (safeDist / (width * 0.5));
      final fx = (dx / safeDist) * forceMag;
      final fy = (dy / safeDist) * forceMag;

      p.vx = (p.vx + fx * dtSec) * (1.0 - LoaderConstants.dragResistance * dtSec);
      p.vy = (p.vy + fy * dtSec) * (1.0 - LoaderConstants.dragResistance * dtSec);

      p.x += p.vx * p.massTier.velocityRatio * dtSec;
      p.y += p.vy * p.massTier.velocityRatio * dtSec;

      final baseScale = p.massTier.sizeRatio * intensity;
      final finalScale = baseScale * p.depthLayer.scale;

      final shimmer = 0.85 + 0.15 * math.sin(_elapsedMs * 0.003 * p.massTier.shimmerRate + p.phaseOffset);
      final finalOpacity = pulseState.opacity * p.depthLayer.opacityMultiplier * shimmer;

      renderStates.add(ParticleRenderState(
        id: p.id,
        x: p.x,
        y: p.y,
        scale: math.max(0.1, finalScale),
        opacity: finalOpacity.clamp(0.0, 1.0),
        color: pulseState.color,
        blurPx: p.depthLayer.blurPx,
        layer: p.depthLayer.layer,
      ));
    }

    return renderStates;
  }

  List<ParticleRenderState> step(double deltaTimeMs) {
    if (_paused) return _cachedRenderState;
    _elapsedMs += deltaTimeMs * speed;
    _cachedRenderState = _computeRenderState();
    return _cachedRenderState;
  }

  void pause() {
    _paused = true;
  }

  void resume() {
    _paused = false;
  }

  bool isPaused() => _paused;

  void reset() {
    _elapsedMs = 0;
    final s = seed ?? math.Random().nextInt(1000000);
    _prng = _PRNG(s);
    _initParticles();
    _cachedRenderState = _computeRenderState();
  }

  List<ParticleRenderState> getRenderState() => _cachedRenderState;
}
