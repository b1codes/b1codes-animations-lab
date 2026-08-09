import Foundation
import SwiftUI

public struct ParticleRenderState: Identifiable {
    public let id: Int
    public let x: Double
    public let y: Double
    public let scale: Double
    public let opacity: Double
    public let color: Color
    public let blurPx: Double
    public let layer: String

    public init(
        id: Int,
        x: Double,
        y: Double,
        scale: Double,
        opacity: Double,
        color: Color,
        blurPx: Double,
        layer: String
    ) {
        self.id = id
        self.x = x
        self.y = y
        self.scale = scale
        self.opacity = opacity
        self.color = color
        self.blurPx = blurPx
        self.layer = layer
    }
}

private class InternalParticle {
    let id: Int
    var x: Double
    var y: Double
    var vx: Double
    var vy: Double
    var baseX: Double
    var baseY: Double
    let massTier: ParticleMassTier
    let depthLayer: RefractiveDepthLayer
    let phaseOffset: Double

    init(
        id: Int,
        x: Double,
        y: Double,
        vx: Double,
        vy: Double,
        baseX: Double,
        baseY: Double,
        massTier: ParticleMassTier,
        depthLayer: RefractiveDepthLayer,
        phaseOffset: Double
    ) {
        self.id = id
        self.x = x
        self.y = y
        self.vx = vx
        self.vy = vy
        self.baseX = baseX
        self.baseY = baseY
        self.massTier = massTier
        self.depthLayer = depthLayer
        self.phaseOffset = phaseOffset
    }
}

private class SwiftPRNG {
    private var state: UInt32

    init(seed: UInt32) {
        self.state = seed
    }

    func next() -> Double {
        state = state &+ 0x6d2b79f5
        var t = state
        t = (t ^ (t >> 15)) &* (t | 1)
        t = (t ^ (t >> 7)) &* (t | 61)
        let val = UInt32(t ^ (t >> 14))
        return Double(val) / 4294967296.0
    }

    func range(min: Double, max: Double) -> Double {
        return min + next() * (max - min)
    }
}

public class ParticleEngine {
    public var particleCount: Int
    public var palette: [Color]
    public var speed: Double
    public var intensity: Double
    public var depth: Bool
    public var reducedMotion: Bool
    public var width: Double
    public var height: Double
    public var seed: UInt32?

    private var prng: SwiftPRNG
    private var chromaticPulse: ChromaticPulse
    private var particles: [InternalParticle] = []
    private var cachedRenderState: [ParticleRenderState] = []
    private var elapsedMs: Double = 0
    private var paused: Bool = false

    public init(
        particleCount: Int = 24,
        palette: [Color] = [Color.blue, Color.teal, Color.purple],
        speed: Double = 1.0,
        intensity: Double = 0.7,
        depth: Bool = true,
        reducedMotion: Bool = false,
        width: Double = 48.0,
        height: Double = 48.0,
        seed: UInt32? = nil
    ) {
        self.particleCount = particleCount
        self.palette = palette
        self.speed = speed
        self.intensity = intensity
        self.depth = depth
        self.reducedMotion = reducedMotion
        self.width = width
        self.height = height
        self.seed = seed

        let s = seed ?? UInt32.random(in: 0..<1_000_000)
        self.prng = SwiftPRNG(seed: s)
        self.chromaticPulse = ChromaticPulse(palette: palette, reducedMotion: reducedMotion)

        initParticles()
        self.cachedRenderState = computeRenderState()
    }

    private func initParticles() {
        let cx = width / 2.0
        let cy = height / 2.0

        let massTiers = [
            ParticleMassTier.cores,
            ParticleMassTier.motes,
            ParticleMassTier.dust
        ]

        let depthLayers = [
            RefractiveDepthLayer.background,
            RefractiveDepthLayer.midground,
            RefractiveDepthLayer.foreground
        ]

        particles = []

        for i in 0..<particleCount {
            let tierIndex = i % 10 < 2 ? 0 : i % 10 < 7 ? 1 : 2
            let massTier = massTiers[tierIndex]

            let layerIndex = depth ? (i % 3) : 2
            let depthLayer = depthLayers[layerIndex]

            let angle = prng.range(min: 0, max: .pi * 2.0)
            let radius = prng.range(min: width * 0.1, max: width * 0.4)
            let px = cx + cos(angle) * radius
            let py = cy + sin(angle) * radius

            let speedMag = (15.0 / massTier.mass) * (0.8 + prng.next() * 0.4)
            let vx = -sin(angle) * speedMag
            let vy = cos(angle) * speedMag

            particles.append(InternalParticle(
                id: i,
                x: px,
                y: py,
                vx: vx,
                vy: vy,
                baseX: px,
                baseY: py,
                massTier: massTier,
                depthLayer: depthLayer,
                phaseOffset: prng.range(min: 0, max: .pi * 2.0)
            ))
        }
    }

    private func computeReducedMotionState() -> [ParticleRenderState] {
        let cols = Int(ceil(sqrt(Double(particleCount))))
        let rows = Int(ceil(Double(particleCount) / Double(cols)))
        let cellW = width / Double(cols)
        let cellH = height / Double(rows)
        let baseColor = palette.first ?? Color.white

        var states: [ParticleRenderState] = []
        for i in 0..<particleCount {
            let col = i % cols
            let row = i / cols
            let x = (Double(col) + 0.5) * cellW
            let y = (Double(row) + 0.5) * cellH

            states.append(ParticleRenderState(
                id: i,
                x: x,
                y: y,
                scale: 1.0,
                opacity: 1.0,
                color: baseColor,
                blurPx: 0.0,
                layer: "foreground"
            ))
        }
        return states
    }

    private func computeRenderState() -> [ParticleRenderState] {
        if reducedMotion {
            return computeReducedMotionState()
        }

        let pulseState = chromaticPulse.evaluateAt(elapsedMs: elapsedMs)
        let dtSec = 0.016 * speed
        let cx = width / 2.0
        let cy = height / 2.0

        var renderStates: [ParticleRenderState] = []

        for p in particles {
            let dx = cx - p.x
            let dy = cy - p.y
            let dist = sqrt(dx * dx + dy * dy)
            let safeDist = dist == 0 ? 1.0 : dist

            let forceMag = (20.0 / p.massTier.mass) * (safeDist / (width * 0.5))
            let fx = (dx / safeDist) * forceMag
            let fy = (dy / safeDist) * forceMag

            p.vx = (p.vx + fx * dtSec) * (1.0 - LoaderConstants.dragResistance * dtSec)
            p.vy = (p.vy + fy * dtSec) * (1.0 - LoaderConstants.dragResistance * dtSec)

            p.x += p.vx * p.massTier.velocityRatio * dtSec
            p.y += p.vy * p.massTier.velocityRatio * dtSec

            let baseScale = p.massTier.sizeRatio * intensity
            let finalScale = baseScale * p.depthLayer.scale

            let shimmer = 0.85 + 0.15 * sin(elapsedMs * 0.003 * p.massTier.shimmerRate + p.phaseOffset)
            let finalOpacity = pulseState.opacity * p.depthLayer.opacityMultiplier * shimmer

            renderStates.append(ParticleRenderState(
                id: p.id,
                x: p.x,
                y: p.y,
                scale: max(0.1, finalScale),
                opacity: max(0.0, min(1.0, finalOpacity)),
                color: pulseState.color,
                blurPx: p.depthLayer.blurPx,
                layer: p.depthLayer.layer
            ))
        }

        return renderStates
    }

    @discardableResult
    public func step(deltaTimeMs: Double) -> [ParticleRenderState] {
        if paused { return cachedRenderState }
        elapsedMs += deltaTimeMs * speed
        cachedRenderState = computeRenderState()
        return cachedRenderState
    }

    public func pause() {
        paused = true
    }

    public func resume() {
        paused = false
    }

    public func isPaused() -> Bool {
        return paused
    }

    public func reset() {
        elapsedMs = 0
        let s = seed ?? UInt32.random(in: 0..<1_000_000)
        prng = SwiftPRNG(seed: s)
        initParticles()
        cachedRenderState = computeRenderState()
    }

    public func getRenderState() -> [ParticleRenderState] {
        return cachedRenderState
    }
}
