import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:b1codes_loaders/b1codes_loaders.dart';

void main() {
  group('Canonical Constants & Physics Spec', () {
    test('encodes Chromatic Pulse & interaction physics constants correctly', () {
      expect(LoaderConstants.chromaticPulseDurationMs, equals(3200));
      expect(LoaderConstants.chromaticEaseBezier, equals([0.45, 0.0, 0.55, 1.0]));
      expect(LoaderConstants.chromaticOpacityMin, equals(0.55));
      expect(LoaderConstants.chromaticOpacityMax, equals(1.0));
      expect(LoaderConstants.dragResistance, equals(0.15));
      expect(LoaderConstants.springStiffness, equals(180.0));
      expect(LoaderConstants.springDamping, equals(12.0));
      expect(LoaderConstants.thermalGlowExcitationMs, equals(50));
      expect(LoaderConstants.thermalGlowDissipationMs, equals(300));
      expect(LoaderConstants.thermalGlowTotalDurationMs, equals(350));
    });

    test('defines Particle Mass Tiers (dust, motes, cores)', () {
      expect(ParticleMassTier.dust.mass, equals(0.5));
      expect(ParticleMassTier.dust.sizeRatio, equals(0.6));
      expect(ParticleMassTier.dust.velocityRatio, equals(1.4));

      expect(ParticleMassTier.motes.mass, equals(1.0));
      expect(ParticleMassTier.motes.sizeRatio, equals(1.0));
      expect(ParticleMassTier.motes.velocityRatio, equals(1.0));

      expect(ParticleMassTier.cores.mass, equals(2.5));
      expect(ParticleMassTier.cores.sizeRatio, equals(1.8));
      expect(ParticleMassTier.cores.velocityRatio, equals(0.6));
    });

    test('defines Refractive Depth Layers (background, midground, foreground)', () {
      expect(RefractiveDepthLayer.background.blurPx, equals(4.0));
      expect(RefractiveDepthLayer.background.opacityMultiplier, equals(0.45));
      expect(RefractiveDepthLayer.background.scale, equals(0.75));

      expect(RefractiveDepthLayer.midground.blurPx, equals(1.0));
      expect(RefractiveDepthLayer.midground.opacityMultiplier, equals(0.75));
      expect(RefractiveDepthLayer.midground.scale, equals(0.90));

      expect(RefractiveDepthLayer.foreground.blurPx, equals(0.0));
      expect(RefractiveDepthLayer.foreground.opacityMultiplier, equals(1.00));
      expect(RefractiveDepthLayer.foreground.scale, equals(1.00));
    });
  });

  group('Particle Engine Solver & Chromatic Pulse', () {
    test('ParticleEngine outputs particle render state array per tick', () {
      final engine = ParticleEngine(
        particleCount: 18,
        seed: 123,
        palette: const [Color(0xFF4A90E2), Color(0xFF50E3C2)],
      );

      final state = engine.getRenderState();
      expect(state.length, equals(18));
      expect(state[0].color, equals(const Color(0xFF4A90E2)));

      engine.step(100.0);
      final nextState = engine.getRenderState();
      expect(nextState.length, equals(18));
    });

    test('outputs static grid layout in reduced-motion mode', () {
      final engine = ParticleEngine(
        particleCount: 16,
        width: 100,
        height: 100,
        reducedMotion: true,
      );

      final state = engine.getRenderState();
      expect(state.length, equals(16));
      expect(state[0].opacity, equals(1.0));
      expect(state[0].blurPx, equals(0.0));
    });
  });

  group('Widget Integration Tests', () {
    testWidgets('OrbitalLoader renders with RepaintBoundary and Semantics', (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: OrbitalLoader(
              palette: [Color(0xFF4A90E2), Color(0xFF50E3C2)],
              semanticsLabel: 'Orbital Loading',
            ),
          ),
        ),
      );

      expect(find.byType(OrbitalLoader), findsOneWidget);
      expect(find.byType(RepaintBoundary), findsAtLeastNWidgets(1));
      expect(find.bySemanticsLabel('Orbital Loading'), findsOneWidget);
    });

    testWidgets('NebulaLoader renders with custom palette and particleCount', (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: NebulaLoader(
              palette: [Color(0xFFFF007F), Color(0xFF00F0FF)],
              particleCount: 30,
              semanticsLabel: 'Nebula Loading',
            ),
          ),
        ),
      );

      expect(find.byType(NebulaLoader), findsOneWidget);
      expect(find.bySemanticsLabel('Nebula Loading'), findsOneWidget);
    });

    testWidgets('NeuralLoader renders with custom palette and particleCount', (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: NeuralLoader(
              palette: [Color(0xFF4A90E2), Color(0xFF50E3C2)],
              particleCount: 16,
              semanticsLabel: 'Neural Loading',
            ),
          ),
        ),
      );

      expect(find.byType(NeuralLoader), findsOneWidget);
      expect(find.bySemanticsLabel('Neural Loading'), findsOneWidget);
    });

    testWidgets('CascadeLoader responds to B1CodesLoaderController resolve and pause methods', (WidgetTester tester) async {
      final controller = B1CodesLoaderController();

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: CascadeLoader(
              controller: controller,
              palette: const [Color(0xFF4A90E2), Color(0xFF50E3C2)],
              semanticsLabel: 'Cascade Loading',
            ),
          ),
        ),
      );

      expect(controller.isPaused, isFalse);
      expect(controller.isResolving, isFalse);

      controller.pause();
      expect(controller.isPaused, isTrue);

      controller.resume();
      expect(controller.isPaused, isFalse);

      controller.resolve();
      expect(controller.isResolving, isTrue);
    });
  });
}
