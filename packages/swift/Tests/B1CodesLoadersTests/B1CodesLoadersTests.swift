import XCTest
import SwiftUI
@testable import B1CodesLoaders

final class B1CodesLoadersTests: XCTestCase {
    func testCanonicalConstants() {
        XCTAssertEqual(LoaderConstants.chromaticPulseDurationMs, 3200.0)
        XCTAssertEqual(LoaderConstants.chromaticEaseBezier.x1, 0.45)
        XCTAssertEqual(LoaderConstants.chromaticEaseBezier.y1, 0.0)
        XCTAssertEqual(LoaderConstants.chromaticEaseBezier.x2, 0.55)
        XCTAssertEqual(LoaderConstants.chromaticEaseBezier.y2, 1.0)
        XCTAssertEqual(LoaderConstants.chromaticOpacityMin, 0.55)
        XCTAssertEqual(LoaderConstants.chromaticOpacityMax, 1.0)
        XCTAssertEqual(LoaderConstants.dragResistance, 0.15)
        XCTAssertEqual(LoaderConstants.springStiffness, 180.0)
        XCTAssertEqual(LoaderConstants.springDamping, 12.0)
        XCTAssertEqual(LoaderConstants.thermalGlowTotalDurationMs, 350.0)
    }

    func testParticleMassTiers() {
        XCTAssertEqual(ParticleMassTier.dust.mass, 0.5)
        XCTAssertEqual(ParticleMassTier.dust.sizeRatio, 0.6)
        XCTAssertEqual(ParticleMassTier.dust.velocityRatio, 1.4)

        XCTAssertEqual(ParticleMassTier.motes.mass, 1.0)
        XCTAssertEqual(ParticleMassTier.motes.sizeRatio, 1.0)
        XCTAssertEqual(ParticleMassTier.motes.velocityRatio, 1.0)

        XCTAssertEqual(ParticleMassTier.cores.mass, 2.5)
        XCTAssertEqual(ParticleMassTier.cores.sizeRatio, 1.8)
        XCTAssertEqual(ParticleMassTier.cores.velocityRatio, 0.6)
    }

    func testRefractiveDepthLayers() {
        XCTAssertEqual(RefractiveDepthLayer.background.blurPx, 4.0)
        XCTAssertEqual(RefractiveDepthLayer.background.opacityMultiplier, 0.45)

        XCTAssertEqual(RefractiveDepthLayer.midground.blurPx, 1.0)
        XCTAssertEqual(RefractiveDepthLayer.midground.opacityMultiplier, 0.75)

        XCTAssertEqual(RefractiveDepthLayer.foreground.blurPx, 0.0)
        XCTAssertEqual(RefractiveDepthLayer.foreground.opacityMultiplier, 1.00)
    }

    func testParticleEngineSolver() {
        let engine = ParticleEngine(
            particleCount: 18,
            seed: 777
        )

        let initialStates = engine.getRenderState()
        XCTAssertEqual(initialStates.count, 18)

        engine.step(deltaTimeMs: 100.0)
        let nextStates = engine.getRenderState()
        XCTAssertEqual(nextStates.count, 18)
    }

    func testParticleEngineReducedMotion() {
        let engine = ParticleEngine(
            particleCount: 16,
            reducedMotion: true,
            width: 100,
            height: 100
        )

        let states = engine.getRenderState()
        XCTAssertEqual(states.count, 16)
        XCTAssertEqual(states[0].opacity, 1.0)
        XCTAssertEqual(states[0].blurPx, 0.0)
    }

    func testLoaderControllerLifecycle() {
        let controller = B1CodesLoaderController()

        XCTAssertFalse(controller.isPaused)
        XCTAssertFalse(controller.isResolving)

        controller.pause()
        XCTAssertTrue(controller.isPaused)

        controller.resume()
        XCTAssertFalse(controller.isPaused)

        controller.resolve()
        XCTAssertTrue(controller.isResolving)

        controller.reset()
        XCTAssertFalse(controller.isPaused)
        XCTAssertFalse(controller.isResolving)
    }

    func testSwiftUIViewsInstantiation() {
        let palette: [Color] = [.blue, .teal]

        let orbital = OrbitalLoader(palette: palette, size: CGSize(width: 64, height: 64))
        XCTAssertEqual(orbital.particleCount, 18)

        let nebula = NebulaLoader(palette: palette, particleCount: 30)
        XCTAssertEqual(nebula.particleCount, 30)

        let cascade = CascadeLoader(palette: palette, gravity: 1.2, wind: 0.8)
        XCTAssertEqual(cascade.gravity, 1.2)
        XCTAssertEqual(cascade.wind, 0.8)

        let neural = NeuralLoader(palette: palette, particleCount: 16)
        XCTAssertEqual(neural.particleCount, 16)
    }
}
