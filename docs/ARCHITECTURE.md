# Peach Blaster Redux — Architecture Documentation

## Overview

Peach Blaster Redux is a web-based arcade shooter built with TypeScript, Three.js, and Vite. The architecture follows a modular design with clear separation between core systems, entities, rendering, and UI.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           main.ts                                    │
│                    (Application Bootstrap)                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐   │
│  │  GameLoop    │  │ StateMachine │  │      SceneManager        │   │
│  │  (60Hz tick) │  │  (FSM flow)  │  │  (Three.js rendering)    │   │
│  └──────┬───────┘  └──────┬───────┘  └────────────┬─────────────┘   │
│         │                 │                       │                  │
│         ▼                 ▼                       ▼                  │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                     CORE SYSTEMS                              │   │
│  │  Time │ LivesManager │ ScoreManager │ ChapterManager │ Boss   │   │
│  └──────────────────────────────────────────────────────────────┘   │
│         │                                                           │
│         ▼                                                           │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                      ENTITIES                                 │   │
│  │  Ship │ PeachManager │ BulletManager │ MegaPeachManager       │   │
│  └──────────────────────────────────────────────────────────────┘   │
│         │                                                           │
│         ▼                                                           │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                      SYSTEMS                                  │   │
│  │  PhysicsSystem │ CollisionSystem │ SpawnSystem │ ObjectPool   │   │
│  └──────────────────────────────────────────────────────────────┘   │
│         │                                                           │
│         ▼                                                           │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                   RENDERING & UI                              │   │
│  │  ParticleSystem │ TrailRenderer │ HUD │ MenuScreen │ etc.     │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
src/
├── main.ts              # Application entry point and state orchestration
├── style.css            # Global styles
├── vite-env.d.ts        # Vite type declarations
│
├── core/                # Core game systems
│   ├── GameLoop.ts      # Fixed-timestep game loop (60Hz)
│   ├── StateMachine.ts  # Finite state machine for game flow
│   ├── Time.ts          # Time management singleton (pause, hit-pause)
│   ├── PauseController.ts # Pause/resume coordination
│   ├── LivesManager.ts  # Player lives with event subscriptions
│   ├── ScoreManager.ts  # Score tracking and statistics
│   ├── ChapterManager.ts # Chapter/wave progression
│   └── BossProgression.ts # Boss spawn and defeat logic
│
├── entities/            # Game objects
│   ├── Ship.ts          # Player ship with inertia movement
│   ├── Peach.ts         # Enemy peach entity (pooled)
│   ├── PeachManager.ts  # Instanced peach rendering and pooling
│   ├── Bullet.ts        # Player bullet entity (pooled)
│   ├── BulletManager.ts # Instanced bullet rendering and pooling
│   └── bosses/          # Boss entities
│       ├── MegaPeach.ts          # Boss core with phase FSM
│       ├── MegaPeachManager.ts   # Boss lifecycle orchestration
│       ├── PitSatellite.ts       # Orbiting satellite entity
│       ├── PitSatelliteManager.ts # Satellite pooling
│       ├── Seed.ts               # Boss projectile
│       └── SeedManager.ts        # Seed pooling
│
├── systems/             # Game logic systems
│   ├── PhysicsSystem.ts # Stateless physics helpers (thrust, wrap, clamp)
│   ├── CollisionSystem.ts # Circle collision detection
│   ├── SpawnSystem.ts   # Wave-based enemy spawning
│   └── ObjectPool.ts    # Generic object pooling
│
├── rendering/           # Three.js rendering
│   ├── SceneManager.ts  # Scene, camera, renderer, post-processing
│   ├── PeachMaterial.ts # Procedural peach shader (GLSL)
│   ├── ParticleSystem.ts # Points-based particle effects
│   ├── TrailRenderer.ts # Dynamic line trails
│   ├── VignetteShader.ts # Custom vignette post-process
│   └── ChromaticAberrationShader.ts # RGB offset shader
│
├── input/               # Input handling
│   └── InputManager.ts  # Keyboard + touch input singleton
│
├── audio/               # Sound effects
│   └── SFXManager.ts    # WebAudio procedural SFX
│
├── ui/                  # DOM-based UI overlays
│   ├── HUD.ts           # Unified in-game HUD wrapper
│   ├── LivesDisplay.ts  # Lives counter
│   ├── ScoreDisplay.ts  # Score counter
│   ├── WaveCounter.ts   # Wave progress indicator
│   ├── BossHealthBar.ts # Boss health bar
│   ├── MenuScreen.ts    # Title/pause/settings overlay
│   ├── GameOverScreen.ts # Game over overlay
│   ├── VictoryScreen.ts # Victory overlay
│   ├── ChapterCard.ts   # Chapter title card
│   ├── RewardScreen.ts  # Between-chapter rewards
│   ├── MobileControls.ts # Touch joystick and fire button
│   ├── MobileControls.css # Mobile control styles
│   └── DebugOverlay.ts  # DEV-only FPS/stats (F1 toggle)
│
└── config/              # Configuration
    ├── tuning.ts        # All gameplay constants
    └── chapters.ts      # Chapter definitions
```

---

## Core Components

### GameLoop (`src/core/GameLoop.ts`)

Fixed-timestep accumulator loop ensuring consistent physics at 60Hz:

- **Fixed timestep:** 1/60 seconds (16.67ms)
- **Accumulator cap:** 0.25 seconds (prevents spiral of death)
- **Callbacks:** `onUpdate(dt)` for physics, `onRender()` for rendering
- **Alpha interpolation:** Available for smooth rendering between physics steps

### StateMachine (`src/core/StateMachine.ts`)

Typed finite state machine managing game flow:

```
LOADING → MENU → PLAYING ↔ PAUSED
                    ↓
           CHAPTER_TRANSITION → VICTORY
                    ↓
               GAME_OVER
```

Features:
- Validated state transitions
- Lifecycle hooks: `enter()`, `exit()`, `update(dt)`
- Change listeners for decoupled observation
- Extensible transition rules

### Time (`src/core/Time.ts`)

Singleton time utility:
- Elapsed time tracking
- Pause/resume support
- Hit-pause (micro-freeze on impacts)
- Time scale modification

### SceneManager (`src/rendering/SceneManager.ts`)

Three.js scene orchestration:
- Orthographic 2.5D camera
- WebGL2 renderer with resize handling
- Post-processing pipeline (EffectComposer)
- Quality presets (low/medium/high)
- Screen shake system

---

## Entity System

### Object Pooling Pattern

All frequently spawned entities use the generic `ObjectPool<T>`:

```typescript
// Acquire from pool
const peach = peachPool.acquire();

// Return to pool
peachPool.release(peach);
```

Benefits:
- Zero allocation during gameplay
- Predictable memory usage
- No GC stutters

### Instanced Rendering

`PeachManager`, `BulletManager`, `SeedManager`, and `PitSatelliteManager` use `THREE.InstancedMesh`:

- Single draw call per entity type
- Per-instance matrix updates via preallocated scratch objects
- Scale-to-zero hiding for inactive instances

### Entity Hierarchy

```
Entity Managers
├── PeachManager (max 50 instances)
│   └── Peach (Large → Medium → Small splitting)
├── BulletManager (max 100 instances)
│   └── Bullet (velocity + TTL)
└── MegaPeachManager (boss)
    ├── MegaPeach (core with phase FSM)
    ├── PitSatelliteManager (orbiting satellites)
    └── SeedManager (boss projectiles)
```

---

## Physics System

Stateless helper functions in `PhysicsSystem.ts`:

| Function | Purpose |
|----------|---------|
| `applyThrust()` | Add acceleration to velocity (mutates in place) |
| `applyDamping()` | Apply friction factor (mutates in place) |
| `clampSpeed()` | Cap velocity magnitude (mutates in place) |
| `wrapPosition()` | Screen wrap with padding (mutates in place) |

**Important:** All physics helpers mutate vectors in place for zero allocation.

---

## Collision System

Circle-based collision detection in `CollisionSystem.ts`:

| Check | Entities |
|-------|----------|
| `checkBulletPeachCollisions()` | Bullets vs Peaches |
| `checkShipPeachCollisions()` | Ship vs Peaches |
| `checkBulletBossCollisions()` | Bullets vs Boss |
| `checkBulletSatelliteCollisions()` | Bullets vs Satellites |
| `checkShipSeedCollisions()` | Ship vs Boss Seeds |
| `checkShipBossCollisions()` | Ship vs Boss Core |

Optimization: Uses squared distance (`distSq < radiusSumSq`) to avoid `sqrt()`.

---

## State Flow Diagram

```
                    ┌─────────────┐
                    │   LOADING   │
                    └──────┬──────┘
                           │ auto
                           ▼
                    ┌─────────────┐
              ┌─────│    MENU     │◄────────────────┐
              │     └──────┬──────┘                 │
              │            │ Play                   │
              │            ▼                        │
              │     ┌─────────────┐                 │
              │     │   PLAYING   │◄───┐            │
              │     └──┬───┬───┬──┘    │            │
              │        │   │   │       │            │
              │   Pause│   │   │Resume │            │
              │        ▼   │   │       │            │
              │  ┌─────────┴┐  │  ┌────┴────┐       │
              │  │  PAUSED  │──┘  │ CHAPTER │       │
              │  └──────────┘     │TRANSITION│      │
              │                   └────┬────┘       │
              │                        │            │
              │            ┌───────────┼───────────┐│
              │            ▼           ▼           ││
              │     ┌───────────┐ ┌─────────┐      ││
              └─────│ GAME_OVER │ │ VICTORY │──────┘│
                    └───────────┘ └─────────┘       │
                           │                        │
                           └────────────────────────┘
```

---

## Data Flow

### Update Cycle (per frame)

```
1. GameLoop.onUpdate(fixedDt)
   │
   ├─► Time.update(fixedDt)
   │   └─► Apply hit-pause, calculate effective dt
   │
   ├─► ParticleSystem.update(dt)
   │   └─► Age particles, apply gravity, recycle dead
   │
   ├─► SceneManager.updateScreenShake(dt)
   │   └─► Decay shake intensity, offset camera
   │
   └─► StateMachine.update(dt)
       └─► Current state's update() callback
           │
           ├─► InputManager.update()
           ├─► Ship.update(dt, input, camera)
           ├─► PeachManager.update(dt, camera)
           ├─► BulletManager.update(dt, camera)
           ├─► SpawnSystem.update(dt, shipPos)
           ├─► CollisionSystem checks
           └─► Score/Lives/Wave updates

2. GameLoop.onRender()
   │
   └─► SceneManager.render()
       └─► EffectComposer or direct render
```

---

## Audio Architecture

`SFXManager` uses WebAudio API with procedural sound generation:

| Sound | Generation Method |
|-------|-------------------|
| Thrust | White noise + low-pass filter (looping) |
| Bullet Fire | Sine oscillator beep |
| Peach Split | Filtered noise burst |
| Ship Damage | Sawtooth buzz |
| Boss Hit | Sine + noise thud |

Features:
- Lazy AudioContext initialization (user gesture requirement)
- Click-free gain ramping
- Reduced-motion volume reduction
- localStorage persistence for mute/volume

---

## Performance Considerations

### Targets
- Desktop: 60fps sustained
- Mobile (mid-range): 45-60fps
- Max load: 50 peaches + 100 bullets + 200 particles + boss

### Optimizations Applied
1. **Object pooling** — Zero allocation during gameplay
2. **Instanced rendering** — Single draw call per entity type
3. **Preallocated scratch objects** — No `new THREE.*` in update loops
4. **Squared distance collision** — Avoids `sqrt()` overhead
5. **Quality presets** — Low/medium/high post-processing tiers
6. **Manual chunk splitting** — Three.js vendor bundle separate

### Quality Presets

| Preset | Effects |
|--------|---------|
| Low | No post-processing (best performance) |
| Medium | Bloom (40%) + Vignette |
| High | Bloom (80%) + Vignette + Chromatic Aberration |

`prefers-reduced-motion` automatically forces low quality.

---

## Configuration

All tunable constants live in `src/config/tuning.ts`:

| Category | Examples |
|----------|----------|
| Ship | `SHIP_THRUST_ACCELERATION`, `SHIP_MAX_SPEED`, `SHIP_DAMPING` |
| Peach | `PEACH_LARGE_RADIUS`, `PEACH_MIN_DRIFT_SPEED` |
| Bullet | `BULLET_SPEED`, `BULLET_TTL_SECONDS` |
| Boss | `BOSS_HEALTH`, `BOSS_SATELLITE_COUNT` |
| Particles | `PARTICLE_POOL_CAPACITY`, `PARTICLE_LIFETIME_SECONDS` |
| Audio | `SFX_MASTER_VOLUME`, `SFX_THRUST_FREQUENCY` |
| Post-FX | `BLOOM_STRENGTH_HIGH`, `VIGNETTE_DARKNESS` |

Chapter definitions in `src/config/chapters.ts`:
- Title, subtitle, wave count
- Spawn patterns, boss flag
- Background tint (placeholder)

---

## Extension Points

### Adding a New Enemy Type

1. Create entity class in `src/entities/` following `Peach.ts` pattern
2. Create manager with instanced rendering following `PeachManager.ts`
3. Add collision checks in `CollisionSystem.ts`
4. Add tuning constants in `tuning.ts`
5. Integrate spawning in `SpawnSystem.ts`

### Adding a New Power-up

1. Create pickup entity and manager
2. Add collision detection for ship-pickup
3. Add effect application logic in ship or relevant system
4. Add tuning constants and scoring

### Adding a New Chapter

1. Add chapter definition in `chapters.ts`
2. Add any new enemy/pickup integrations
3. Update chapter count if needed

---

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| three | ^0.165.0 | 3D rendering (WebGL2) |
| typescript | ^5.7.2 | Type checking |
| vite | ^6.0.3 | Build tooling |
| terser | ^5.44.1 | Minification |

No runtime dependencies other than Three.js.
