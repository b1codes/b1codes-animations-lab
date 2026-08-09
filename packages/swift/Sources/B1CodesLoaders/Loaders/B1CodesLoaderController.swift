import Foundation
import Combine

/// Imperative controller for B1CodesLoader SwiftUI views.
///
/// Allows consuming code to trigger `resolve()` exit discharge sequences,
/// or `pause()` / `resume()` particle simulations.
public class B1CodesLoaderController: ObservableObject {
    @Published public var isPaused: Bool = false
    @Published public var isResolving: Bool = false

    public init() {}

    /// Triggers the Thermal Glow exit discharge sequence (~350ms),
    /// accelerating particles outward before dissolving and firing `onDismiss`.
    public func resolve() {
        guard !isResolving else { return }
        isResolving = true
    }

    /// Pauses the particle simulation animation loop.
    public func pause() {
        guard !isPaused else { return }
        isPaused = true
    }

    /// Resumes the particle simulation animation loop.
    public func resume() {
        guard isPaused else { return }
        isPaused = false
    }

    /// Resets controller state to initial.
    public func reset() {
        isPaused = false
        isResolving = false
    }
}
