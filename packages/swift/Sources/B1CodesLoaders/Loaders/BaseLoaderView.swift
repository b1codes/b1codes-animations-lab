import SwiftUI

public struct BaseLoaderView: View {
    public let palette: [Color]
    public let size: CGSize
    public let particleCount: Int
    public let speed: Double
    public let intensity: Double
    public let depth: Bool
    public let backgroundColor: Color
    public let accessibilityLabel: String
    public let onCycleComplete: (() -> Void)?
    public let onDismiss: (() -> Void)?
    public let reducedMotion: Bool?
    @ObservedObject public var controller: B1CodesLoaderController
    public let variant: String

    @Environment(\.accessibilityReduceMotion) private var systemReduceMotion

    @State private var engine: ParticleEngine?
    @State private var elapsedMs: Double = 0
    @State private var lastCycle: Int = 0
    @State private var isThermalActive: Bool = false
    @State private var thermalStartTime: Double = 0
    @State private var thermalProgress: Double = 0

    public init(
        palette: [Color],
        size: CGSize = CGSize(width: 48, height: 48),
        particleCount: Int,
        speed: Double = 1.0,
        intensity: Double = 0.7,
        depth: Bool = true,
        backgroundColor: Color = .clear,
        accessibilityLabel: String = "Loading",
        onCycleComplete: (() -> Void)? = nil,
        onDismiss: (() -> Void)? = nil,
        reducedMotion: Bool? = nil,
        controller: B1CodesLoaderController? = nil,
        variant: String
    ) {
        self.palette = palette
        self.size = size
        self.particleCount = particleCount
        self.speed = speed
        self.intensity = intensity
        self.depth = depth
        self.backgroundColor = backgroundColor
        self.accessibilityLabel = accessibilityLabel
        self.onCycleComplete = onCycleComplete
        self.onDismiss = onDismiss
        self.reducedMotion = reducedMotion
        self._controller = ObservedObject(wrappedValue: controller ?? B1CodesLoaderController())
        self.variant = variant
    }

    private var isReducedMotionActive: Bool {
        reducedMotion ?? systemReduceMotion
    }

    public var body: some View {
        ZStack {
            if isReducedMotionActive {
                if let engine = engine {
                    drawCanvas(context: nil, canvasSize: size, particles: engine.getRenderState(), isReduced: true)
                }
            } else {
                TimelineView(.animation) { timeline in
                    Canvas { context, canvasSize in
                        let now = timeline.date.timeIntervalSince1970
                        let particles = updateEngine(now: now)
                        renderParticles(context: context, canvasSize: canvasSize, particles: particles)
                    }
                }
                .drawingGroup()
            }
        }
        .frame(width: size.width, height: size.height)
        .background(backgroundColor)
        .accessibilityLabel(Text(accessibilityLabel))
        .accessibilityAddTraits(.isImage)
        .onAppear {
            setupEngine()
        }
        .onChange(of: controller.isResolving) { resolving in
            if resolving && !isThermalActive {
                if isReducedMotionActive {
                    onDismiss?()
                } else {
                    isThermalActive = true
                    thermalStartTime = elapsedMs
                }
            }
        }
        .onChange(of: controller.isPaused) { paused in
            if paused {
                engine?.pause()
            } else {
                engine?.resume()
            }
        }
    }

    private func setupEngine() {
        let eng = ParticleEngine(
            particleCount: particleCount,
            palette: palette,
            speed: speed,
            intensity: intensity,
            depth: depth,
            reducedMotion: isReducedMotionActive,
            width: Double(size.width),
            height: Double(size.height)
        )
        self.engine = eng
    }

    private func updateEngine(now: TimeInterval) -> [ParticleRenderState] {
        guard let engine = engine else { return [] }

        if !controller.isPaused {
            let dt = 16.0 * speed
            elapsedMs += dt

            let cycleDuration = LoaderConstants.chromaticPulseDurationMs / max(0.1, speed)
            let currentCycle = Int(floor(elapsedMs / cycleDuration))

            if currentCycle > lastCycle {
                DispatchQueue.main.async {
                    lastCycle = currentCycle
                    onCycleComplete?()
                }
            }

            if isThermalActive {
                let elapsedThermal = elapsedMs - thermalStartTime
                let progress = min(1.0, elapsedThermal / LoaderConstants.thermalGlowTotalDurationMs)
                DispatchQueue.main.async {
                    thermalProgress = progress
                }

                if progress >= 1.0 {
                    DispatchQueue.main.async {
                        onDismiss?()
                    }
                    return []
                }
            }

            return engine.step(deltaTimeMs: 16.0)
        }

        return engine.getRenderState()
    }

    private func renderParticles(context: GraphicsContext, canvasSize: CGSize, particles: [ParticleRenderState]) {
        let width = Double(canvasSize.width)
        let height = Double(canvasSize.height)
        let cx = width / 2.0
        let cy = height / 2.0

        // Variant Ambient Elements
        if !isReducedMotionActive && !isThermalActive, let firstColor = particles.first?.color {
            if variant == "orbital" {
                let maxRadius = min(width, height) * 0.2
                var bgContext = context
                bgContext.opacity = 0.35
                bgContext.fill(
                    Path(ellipseIn: CGRect(x: cx - maxRadius, y: cy - maxRadius, width: maxRadius * 2, height: maxRadius * 2)),
                    with: .radialGradient(
                        Gradient(colors: [firstColor, firstColor.opacity(0.1), Color.clear]),
                        center: CGPoint(x: cx, y: cy),
                        startRadius: 0,
                        endRadius: maxRadius
                    )
                )

                var dotContext = context
                dotContext.opacity = 0.9
                dotContext.fill(
                    Path(ellipseIn: CGRect(x: cx - 3, y: cy - 3, width: 6, height: 6)),
                    with: .color(firstColor)
                )
            } else if variant == "cascade" {
                let floorY = height * 0.85
                var floorContext = context
                floorContext.opacity = 0.3
                let linePath = Path { p in
                    p.move(to: CGPoint(x: width * 0.1, y: floorY))
                    p.addLine(to: CGPoint(x: width * 0.9, y: floorY))
                }
                floorContext.stroke(linePath, with: .color(firstColor), lineWidth: 2.0)
            } else if variant == "neural" {
                let maxConnectDist = min(width, height) * 0.38
                let now = Date().timeIntervalSince1970
                var edgeCount = 0
                for i in 0..<particles.count {
                    for j in (i + 1)..<particles.count {
                        let p1 = particles[i]
                        let p2 = particles[j]
                        let dx = p1.x - p2.x
                        let dy = p1.y - p2.y
                        let dist = sqrt(dx * dx + dy * dy)
                        if dist <= maxConnectDist {
                            edgeCount += 1
                            let alpha = (1.0 - dist / maxConnectDist) * 0.45 * min(p1.opacity, p2.opacity)
                            var lineContext = context
                            lineContext.opacity = alpha
                            let path = Path { p in
                                p.move(to: CGPoint(x: p1.x, y: p1.y))
                                p.addLine(to: CGPoint(x: p2.x, y: p2.y))
                            }
                            lineContext.stroke(path, with: .color(firstColor), lineWidth: 1.2)

                            if edgeCount % 3 == 0 {
                                let progress = (now * 1.2 + Double(edgeCount) * 0.25).truncatingRemainder(dividingBy: 1.0)
                                let px = p1.x + (p2.x - p1.x) * progress
                                let py = p1.y + (p2.y - p1.y) * progress
                                var pulseContext = context
                            if edgeCount % 3 == 0 {
                                let progress = (now * 1.2 + Double(edgeCount) * 0.25).truncatingRemainder(dividingBy: 1.0)
                                let px = p1.x + (p2.x - p1.x) * progress
                                let py = p1.y + (p2.y - p1.y) * progress
                                var pulseContext = context
                                pulseContext.opacity = alpha * 1.8
                                let pulseRect = CGRect(x: px - 2.2, y: py - 2.2, width: 4.4, height: 4.4)
                                pulseContext.fill(Path(ellipseIn: pulseRect), with: .color(.white))
                            }
                        }
                    }
                }
            } else if variant == "globe" {
                var ringContext = context
                ringContext.opacity = 0.2
                let rx = width * 0.32
                let ry = height * 0.12
                let ring1 = Path(ellipseIn: CGRect(x: cx - rx, y: cy - ry, width: rx * 2, height: ry * 2))
                let ring2 = Path(ellipseIn: CGRect(x: cx - rx, y: cy - ry * 2, width: rx * 2, height: ry * 4))
                ringContext.stroke(ring1, with: .color(firstColor), lineWidth: 1.0)
                ringContext.stroke(ring2, with: .color(firstColor), lineWidth: 1.0)
            }
        }

        // Layer Sorting
        let layerOrder = ["background": 0, "midground": 1, "foreground": 2]
        let sorted = particles.sorted { (layerOrder[$0.layer] ?? 1) < (layerOrder[$1.layer] ?? 1) }

        for p in sorted {
            var drawX = p.x
            var drawY = p.y
            var drawColor = p.color
            var drawOpacity = p.opacity

            let baseRadius = max(1.5, 3.5 * p.scale * (intensity / 0.7))

            if isThermalActive {
                let t = thermalProgress
                let dx = p.x - cx
                let dy = p.y - cy
                let dist = sqrt(dx * dx + dy * dy)
                let safeDist = dist == 0 ? 1.0 : dist
                let easedT = 1.0 - pow(1.0 - t, 4.0)
                let scatterMag = safeDist * (1.0 + easedT * 1.8)

                drawX = cx + (dx / safeDist) * scatterMag
                drawY = cy + (dy / safeDist) * scatterMag

                drawColor = lerpColor(
                    from: LoaderConstants.thermalGlowSpectrum[0],
                    to: LoaderConstants.thermalGlowSpectrum[1],
                    fraction: t
                )
                drawOpacity = max(0.0, p.opacity * (1.0 - t))
            }

            if drawOpacity <= 0.001 { continue }

            var pContext = context
            pContext.opacity = drawOpacity

            if p.blurPx > 0.0 {
                pContext.addFilter(.blur(radius: p.blurPx))
            }

            // Outer Glow Halo for Foreground/Midground
            if p.layer == "foreground" || p.layer == "midground" {
                let glowRadius = baseRadius * (p.layer == "foreground" ? 3.0 : 2.0)
                let haloRect = CGRect(x: drawX - glowRadius, y: drawY - glowRadius, width: glowRadius * 2, height: glowRadius * 2)

                pContext.fill(
                    Path(ellipseIn: haloRect),
                    with: .radialGradient(
                        Gradient(colors: [drawColor, drawColor.opacity(0.3), Color.clear]),
                        center: CGPoint(x: drawX, y: drawY),
                        startRadius: 0,
                        endRadius: glowRadius
                    )
                )
            }

            // Crisp Core Circle
            let rect = CGRect(x: drawX - baseRadius, y: drawY - baseRadius, width: baseRadius * 2, height: baseRadius * 2)
            pContext.fill(Path(ellipseIn: rect), with: .color(drawColor))
        }
    }

    private func drawCanvas(context: GraphicsContext?, canvasSize: CGSize, particles: [ParticleRenderState], isReduced: Bool) -> some View {
        Canvas { ctx, cSize in
            renderParticles(context: ctx, canvasSize: cSize, particles: particles)
        }
    }
}
