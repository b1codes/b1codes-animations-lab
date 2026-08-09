import Foundation

/// Particle mass & size tier properties carrying simulated mass.
public struct ParticleMassTier {
    public let name: String
    public let mass: Double
    public let sizeRatio: Double
    public let velocityRatio: Double
    public let shimmerRate: Double

    public init(name: String, mass: Double, sizeRatio: Double, velocityRatio: Double, shimmerRate: Double) {
        self.name = name
        self.mass = mass
        self.sizeRatio = sizeRatio
        self.velocityRatio = velocityRatio
        self.shimmerRate = shimmerRate
    }

    public static let dust = ParticleMassTier(
        name: "dust",
        mass: 0.5,
        sizeRatio: 0.6,
        velocityRatio: 1.4,
        shimmerRate: 1.5
    )

    public static let motes = ParticleMassTier(
        name: "motes",
        mass: 1.0,
        sizeRatio: 1.0,
        velocityRatio: 1.0,
        shimmerRate: 1.0
    )

    public static let cores = ParticleMassTier(
        name: "cores",
        mass: 2.5,
        sizeRatio: 1.8,
        velocityRatio: 0.6,
        shimmerRate: 0.7
    )
}

/// Refractive depth layer parameters providing glass-lens depth.
public struct RefractiveDepthLayer {
    public let layer: String
    public let depthIndex: Int
    public let blurPx: Double
    public let opacityMultiplier: Double
    public let scale: Double

    public init(layer: String, depthIndex: Int, blurPx: Double, opacityMultiplier: Double, scale: Double) {
        self.layer = layer
        self.depthIndex = depthIndex
        self.blurPx = blurPx
        self.opacityMultiplier = opacityMultiplier
        self.scale = scale
    }

    public static let background = RefractiveDepthLayer(
        layer: "background",
        depthIndex: 0,
        blurPx: 4.0,
        opacityMultiplier: 0.45,
        scale: 0.75
    )

    public static let midground = RefractiveDepthLayer(
        layer: "midground",
        depthIndex: 1,
        blurPx: 1.0,
        opacityMultiplier: 0.75,
        scale: 0.90
    )

    public static let foreground = RefractiveDepthLayer(
        layer: "foreground",
        depthIndex: 2,
        blurPx: 0.0,
        opacityMultiplier: 1.00,
        scale: 1.00
    )
}
