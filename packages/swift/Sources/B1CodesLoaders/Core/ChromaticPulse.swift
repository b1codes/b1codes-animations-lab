import SwiftUI

public struct ChromaticPulseState {
    public let color: Color
    public let opacity: Double
    public let progress: Double

    public init(color: Color, opacity: Double, progress: Double) {
        self.color = color
        self.opacity = opacity
        self.progress = progress
    }
}

/// Solves cubic bezier curve Y for progress t [0, 1].
public func solveCubicBezier(
    t: Double,
    x1: Double = 0.45,
    y1: Double = 0.0,
    x2: Double = 0.55,
    y2: Double = 1.0
) -> Double {
    if t <= 0 { return 0.0 }
    if t >= 1 { return 1.0 }

    var u = t
    for _ in 0..<8 {
        let oneMinusU = 1.0 - u
        let x = 3 * oneMinusU * oneMinusU * u * x1 + 3 * oneMinusU * u * u * x2 + u * u * u
        let dx = 3 * oneMinusU * oneMinusU * x1 + 6 * oneMinusU * u * (x2 - x1) + 3 * u * u * (1 - x2)
        if abs(dx) < 1e-6 { break }
        u -= (x - t) / dx
        u = max(0.0, min(1.0, u))
    }

    let oneMinusU = 1.0 - u
    return 3 * oneMinusU * oneMinusU * u * y1 + 3 * oneMinusU * u * u * y2 + u * u * u
}

/// Linear interpolation between two SwiftUI Colors.
public func lerpColor(from colorA: Color, to colorB: Color, fraction: Double) -> Color {
    let t = max(0.0, min(1.0, fraction))

    #if canImport(UIKit)
    let nativeA = UIColor(colorA)
    let nativeB = UIColor(colorB)
    #elseif canImport(AppKit)
    let nativeA = NSColor(colorA).usingColorSpace(.sRGB) ?? NSColor(colorA)
    let nativeB = NSColor(colorB).usingColorSpace(.sRGB) ?? NSColor(colorB)
    #endif

    var rA: CGFloat = 0, gA: CGFloat = 0, bA: CGFloat = 0, aA: CGFloat = 0
    var rB: CGFloat = 0, gB: CGFloat = 0, bB: CGFloat = 0, aB: CGFloat = 0

    nativeA.getRed(&rA, green: &gA, blue: &bA, alpha: &aA)
    nativeB.getRed(&rB, green: &gB, blue: &bB, alpha: &aB)

    let r = rA + (rB - rA) * CGFloat(t)
    let g = gA + (gB - gA) * CGFloat(t)
    let b = bA + (bB - bA) * CGFloat(t)
    let a = aA + (aB - aA) * CGFloat(t)

    return Color(red: Double(r), green: Double(g), blue: Double(b), opacity: Double(a))
}

/// Chromatic Pulse color cycle engine in Swift.
public class ChromaticPulse {
    public var palette: [Color]
    public var durationMs: Double
    public var reducedMotion: Bool

    public init(
        palette: [Color],
        durationMs: Double = LoaderConstants.chromaticPulseDurationMs,
        reducedMotion: Bool = false
    ) {
        self.palette = palette.count >= 2 ? palette : [Color.blue, Color.teal]
        self.durationMs = durationMs
        self.reducedMotion = reducedMotion
    }

    public func updateConfig(palette: [Color]? = nil, durationMs: Double? = nil, reducedMotion: Bool? = nil) {
        if let palette = palette, palette.count >= 2 {
            self.palette = palette
        }
        if let durationMs = durationMs { self.durationMs = durationMs }
        if let reducedMotion = reducedMotion { self.reducedMotion = reducedMotion }
    }

    public func evaluateAt(elapsedMs: Double) -> ChromaticPulseState {
        if reducedMotion {
            return ChromaticPulseState(
                color: palette[0],
                opacity: 1.0,
                progress: 0.0
            )
        }

        let totalDuration = max(1.0, durationMs)
        let progress = (elapsedMs.truncatingRemainder(dividingBy: totalDuration)) / totalDuration

        let count = palette.count
        let scaledProgress = progress * Double(count)
        let index = Int(floor(scaledProgress))
        let nextIndex = (index + 1) % count
        let segmentProgress = scaledProgress - Double(index)

        let easedSegment = solveCubicBezier(
            t: segmentProgress,
            x1: LoaderConstants.chromaticEaseBezier.x1,
            y1: LoaderConstants.chromaticEaseBezier.y1,
            x2: LoaderConstants.chromaticEaseBezier.x2,
            y2: LoaderConstants.chromaticEaseBezier.y2
        )

        let color = lerpColor(from: palette[index], to: palette[nextIndex], fraction: easedSegment)

        let breathingFactor = 0.5 * (1.0 + sin(progress * 2.0 * .pi))
        let opacity = LoaderConstants.chromaticOpacityMin +
            (LoaderConstants.chromaticOpacityMax - LoaderConstants.chromaticOpacityMin) * breathingFactor

        return ChromaticPulseState(
            color: color,
            opacity: max(0.0, min(1.0, opacity)),
            progress: progress
        )
    }
}
