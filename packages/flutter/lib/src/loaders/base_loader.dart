import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../core/constants.dart';
import '../core/particle_engine.dart';
import '../painter/particle_painter.dart';
import 'b1codes_loader_controller.dart';

class BaseLoaderWidget extends StatefulWidget {
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
  final String variant;

  const BaseLoaderWidget({
    super.key,
    required this.palette,
    required this.size,
    required this.particleCount,
    required this.speed,
    required this.intensity,
    required this.depth,
    this.backgroundColor,
    required this.semanticsLabel,
    this.onCycleComplete,
    this.onDismiss,
    this.reducedMotion,
    this.controller,
    required this.variant,
  });

  @override
  State<BaseLoaderWidget> createState() => _BaseLoaderWidgetState();
}

class _BaseLoaderWidgetState extends State<BaseLoaderWidget>
    with SingleTickerProviderStateMixin {
  late AnimationController _animController;
  late ParticleEngine _engine;

  double _elapsedMs = 0;
  int _lastCycle = 0;
  int _lastTickMs = 0;

  bool _isThermalActive = false;
  double _thermalStartTime = 0;
  double _thermalProgress = 0;

  @override
  void initState() {
    super.initState();

    _animController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 1),
    )..repeat();

    _lastTickMs = DateTime.now().millisecondsSinceEpoch;

    widget.controller?.addListener(_onControllerChanged);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _initEngine();
  }

  @override
  void didUpdateWidget(BaseLoaderWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.controller != widget.controller) {
      oldWidget.controller?.removeListener(_onControllerChanged);
      widget.controller?.addListener(_onControllerChanged);
    }
    _initEngine();
  }

  void _initEngine() {
    final isReducedMotion = widget.reducedMotion ??
        MediaQuery.of(context).disableAnimations;

    _engine = ParticleEngine(
      particleCount: widget.particleCount,
      palette: widget.palette,
      speed: widget.speed,
      intensity: widget.intensity,
      depth: widget.depth,
      reducedMotion: isReducedMotion,
      width: widget.size.width,
      height: widget.size.height,
    );
  }

  void _onControllerChanged() {
    final ctrl = widget.controller;
    if (ctrl == null) return;

    if (ctrl.isPaused) {
      _engine.pause();
      if (_animController.isAnimating) _animController.stop();
    } else {
      _engine.resume();
      if (!_animController.isAnimating && !_isThermalActive) {
        _animController.repeat();
      }
    }

    if (ctrl.isResolving && !_isThermalActive) {
      final isReducedMotion = widget.reducedMotion ??
          MediaQuery.of(context).disableAnimations;
      if (isReducedMotion) {
        widget.onDismiss?.call();
      } else {
        _isThermalActive = true;
        _thermalStartTime = _elapsedMs;
      }
    }
  }

  @override
  void dispose() {
    widget.controller?.removeListener(_onControllerChanged);
    _animController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isReducedMotion = widget.reducedMotion ??
        MediaQuery.of(context).disableAnimations;

    return Semantics(
      label: widget.semanticsLabel,
      image: true,
      child: RepaintBoundary(
        child: Container(
          width: widget.size.width,
          height: widget.size.height,
          color: widget.backgroundColor ?? Colors.transparent,
          child: AnimatedBuilder(
            animation: _animController,
            builder: (context, child) {
              if (isReducedMotion) {
                return CustomPaint(
                  size: widget.size,
                  painter: ParticlePainter(
                    particles: _engine.getRenderState(),
                    variant: widget.variant,
                    intensity: widget.intensity,
                    backgroundColor: widget.backgroundColor,
                    isThermalActive: false,
                    thermalProgress: 0,
                    reducedMotion: true,
                  ),
                );
              }

              final nowMs = DateTime.now().millisecondsSinceEpoch;
              final dt = (nowMs - _lastTickMs).toDouble().clamp(0.0, 64.0);
              _lastTickMs = nowMs;

              if (!_engine.isPaused()) {
                _elapsedMs += dt * widget.speed;

                final cycleDuration =
                    LoaderConstants.chromaticPulseDurationMs / math.max(0.1, widget.speed);
                final currentCycle = (_elapsedMs / cycleDuration).floor();

                if (currentCycle > _lastCycle) {
                  _lastCycle = currentCycle;
                  widget.onCycleComplete?.call();
                }

                if (_isThermalActive) {
                  final elapsedThermal = _elapsedMs - _thermalStartTime;
                  _thermalProgress =
                      (elapsedThermal / LoaderConstants.thermalGlowTotalDurationMs)
                          .clamp(0.0, 1.0);

                  if (_thermalProgress >= 1.0) {
                    _animController.stop();
                    widget.onDismiss?.call();
                  }
                }

                _engine.step(dt);
              }

              return CustomPaint(
                size: widget.size,
                painter: ParticlePainter(
                  particles: _engine.getRenderState(),
                  variant: widget.variant,
                  intensity: widget.intensity,
                  backgroundColor: widget.backgroundColor,
                  isThermalActive: _isThermalActive,
                  thermalProgress: _thermalProgress,
                  reducedMotion: false,
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}
