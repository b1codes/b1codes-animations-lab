import SwiftUI

/// Canonical physical constants, particle mass tiers, Chromatic Pulse specs,
/// and refractive depth layer parameters across all b1codes platform SDKs.
public struct LoaderConstants {
    /// Base cycle duration for full particle field color rotation through the palette (3200ms).
    public static let chromaticPulseDurationMs: Double = 3200.0

    /// Cubic bezier control points for CHROMATIC_EASE: [0.45, 0.0, 0.55, 1.0].
    public static let chromaticEaseBezier: (x1: Double, y1: Double, x2: Double, y2: Double) = (0.45, 0.0, 0.55, 1.0)

    /// Opacity breathing range [min, max].
    public static let chromaticOpacityMin: Double = 0.55
    public static let chromaticOpacityMax: Double = 1.0

    /// Drag resistance friction coefficient.
    public static let dragResistance: Double = 0.15

    /// Spring stiffness constant.
    public static let springStiffness: Double = 180.0

    /// Spring damping constant.
    public static let springDamping: Double = 12.0

    /// Thermal Glow Phase 1 Excitation duration (50ms).
    public static let thermalGlowExcitationMs: Double = 50.0

    /// Thermal Glow Phase 2 Dissipation duration (300ms).
    public static let thermalGlowDissipationMs: Double = 300.0

    /// Total Thermal Glow exit duration (350ms).
    public static let thermalGlowTotalDurationMs: Double = 350.0

    /// Thermal Heat color spectrum transition sequence (#FF3B30 -> #FF9500).
    public static let thermalGlowSpectrum: [Color] = [
        Color(red: 1.0, green: 0.231, blue: 0.188),
        Color(red: 1.0, green: 0.584, blue: 0.0)
    ]
}
