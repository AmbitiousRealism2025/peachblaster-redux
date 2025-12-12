# Peach Blaster Redux — Tech Stack

## Overview

Peach Blaster Redux is built with a minimal, performance-focused tech stack optimized for web-based arcade gaming.

---

## Core Technologies

### TypeScript
- **Version:** ^5.7.2
- **Configuration:** Strict mode enabled
- **Purpose:** Type safety, IDE support, compile-time error detection

```json
// tsconfig.json highlights
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler"
  }
}
```

### Three.js
- **Version:** ^0.165.0
- **Purpose:** WebGL2-based 3D rendering
- **Usage:**
  - Orthographic camera for 2.5D feel
  - InstancedMesh for efficient entity rendering
  - ShaderMaterial for procedural textures
  - EffectComposer for post-processing

Key Three.js features used:
| Feature | Purpose |
|---------|---------|
| `OrthographicCamera` | 2D-style rendering with depth |
| `InstancedMesh` | Single draw call for many entities |
| `ShaderMaterial` | Custom GLSL peach shader |
| `Points` | Particle system rendering |
| `BufferGeometry` | Dynamic trail rendering |
| `EffectComposer` | Post-processing pipeline |
| `UnrealBloomPass` | Bloom effect |

### Vite
- **Version:** ^6.0.3
- **Purpose:** Fast development server and optimized production builds
- **Features used:**
  - Hot Module Replacement (HMR)
  - ES module bundling
  - Code splitting
  - Asset optimization

---

## Build Configuration

### Development
```bash
npm run dev
# Starts Vite dev server at localhost:5173
# Features: HMR, source maps, fast refresh
```

### Production Build
```bash
npm run build
# TypeScript check + Vite production build
# Output: dist/ directory
```

### Single-File Export
```bash
npm run export:single
# Creates dist/peachblaster-arcade.html
# Self-contained, offline-ready
```

### Vite Configuration

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    target: "es2020",
    minify: "terser",
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["three"]  // Separate Three.js chunk
        }
      }
    }
  }
});
```

---

## Runtime APIs

### WebGL2
- Primary rendering API via Three.js
- Required for instanced rendering and custom shaders
- Fallback: None (WebGL2 required)

### WebAudio API
- Procedural sound effect generation
- Features used:
  - `OscillatorNode` (sine, sawtooth)
  - `GainNode` (volume control)
  - `BiquadFilterNode` (low-pass, band-pass)
  - `AudioBufferSourceNode` (noise generation)

### Web Storage API
- Settings persistence via `localStorage`
- Keys:
  - `peachblaster_volume` (0.0-1.0)
  - `peachblaster_muted` ("true"/"false")
  - `peachblaster_quality` ("low"/"medium"/"high")

### requestAnimationFrame
- Primary render loop driver
- Coordinated with fixed-timestep physics

### Touch Events API
- Mobile joystick and fire button
- Events: `touchstart`, `touchmove`, `touchend`

### Media Queries
- `prefers-reduced-motion` for accessibility
- Automatic low-quality mode when detected

---

## Rendering Pipeline

```
┌─────────────────────────────────────────────────────────┐
│                    Scene Graph                          │
├─────────────────────────────────────────────────────────┤
│  Ship Mesh                                              │
│  PeachManager.instancedMesh (50 instances)              │
│  BulletManager.instancedMesh (100 instances)            │
│  ParticleSystem.points (500 particles)                  │
│  TrailRenderer.line (ship + bullet trails)              │
│  Boss meshes (when active)                              │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              Quality: Low                               │
│              Direct WebGLRenderer.render()              │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              Quality: Medium/High                       │
│              EffectComposer Pipeline                    │
├─────────────────────────────────────────────────────────┤
│  1. RenderPass (scene to buffer)                        │
│  2. UnrealBloomPass (glow effect)                       │
│  3. ShaderPass (VignetteShader)                         │
│  4. ShaderPass (ChromaticAberrationShader) [High only]  │
│  5. Output to canvas                                    │
└─────────────────────────────────────────────────────────┘
```

---

## Custom Shaders

### Peach Material (GLSL)

```glsl
// Vertex: Standard position transform
// Fragment: Procedural peach appearance
- Radial gradient (orange → yellow center)
- Fresnel rim lighting (fuzz effect)
- Specular highlight (glossy spot)
```

### Vignette Shader

```glsl
// Darkens edges of screen
uniform float offset;    // Darkness start distance
uniform float darkness;  // Intensity multiplier
```

### Chromatic Aberration Shader

```glsl
// Subtle RGB offset for retro CRT feel
uniform float offset;  // Pixel offset amount
// Samples R, G, B at slightly different positions
```

---

## Audio Implementation

### Procedural Sound Generation

No audio files — all sounds generated at runtime:

| Sound | Method |
|-------|--------|
| Thrust | White noise → Low-pass filter → Gain envelope |
| Bullet Fire | Sine oscillator → Quick decay |
| Peach Split | Noise burst → Band-pass filter |
| Ship Damage | Sawtooth oscillator → Decay envelope |
| Boss Hit | Sine + noise → Deep thud envelope |

### Audio Graph

```
AudioContext
├── masterGain (volume control)
│   ├── thrustOscillator (continuous loop)
│   │   └── thrustFilter (low-pass)
│   ├── sfxNodes (one-shot sounds)
│   │   └── gainEnvelopes (attack/decay)
│   └── (output to speakers)
```

---

## Performance Strategy

### Memory Management

| Strategy | Implementation |
|----------|----------------|
| Object Pooling | `ObjectPool<T>` for all entities |
| Instanced Rendering | Single draw call per entity type |
| Preallocated Scratch | Reused Vector3/Matrix4 per manager |
| DOM Recycling | UI elements show/hide vs create/destroy |

### CPU Optimization

| Strategy | Implementation |
|----------|----------------|
| Fixed Timestep | 60Hz physics, variable render |
| Squared Distance | Collision without `sqrt()` |
| Early Exit | Skip inactive entity processing |
| Batch Updates | Instance matrix updates in single loop |

### GPU Optimization

| Strategy | Implementation |
|----------|----------------|
| Draw Call Batching | InstancedMesh for entities |
| Procedural Textures | No texture loading/memory |
| Quality Presets | Post-FX on/off based on device |
| Simplified Geometry | Low-poly meshes |

---

## Browser Support

### Required Features
- WebGL2
- ES2020 JavaScript
- WebAudio API
- Touch Events (mobile)

### Tested Browsers
- Chrome 90+
- Firefox 90+
- Safari 15+
- Edge 90+

### Mobile Support
- iOS Safari 15+
- Chrome for Android 90+
- Mid-range device target (45-60fps)

---

## Development Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| typescript | ^5.7.2 | Type checking |
| vite | ^6.0.3 | Build tooling |
| terser | ^5.44.1 | Minification |
| @types/three | ^0.165.0 | Three.js type definitions |

---

## Bundle Analysis

### Production Build Sizes

| Asset | Uncompressed | Gzipped |
|-------|--------------|---------|
| Vendor (Three.js) | ~488 KB | ~120 KB |
| App (Game code) | ~87 KB | ~21 KB |
| CSS | ~8 KB | ~2 KB |
| **Total** | ~583 KB | ~141 KB |

### Single-File Export

| Asset | Uncompressed | Gzipped |
|-------|--------------|---------|
| peachblaster-arcade.html | ~746 KB | ~212 KB |

---

## Environment Variables

Vite provides `import.meta.env`:

| Variable | Usage |
|----------|-------|
| `import.meta.env.DEV` | Dev-only code (debug overlay, console logs) |
| `import.meta.env.PROD` | Production optimizations |

Example usage:
```typescript
if (import.meta.env.DEV) {
  console.log("Debug info");
  const debugOverlay = await import("./ui/DebugOverlay");
}
```

---

## Future Considerations

### Potential Additions
- **Rapier2D** — If physics complexity increases
- **Howler.js** — If audio requirements grow
- **PWA** — Service worker for offline play
- **WebGPU** — When browser support matures

### Intentionally Avoided
- Heavy frameworks (React, Vue)
- CSS frameworks (Tailwind, Bootstrap)
- State management libraries (Redux, MobX)
- External audio files
- External image assets

The minimal dependency approach keeps:
- Bundle size small
- Load times fast
- Code predictable
- Maintenance simple
