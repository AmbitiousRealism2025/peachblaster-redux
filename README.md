# Peach Blaster Redux

Peach Blaster Redux is a web-based arcade shooter inspired by Asteroids, expanded into a 5-chapter campaign with boss fights and procedural fruit enemies.

## Features

- Classic Asteroids-inspired controls with modern juice
- 5 themed chapters with boss fights
- Procedural peach rendering (no image assets)
- WebAudio procedural SFX
- Mobile-friendly touch controls
- Toggleable post-processing effects
- Single-file arcade export for offline play

## Tech Stack

- Vite + TypeScript
- Three.js (WebGL2, orthographic rendering)
- Custom physics (inertia, damping, circle collisions)
- Object pooling for performance
- DOM/CSS UI overlay

## Development

### Prerequisites

- Node.js 18+ (or latest LTS)
- npm 9+

### Setup

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

Open http://localhost:5173

### Build for Production

```bash
npm run build
```

Output: `dist/` directory

### Preview Production Build

```bash
npm run preview
```

### Export Single-File Arcade Build

```bash
npm run export:single
```

Output: `dist/peachblaster-arcade.html` (self-contained, offline-ready)

## Controls

### Desktop

- **WASD / Arrow Keys:** Thrust and rotate
- **Space:** Fire
- **Escape:** Pause
- **M:** Mute/unmute (dev shortcut)
- **F1:** Toggle debug overlay (dev builds only)

### Mobile

- **Virtual Joystick (bottom-left):** Thrust and rotate
- **Fire Button (bottom-right):** Fire

## Performance

### Targets

- **Desktop:** 60fps sustained
- **Mobile (mid-range):** 45-60fps

### Quality Settings

Access via Menu → Settings:

- **Low:** No post-processing (best performance)
- **Medium:** Bloom + vignette at 50%
- **High:** Full effects (bloom, vignette, chromatic aberration)

Reduced-motion preference automatically forces low quality.

### Profiling Checklist

- **Desktop (Chrome):** DevTools → Performance, record 30s at max load (Chapter 5 final wave + boss).
- **Mobile (Android):** Chrome Remote Debugging on a mid-range device, same scenario.
- Capture: FPS, frame time spikes, GC pauses, draw calls, memory usage.

## Project Structure

```
src/
├── core/          # Game loop, state machine, time, managers
├── entities/      # Ship, peaches, bullets, bosses
├── systems/       # Physics, collisions, spawning, pooling
├── rendering/     # Scene, materials, particles, trails, shaders
├── input/         # Keyboard + touch input
├── audio/         # WebAudio SFX manager
├── ui/            # DOM overlays (HUD, menus, screens)
└── config/        # Tuning constants, chapter configs
```

## Architecture Notes

- **Fixed timestep:** 60Hz physics updates, interpolated rendering
- **Allocation-free hot paths:** Reused scratch objects, in-place mutations
- **Instanced rendering:** Single draw call for all peaches/bullets/particles
- **Pooling:** Zero-allocation entity reuse (peaches, bullets, particles)

## License

[Add license info]

## Credits

[Add credits]

