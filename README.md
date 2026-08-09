# b1codes-animations-lab

> Multi-platform dynamic particle loader suite with cross-framework physics parity (React Web, React Native, Flutter, SwiftUI).

---

## 🚀 Overview

`b1codes-animations-lab` is a cross-platform particle animation framework and component suite built with strict canonical physics parity across Web, Mobile, and Desktop platforms. 

It powers high-performance dynamic loading animations featuring Keplerian orbital dynamics, Brownian nebula fluid turbulence, cascading particle gravitational flow, and interactive **Thermal Glow** exit discharge mechanics.

---

## 🎨 Loaders Included

| Loader | Mechanics & Physics Model | Particle Range | Mass Tiers |
| :--- | :--- | :--- | :--- |
| **OrbitalLoader** | Keplerian orbital mechanics ($\omega \propto a^{-1.5}$) with mass inertia ratios | 12 – 24 particles | Dust, Motes, Cores |
| **NebulaLoader** | Brownian fluid motion, dynamic visual radius pulsation, 3-tier depth rendering | 30 – 60 particles | Dust, Motes, Cores |
| **CascadeLoader** | Gravitational multi-column waterfall flow with dampening bouncing behavior | 16 – 32 particles | Dust, Motes, Cores |

---

## 📦 Packages & Ecosystem

All packages enforce verified cross-platform constant alignment (`verify:constants` audit pass):

* **`@b1codes/core`** (`packages/core`): TypeScript canonical physics solver, Chromatic Pulse palette interpolator, and cubic-bezier easing engine.
* **`@b1codes/loaders`** (`packages/react`): React Web SVG/Canvas particle loader components with full TypeScript bindings.
* **`@b1codes/loaders-react-native`** (`packages/react-native`): React Native particle loader components leveraging Skia/Reanimated graphics pipeline.
* **`b1codes_loaders`** (`packages/flutter`): Flutter package supporting CustomPainter particle rendering across iOS, Android, Web, and Desktop.
* **`B1CodesLoaders`** (`packages/swift`): Swift / SwiftUI package with TimelineView particle rendering engine.
* **`lab`** (`lab/`): Standalone interactive reference gallery for rapid web prototyping and visual verification.

---

## ⚡ Features & Parity Specs

- 🌌 **Canonical Physics Engine**: Unified particle mass tiers (`dust`: 0.5, `motes`: 1.0, `cores`: 2.5) and refractive depth blur layers (`background`: 4.0px, `midground`: 1.0px, `foreground`: 0px).
- 🌈 **Chromatic Pulse Specs**: 3200ms palette cycle duration with $S$-curve cubic-bezier $(0.45, 0.0, 0.55, 1.0)$ dynamic easing.
- 🔥 **Thermal Glow Exit Discharge**: Dynamic interactive dismiss trigger featuring 50ms pulse excitation and 300ms energy dissipation curve ($350\text{ms}$ total cycle).
- ♿ **Accessibility & Reduced Motion**: Automatic fallbacks to elegant static geometric dot grids when reduced motion preferences are detected (`prefers-reduced-motion`).

---

## 🛠️ Quick Start & Development

### Installation & Workspace Setup

```bash
# Clone the repository
git clone https://github.com/b1codes/b1codes-animations-lab.git
cd b1codes-animations-lab

# Install Node dependencies
npm install
```

### Build & Verification Commands

```bash
# Run turbo build across JS/TS workspace packages
npm run build

# Run unit tests & cross-platform physics constants verification audit
npm test

# Run lint checks
npm run lint

# Verify physical constants cross-platform parity explicitly
npm run verify:constants
```

### Flutter Workspace Commands (Melos)

```bash
# Run Dart/Flutter analyzer across Flutter package
npx melos run analyze

# Run Flutter package test suite
npx melos run test
```

### 🧪 Interactive Lab Gallery

To launch and visually inspect the dynamic particle loaders in the interactive reference gallery:

```bash
# Serve the web lab gallery locally
npm run lab

# Alternatively, using Python
python3 -m http.server 8000 --directory lab
```

Then open the output URL (e.g. `http://localhost:3000` or `http://localhost:8000`) in your browser to interact with **OrbitalLoader**, **NebulaLoader**, and **CascadeLoader** along with live controls for speed, intensity, palette themes, and exit discharge resolution mechanics.

---

## 📄 License

[MIT](LICENSE) © b1codes