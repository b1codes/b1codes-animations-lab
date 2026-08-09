import SwiftUI

/// A cloud of particles that drifts, clusters, and disperses like interstellar gas.
public struct NebulaLoader: View {
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
    public let controller: B1CodesLoaderController?

    public init(
        palette: [Color],
        size: CGSize = CGSize(width: 48, height: 48),
        particleCount: Int = 45,
        speed: Double = 1.0,
        intensity: Double = 0.7,
        depth: Bool = true,
        backgroundColor: Color = .clear,
        accessibilityLabel: String = "Loading",
        onCycleComplete: (() -> Void)? = nil,
        onDismiss: (() -> Void)? = nil,
        reducedMotion: Bool? = nil,
        controller: B1CodesLoaderController? = nil
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
        self.controller = controller
    }

    public var body: some View {
        BaseLoaderView(
            palette: palette,
            size: size,
            particleCount: particleCount,
            speed: speed,
            intensity: intensity,
            depth: depth,
            backgroundColor: backgroundColor,
            accessibilityLabel: accessibilityLabel,
            onCycleComplete: onCycleComplete,
            onDismiss: onDismiss,
            reducedMotion: reducedMotion,
            controller: controller,
            variant: "nebula"
        )
    }
}

// Xcode Canvas Preview Provider
struct NebulaLoader_Previews: PreviewProvider {
    static var previews: some View {
        NebulaLoader(
            palette: [.teal, .blue, .purple],
            size: CGSize(width: 120, height: 120)
        )
        .preferredColorScheme(.dark)
        .padding()
        .previewLayout(.sizeThatFits)
    }
}
