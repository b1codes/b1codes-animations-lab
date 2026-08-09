# M0 — Dynamic Particle Loaders: MVP Specification

> **Status:** Draft
> **Milestone:** M0 (MVP)
> **Author:** b1codes
> **Last Updated:** 2026-08-09

---

## 1. Vision

**b1codes-animations-lab** exists to solve a real pain point: building rich, branded loading animations once and shipping them everywhere — Flutter, React (Web & Native), and SwiftUI — without rewriting per platform.

The MVP focuses on a single, high-impact animation category: **dynamic particle loading states**. These aren't spinners. They're living, breathing compositions of particles that embody the LLC "Technical Luxury" philosophy — objects with mass, surfaces with depth, interactions with energy.

The north star for M0 is:

> A developer installs a single package (from pub.dev, npm, or Swift Package Manager), passes in their app's color palette, and gets a premium particle loader that feels native to their brand — out of the box.

---

## 2. Design Philosophy Anchors

Every animation in this library must be traceable back to the LLC design standards. M0 specifically draws from:

### 2.1 Chromatic Pulse as the Foundation

Loading states are governed by Chromatic Pulse — the palette-agnostic, breathing color cycle defined in the LLC standards. M0 particle loaders are Chromatic Pulse *visualized through particle systems* rather than flat color washes.

| Inherited Constant | Value | M0 Application |
| :--- | :--- | :--- |
| `CHROMATIC_PULSE_DURATION` | `3200ms` | Base cycle duration for the full particle field color rotation |
| `CHROMATIC_EASE` | `cubic-bezier(0.45, 0, 0.55, 1)` | Per-particle color interpolation easing |
| `CHROMATIC_OPACITY_RANGE` | `0.55 – 1.0` | Individual particle opacity breathing range |

### 2.2 Mass & Inertia Applied to Particles

Particles are not weightless dots. They carry **simulated mass** — larger particles drift slower, smaller particles shimmer and scatter faster. Movement is momentum-driven, never linear. This creates organic, physics-grounded compositions that feel like *matter*, not decoration.

### 2.3 Refractive Depth

Particles exist on multiple visual layers. Foreground particles are crisp and bright; background particles are diffused, slightly blurred, and dimmer. This creates optical depth without relying on drop shadows — a glass-lens effect consistent with the "Glass Surface" material.

### 2.4 Thermal Glow Exit Discharge (M0 Stretch Goal)

When a loading state resolves (data arrives), the particle field doesn't just vanish. It undergoes a brief **Thermal Glow discharge** — particles accelerate outward from center and fade with the `#FF3B30 → #FF9500` heat spectrum before the content appears. This bridges the loader → content transition.

This introduces the first **triggered-animation codepath** alongside the idle-loop Chromatic Pulse — a small surface area that validates the engine's ability to handle both motion categories. If time permits in M0, this ships; if not, it is the first item in M1.

---

## 3. Loader Variants (M0 Scope)

M0 ships **3 distinct particle loader patterns**, each offering a different spatial personality while sharing the same underlying particle engine and Chromatic Pulse integration.

### 3.1 `OrbitalLoader`

**Concept:** Particles orbit a gravitational center in elliptical paths at varying speeds and radii. Evokes a planetary/atomic model.

- **Particle count:** 12–24 (configurable)
- **Behavior:** Particles follow Keplerian-ish orbits — closer particles move faster, farther ones drift. Occasional particles break orbit briefly and re-stabilize (adds organic tension).
- **Use case:** Inline loaders, button loading states, avatar placeholders.

### 3.2 `NebulaLoader`

**Concept:** A cloud of particles that drifts, clusters, and disperses like interstellar gas. No fixed center — the composition breathes as a whole.

- **Particle count:** 30–60 (configurable)
- **Behavior:** Perlin-noise-driven drift with soft attraction/repulsion forces between particle groups. Particles vary in size (3 tiers: dust, motes, cores). The overall density ebbs and flows with `CHROMATIC_PULSE_DURATION`.
- **Use case:** Full-page loading overlays, route transitions, splash screens.

### 3.3 `CascadeLoader`

**Concept:** Particles rain or cascade from one edge, accumulate briefly, then dissolve and recycle. A waterfall of luminous matter.

- **Particle count:** 20–40 (configurable)
- **Behavior:** Gravity-driven with slight horizontal drift (wind). Particles spawn at the top edge, descend with acceleration, hit a soft "floor" where they briefly pool and glow, then fade and respawn. Speed staggers create depth.
- **Use case:** List/feed loading states, skeleton screen enhancements, progress indicators.

---

## 4. Customization API (All Platforms)

The API surface must be minimal for "just works" usage but deep enough for full brand alignment. Every variant exposes the same configuration contract:

### 4.1 Required

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `palette` | `Color[]` | The consuming app's theme colors (min 2, recommended 3–4). Drives Chromatic Pulse. |

### 4.2 Optional (with sensible defaults)

| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `size` | `Size` | `48 × 48` | Bounding box for the loader |
| `particleCount` | `int` | Variant default | Override particle density |
| `speed` | `float` | `1.0` | Multiplier on `CHROMATIC_PULSE_DURATION` and particle velocity |
| `intensity` | `float` | `0.7` | Controls particle size variance and glow radius (0.0 = subtle, 1.0 = dramatic) |
| `depth` | `bool` | `true` | Enable/disable the multi-layer refractive depth effect |
| `backgroundColor` | `Color?` | `transparent` | Background fill behind the particle field |

### 4.3 Lifecycle Callbacks

| Callback | Description |
| :--- | :--- |
| `onCycleComplete` | Fires each time the Chromatic Pulse completes a full palette rotation |
| `onDismiss` | Fires when the exit/resolve animation completes |

### 4.4 Imperative Control

| Method | Description |
| :--- | :--- |
| `resolve()` | Triggers the exit animation (Thermal Glow discharge or graceful fade) |
| `pause()` / `resume()` | Suspends/resumes the particle simulation (for off-screen optimization) |

---

## 5. Accessibility

Chromatic Pulse loops can run for the full duration of a slow load. M0 **must** respect platform reduced-motion signals from day one.

| Platform | Signal | Behavior When Active |
| :--- | :--- | :--- |
| Web (CSS/React) | `prefers-reduced-motion: reduce` | Static single-color dot grid, no animation |
| React Native | `AccessibilityInfo.isReduceMotionEnabled` | Static single-color dot grid, no animation |
| Flutter | `MediaQuery.disableAnimations` | Static single-color dot grid, no animation |
| SwiftUI | `accessibilityReduceMotion` | Static single-color dot grid, no animation |

Additionally:
- All loaders must include appropriate semantic labeling (`aria-label`, `accessibilityLabel`, `Semantics.label`) with a default of `"Loading"` and an override parameter.
- Loaders must not be the sole indicator of loading — pair with visible text or a determinate progress indicator when possible.

---

## 6. Performance Constraints

Particle systems are inherently expensive if unconstrained. M0 enforces strict budgets:

### 6.1 Render Isolation

- **React (Web):** Each loader wraps in `React.memo`. Particle state lives in a `useRef`-driven animation loop (`requestAnimationFrame`), never in React state.
- **React Native:** Particle rendering via `react-native-skia` `Canvas`. Animation loop driven by Skia's `useSharedValueEffect` / `useDerivedValue` on the UI thread — no JS bridge per frame.
- **Flutter:** Loader widget wraps in `RepaintBoundary`. Animation driven by `CustomPainter` + `AnimationController` — no `setState` per frame.
- **SwiftUI:** Animation state scoped to an isolated `@State` on a leaf `View`. Use `Canvas` + `TimelineView` + `drawingGroup()` (iOS 15+).

### 6.2 Property Constraints

Only animate compositor-friendly properties:
- ✅ `transform` (translate, scale)
- ✅ `opacity`
- ✅ `fill` / `color` interpolation
- ❌ No layout-triggering properties (`width`, `height`, `top`, `left` in DOM)

### 6.3 Particle Budget

| Context | Max Particles | Target Frame Rate |
| :--- | :--- | :--- |
| Inline (≤ 64px) | 24 | 60fps |
| Card / Section | 40 | 60fps |
| Full-page overlay | 60 | 60fps (30fps acceptable on low-end) |

---

## 7. Architecture: The Particle Engine

M0 introduces a shared **particle engine core** that all three loader variants consume. This is the scalable foundation for future animation categories beyond loading states.

### 7.1 Engine Responsibilities

```
┌─────────────────────────────────────────────┐
│              Particle Engine                │
│                                             │
│  ┌───────────┐  ┌───────────┐  ┌─────────┐ │
│  │  Emitter  │  │  Physics  │  │ Renderer│ │
│  │  Config   │  │  Solver   │  │ Adapter │ │
│  └─────┬─────┘  └─────┬─────┘  └────┬────┘ │
│        │              │              │      │
│        ▼              ▼              ▼      │
│   Spawn rules    Position/vel    Platform   │
│   Lifecycle      Collision       draw calls │
│   Color cycle    Forces/drift               │
└─────────────────────────────────────────────┘
```

- **Emitter Config:** Defines spawn rate, lifetime, initial position distribution, color assignment from palette.
- **Physics Solver:** Pure math — updates position, velocity, opacity, and scale each tick. Platform-agnostic. This is the portable core.
- **Renderer Adapter:** Platform-specific bridge that takes the solver's output (array of `{x, y, scale, opacity, color}`) and draws it using the native API.

### 7.2 Portable Core Strategy

The Physics Solver is the heart of cross-platform consistency. M0 explores two strategies:

| Strategy | Pros | Cons |
| :--- | :--- | :--- |
| **Shared math spec** — Document the physics formulas; each platform re-implements in its native language | Fully native, no FFI overhead, idiomatic per platform | Drift risk between implementations, higher maintenance |
| **Shared WASM/Dart core** — Write solver once, compile to WASM for web/React Native, use directly in Flutter, bridge to Swift | Single source of truth, guaranteed consistency | FFI complexity, WASM bundle size, Swift interop friction |

**M0 Decision:** Start with **shared math spec** for speed-to-ship. The physics are simple enough (basic kinematics + noise) that drift risk is low. Revisit for M1 if the variant count grows and consistency becomes a burden.

### 7.3 Source Format

M0 prototypes all animations as **SVG + CSS** first in this lab repo. The lab is the design workbench:

1. **Design** the animation in pure SVG + CSS/JS in the lab.
2. **Extract** the physics constants and behavioral spec.
3. **Port** to each platform SDK using the Renderer Adapter pattern.

This keeps iteration fast (browser hot-reload) and lets the lab serve as a living reference implementation.

---

## 8. Package Structure (Target State for M0 Publish)

```
b1codes-animations/
├── lab/                        # This repo — SVG/CSS prototypes
│   ├── loaders/
│   │   ├── orbital/
│   │   │   ├── orbital.svg
│   │   │   ├── orbital.css
│   │   │   └── orbital.js      # Prototype physics
│   │   ├── nebula/
│   │   └── cascade/
│   └── shared/
│       ├── chromatic-pulse.css  # Reference Chromatic Pulse impl
│       ├── particle-engine.js  # Reference physics solver
│       └── constants.js        # LLC physical constants
│
├── packages/
│   ├── react/                  # → npm: @b1codes/loaders
│   │   ├── src/
│   │   │   ├── core/           # Physics solver (JS)
│   │   │   ├── loaders/        # OrbitalLoader, NebulaLoader, CascadeLoader
│   │   │   └── hooks/          # useParticleEngine, useChromaticPulse
│   │   └── package.json
│   │
│   ├── react-native/           # → npm: @b1codes/loaders-react-native
│   │   ├── src/
│   │   │   ├── core/           # Shared physics solver (JS)
│   │   │   ├── loaders/        # OrbitalLoader, NebulaLoader, CascadeLoader
│   │   │   └── skia/           # react-native-skia renderer adapter
│   │   └── package.json
│   │
│   ├── flutter/                # → pub.dev: b1codes_loaders
│   │   ├── lib/
│   │   │   ├── src/
│   │   │   │   ├── core/       # Physics solver (Dart)
│   │   │   │   └── loaders/    # OrbitalLoader, NebulaLoader, CascadeLoader
│   │   │   └── b1codes_loaders.dart
│   │   └── pubspec.yaml
│   │
│   └── swift/                  # → Swift Package Manager: B1CodesLoaders
│       ├── Sources/
│       │   ├── Core/           # Physics solver (Swift)
│       │   └── Loaders/        # OrbitalLoader, NebulaLoader, CascadeLoader
│       └── Package.swift
│
└── docs/
    ├── SPEC.md                 # ← You are here
    └── CHANGELOG.md
```

---

## 9. Definition of Done — M0

M0 is shippable when **all** of the following are true:

### 9.1 Lab Prototypes (This Repo)

- [ ] All 3 loader variants (`Orbital`, `Nebula`, `Cascade`) fully prototyped in SVG + CSS/JS
- [ ] Shared `particle-engine.js` drives all 3 variants
- [ ] Chromatic Pulse integration working with configurable palette input
- [ ] Reduced-motion fallback renders static dot grid
- [ ] Each variant has a standalone HTML demo page with palette picker
- [ ] Visual reference gallery page showing all variants side-by-side

### 9.2 Platform Packages (At Least 1 Published)

- [ ] **React (Web) package** published to npm as `@b1codes/loaders` (React 19+)
  - [ ] `<OrbitalLoader />`, `<NebulaLoader />`, `<CascadeLoader />` components
  - [ ] TypeScript types for all props
  - [ ] `resolve()` imperative handle via `ref`
  - [ ] `prefers-reduced-motion` respected
  - [ ] Storybook or demo page
- [ ] **React Native package** published to npm as `@b1codes/loaders-react-native` (React Native 0.76+)
  - [ ] `<OrbitalLoader />`, `<NebulaLoader />`, `<CascadeLoader />` components
  - [ ] `react-native-skia` peer dependency, Skia `Canvas` renderer
  - [ ] `AccessibilityInfo.isReduceMotionEnabled` respected
  - [ ] Example app in `example/`
- [ ] **Flutter package** published to pub.dev as `b1codes_loaders` (Flutter 3.x+)
  - [ ] `OrbitalLoader`, `NebulaLoader`, `CascadeLoader` widgets
  - [ ] `RepaintBoundary` isolation
  - [ ] `MediaQuery.disableAnimations` respected
  - [ ] Example app in `example/`
- [ ] **Swift package** published via Swift Package Manager as `B1CodesLoaders` (iOS 15+)
  - [ ] `OrbitalLoader`, `NebulaLoader`, `CascadeLoader` SwiftUI views
  - [ ] `Canvas` + `TimelineView` + `drawingGroup()` rendering
  - [ ] `accessibilityReduceMotion` respected
  - [ ] Preview provider for each variant

### 9.3 Cross-Cutting

- [ ] Physics constants documented and identical across all platforms
- [ ] Performance profiled: 60fps on mid-range device for each variant at max particle count
- [ ] README with quick-start for each platform
- [ ] MIT license

---

## 10. Out of Scope for M0

These are explicitly deferred to future milestones:

| Item | Rationale | Target Milestone |
| :--- | :--- | :--- |
| WASM shared core | Premature optimization — validate with shared spec first | M1 |
| Determinate progress loaders | M0 focuses on indeterminate/loading states only | M1 |
| Skeleton screen integration | Requires layout-aware API beyond particle systems | M2 |
| Animation builder/compositor | Tool for chaining animations — needs more variants first | M2+ |
| Lottie/Rive export | Alternate render targets — evaluate demand first | M2+ |

---

## 11. Open Questions

> Resolved decisions are marked ✅. Open items need resolution before M0 work begins.

1. ✅ **Naming:** Use `loaders` sub-label for future-proofing → `@b1codes/loaders`, `@b1codes/loaders-react-native`, `b1codes_loaders`, `B1CodesLoaders`. Keeps the `@b1codes` namespace open for future animation categories (`@b1codes/transitions`, `@b1codes/gestures`, etc.).

2. ✅ **React target:** React Native is a day-one target alongside React Web. Separate packages (`@b1codes/loaders` for web, `@b1codes/loaders-react-native` for native) with a shared JS physics solver. React Native renderer uses `react-native-skia`.

3. ✅ **Minimum platform versions:**
   - iOS: **15+** — `Canvas` + `TimelineView` + `drawingGroup()`, no `GeometryReader` fallback
   - Flutter: **3.x+**
   - React (Web): **19+**
   - React Native: **0.76+** (New Architecture recommended)

4. ✅ **Thermal Glow exit animation:** Included as an **M0 stretch goal**. If time permits, the `resolve()` method triggers the Thermal Glow discharge. If not, `resolve()` ships with a graceful fade-out and Thermal Glow becomes the first M1 item.

5. ✅ **Monorepo tooling:** **Option A — single monorepo.** All packages (lab prototypes + platform SDKs) live in this repo. Physics constants change in one PR across all platforms. The CI complexity is worth it over multi-repo sync drift, and splitting later is always easier than consolidating. Tooling: **Turborepo** for JS packages, **Melos** for Flutter, **SPM** natively. See Section 12 for details.

---

## 12. Monorepo Tooling Strategy

All code — the SVG/CSS lab, the shared physics spec, and all 4 platform packages — lives in this single repository. This is the pragmatic choice for M0: one PR to change a physics constant across every platform, one CI pipeline, and the option to split later if the repo grows unwieldy.

### 12.1 Workspace Layout

```
b1codes-animations-lab/          # Root
├── turbo.json                   # Turborepo pipeline config
├── package.json                 # Root — npm workspaces declaration
├── melos.yaml                   # Melos config for Flutter packages
│
├── lab/                         # SVG/CSS prototyping workbench
│   ├── loaders/                 # M0 loader prototypes
│   └── shared/                  # Reference particle engine + constants
│
├── packages/
│   ├── core/                    # Shared JS physics solver (internal package)
│   │   ├── src/
│   │   │   ├── particle-engine.ts
│   │   │   ├── chromatic-pulse.ts
│   │   │   └── constants.ts
│   │   ├── package.json         # "@b1codes/core" (private, not published)
│   │   └── tsconfig.json
│   │
│   ├── react/                   # → npm: @b1codes/loaders
│   │   ├── package.json         # depends on @b1codes/core (workspace:*)
│   │   └── ...
│   │
│   ├── react-native/            # → npm: @b1codes/loaders-react-native
│   │   ├── package.json         # depends on @b1codes/core (workspace:*)
│   │   └── ...
│   │
│   ├── flutter/                 # → pub.dev: b1codes_loaders
│   │   ├── pubspec.yaml
│   │   └── ...
│   │
│   └── swift/                   # → SPM: B1CodesLoaders
│       ├── Package.swift
│       └── ...
│
└── docs/
    └── SPEC.md
```

### 12.2 JS Packages — npm Workspaces + Turborepo

The two React packages (`@b1codes/loaders`, `@b1codes/loaders-react-native`) share a private internal package (`@b1codes/core`) containing the physics solver, Chromatic Pulse logic, and LLC constants.

- **npm workspaces** in the root `package.json` declare `packages/core`, `packages/react`, and `packages/react-native`.
- **Turborepo** orchestrates `build`, `test`, `lint`, and `typecheck` tasks with caching. A change to `@b1codes/core` automatically rebuilds downstream dependents.
- `@b1codes/core` is `"private": true` — never published to npm. It's bundled into each consumer at build time.

### 12.3 Flutter — Melos

- **Melos** manages the Flutter package(s) under `packages/flutter/`.
- M0 has only one Dart package, but Melos earns its keep for consistent script running (`melos run test`, `melos run analyze`) and will scale when future animation categories add more Dart packages.
- The physics solver is re-implemented in Dart (per the shared-math-spec strategy), referencing the canonical constants from `lab/shared/constants.js`.

### 12.4 Swift — Native SPM

- The Swift package at `packages/swift/` is a standard Swift Package Manager layout.
- No additional tooling needed — SPM resolves directly from the subdirectory.
- The physics solver is re-implemented in Swift, referencing the same canonical constants.

### 12.5 CI Pipeline — Path-Filtered Jobs

The monorepo CI (GitHub Actions) uses **path filters** to run only the relevant platform jobs when code changes:

| Trigger Paths | Jobs Run |
| :--- | :--- |
| `lab/**`, `packages/core/**` | All platform jobs (physics spec is shared) |
| `packages/react/**` | React Web: build, test, lint |
| `packages/react-native/**` | React Native: build, test, lint |
| `packages/flutter/**` | Flutter: analyze, test |
| `packages/swift/**` | Swift: build, test (Xcode) |
| `docs/**` | No CI (docs only) |

Each platform job is a separate GitHub Actions workflow file for clarity, with a shared "core change" trigger that fans out to all of them.

### 12.6 Versioning & Publishing

- **JS packages:** Versioned together via Turborepo + Changesets. A core physics change bumps all JS packages.
- **Flutter:** Versioned independently via Melos. The Dart physics solver is manually kept in sync with the JS canonical version.
- **Swift:** Versioned via git tags (SPM convention). Tags follow `swift-vX.Y.Z` prefix to avoid collision with other package tags.
- **Canonical constants:** The source of truth for all physics constants is `lab/shared/constants.js`. A CI check validates that Dart and Swift constant files match the JS canonical values (simple hash or diff check).

---

## Appendix A: Glossary

| Term | Definition |
| :--- | :--- |
| **Chromatic Pulse** | LLC loading-state color signature: a synchronized breathe through the app's theme palette |
| **Thermal Glow** | LLC interaction signature: a two-phase energy burst on user contact |
| **Glass Surface** | LLC base material: translucent, blurred, high-tech surface |
| **Technical Luxury** | LLC design ethos: precision engineering meets high-end materiality |
| **Emitter** | Particle system component that defines spawn rules |
| **Physics Solver** | Platform-agnostic math engine that updates particle state each frame |
| **Renderer Adapter** | Platform-specific bridge that converts particle state to draw calls |
