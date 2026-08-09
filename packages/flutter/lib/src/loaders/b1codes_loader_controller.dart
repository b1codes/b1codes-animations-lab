import 'package:flutter/foundation.dart';

/// Imperative controller for b1codes particle loaders.
///
/// Allows consuming code to trigger [resolve] exit discharge sequences,
/// or [pause] / [resume] particle simulations.
class B1CodesLoaderController extends ChangeNotifier {
  bool _isPaused = false;
  bool _isResolving = false;

  bool get isPaused => _isPaused;
  bool get isResolving => _isResolving;

  /// Triggers the Thermal Glow exit discharge sequence (~350ms),
  /// accelerating particles outward before dissolving and firing `onDismiss`.
  void resolve() {
    if (_isResolving) return;
    _isResolving = true;
    notifyListeners();
  }

  /// Pauses the particle simulation animation loop.
  void pause() {
    if (_isPaused) return;
    _isPaused = true;
    notifyListeners();
  }

  /// Resumes the particle simulation animation loop.
  void resume() {
    if (!_isPaused) return;
    _isPaused = false;
    notifyListeners();
  }

  /// Reset controller state.
  void reset() {
    _isPaused = false;
    _isResolving = false;
    notifyListeners();
  }
}
