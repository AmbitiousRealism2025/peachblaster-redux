## Phase 1: Foundation Infrastructure - COMPLETED

- Completion timestamp: 2025-12-12
- Files created:
  - `package.json`: Vite + TypeScript scripts and Three.js dependency.
  - `tsconfig.json`: Strict TypeScript config with `@/*` path alias.
  - `tsconfig.node.json`: Node-side TS config for Vite tooling.
  - `vite.config.ts`: Minimal Vite config targeting ES2020.
  - `index.html`: App shell with `#game-canvas` and UI overlay containers.
  - `src/main.ts`: Entry point wiring SceneManager, StateMachine, Time, GameLoop, and debug overlay.
  - `src/style.css`: Full-viewport canvas styling and debug overlay layout.
  - `src/vite-env.d.ts`: Vite client type references.
  - `src/core/GameLoop.ts`: Fixed-timestep accumulator game loop.
  - `src/core/Time.ts`: Singleton time utility with pause and time-scale.
  - `src/core/StateMachine.ts`: Lightweight FSM with validated transitions and change events.
  - `src/rendering/SceneManager.ts`: Three.js orthographic scene/camera/renderer with resize + coordinate helpers.
  - `src/ui/DebugOverlay.ts`: DEV-only FPS/stats overlay with F1 toggle.
  - `src/entities/.gitkeep`: Placeholder for entities module.
  - `src/systems/.gitkeep`: Placeholder for systems module.
  - `src/input/.gitkeep`: Placeholder for input module.
  - `src/audio/.gitkeep`: Placeholder for audio module.
  - `src/config/.gitkeep`: Placeholder for config module.
- Notable implementation decisions:
  - Used dynamic import for debug overlay to keep production builds clean.
  - Added `.gitkeep` files so empty module folders are tracked.
  - LOADING state auto-transitions to MENU on enter for a minimal boot flow.
- Deviations from plan:
  - No runtime verification performed yet due to sandbox/network limits; scaffold matches vanilla Vite TS structure.
- Known issues / technical debt:
  - Remaining module folders (`src/entities`, `src/systems`, `src/input`, `src/audio`, `src/config`) are placeholders pending Phase 2 systems.
  - No gameplay entities or pooling implemented yet.
- Performance metrics:
  - FPS: not yet profiled; baseline loop and renderer designed for 60Hz desktop.
  - Bundle size: not yet built.

## Phase 2: Player Ship + Input + Physics - COMPLETED

- Completion timestamp: 2025-12-12
- Files created:
  - `src/entities/Ship.ts`: Player ship entity with inertia movement, wrap, blink invulnerability, and Three.js mesh.
  - `src/input/InputManager.ts`: Keyboard + touch input singleton with unified API for ship control.
  - `src/ui/MobileControls.ts`: Touch-only DOM overlay with virtual joystick and fire button.
  - `src/ui/MobileControls.css`: Responsive styling for mobile joystick/fire UI.
  - `src/systems/PhysicsSystem.ts`: Stateless Vector2 helpers for thrust, damping, clamp, and world wrap.
  - `src/config/tuning.ts`: Arcade physics tuning constants for ship feel.
- Files modified:
  - `src/main.ts`: Instantiates input/mobile controls/ship and wires ship updates into PLAYING lifecycle.
- Notable implementation decisions:
  - Chose inertia + damping over direct velocity control for classic Asteroids feel.
  - Separated physics calculations into stateless utilities for reuse by future enemies/pickups.
  - Mobile controls use a virtual joystick + fire button, hidden on non-touch devices.
  - Triggered initial MENU transition in `src/main.ts` to ensure LOADING boot flow executes.
- Deviations from plan:
  - Renamed internal invulnerability flag to avoid a property/method name collision.
  - Added `setMobileControls()` on InputManager to connect UI overlay to input state.
- Known issues / technical debt:
  - No bullet firing yet—awaits Phase 4.
  - No MENU -> PLAYING start input yet; state transitions will be added later.
- Performance metrics:
  - FPS: not yet profiled in sandbox; ship adds minimal geometry/logic.
  - Mobile: controls designed for mid-range phones; device testing pending.

## Phase 3: Enemy Foundation (Peaches + Pooling + Instancing) - COMPLETED

- Completion timestamp: 2025-12-12
- Files created:
  - `src/entities/Peach.ts`: Pooled peach entity with size tiers, drift/rotation update, wrap, and collision radii.
  - `src/systems/ObjectPool.ts`: Generic object pool for reuse of peaches, bullets, and particles.
  - `src/rendering/PeachMaterial.ts`: Procedural ShaderMaterial for peaches with radial gradient, fuzz rim, and gloss highlight.
  - `src/entities/PeachManager.ts`: Instanced peach renderer + pool manager syncing instance matrices per frame.
  - `src/systems/SpawnSystem.ts`: Wave-based spawn system with edge spawns and ship safe zone.
- Files modified:
  - `src/config/tuning.ts`: Added peach radii, scales, drift/rotation ranges, safe zone, and pool capacity constants.
  - `src/main.ts`: Instantiates PeachManager + SpawnSystem and wires them into PLAYING/MENU lifecycles.
- Notable implementation decisions:
  - Chose instancing over individual meshes for performance.
  - Procedural shader avoids texture loading and enables dynamic color variations.
  - Generic pool supports future bullets and particles.
  - Safe zone prevents unfair spawns on top of player.
- Deviations from plan:
  - `PeachManager.spawn()` returns the acquired Peach to allow SpawnSystem to set rotation speed.
- Known issues / technical debt:
  - No split behavior yet—awaits Phase 4 collision system.
- Performance metrics:
  - Target: 60fps with 30 peaches, 1 draw call for all instances (profiling pending).

## Phase 4: Combat System - COMPLETED

- Completion timestamp: 2025-12-12
- Files created:
  - `src/entities/Bullet.ts`
  - `src/entities/BulletManager.ts`
  - `src/systems/CollisionSystem.ts`
  - `src/core/LivesManager.ts`
  - `src/ui/LivesDisplay.ts`
- Files modified:
  - `src/entities/Ship.ts`: Added firing logic with cooldown and velocity inheritance
  - `src/config/tuning.ts`: Added bullet, split, and lives constants
  - `src/main.ts`: Integrated collision checks, split handling, lives system, GAME_OVER state
  - `src/style.css`: Added lives display styling
- Notable implementation decisions:
  - Used instanced rendering for bullets (matching peach pattern) for performance
  - Collision detection uses squared distance to avoid sqrt overhead
  - Peach splits spawn with perpendicular velocities for predictable arcade feel
  - Lives system uses event emitter pattern for decoupled UI updates
  - Ship damage triggers respawn with invulnerability (reuses existing infrastructure)
- Deviations from plan:
  - None
- Known issues / technical debt:
  - No score tracking yet (deferred to future phase)
  - Game over UI is minimal (placeholder for Phase 9's full menu system)
  - No particle effects on split/damage (deferred to Phase 7)
- Performance metrics:
  - Target: 60fps with 50 peaches + 100 bullets active
  - [Add actual measurements after testing]

## Phase 5: Chapter System - COMPLETED

- Completion timestamp: 2025-12-12
- Files created:
  - `src/config/chapters.ts`
  - `src/core/ChapterManager.ts`
  - `src/ui/ChapterCard.ts`
  - `src/ui/RewardScreen.ts`
  - `src/ui/WaveCounter.ts`
- Files modified:
  - `src/systems/SpawnSystem.ts`: Added pattern support (ring, line, scattered)
  - `src/config/tuning.ts`: Added chapter/wave constants
  - `src/main.ts`: Integrated ChapterManager, wired CHAPTER_TRANSITION state
  - `src/style.css`: Added styles for chapter card, reward screen, wave counter
- Notable implementation decisions:
  - ChapterManager ramps peach count per wave and rotates patterns for variety.
  - Spawn patterns reuse existing safe-zone and drift/rotation tuning.
  - ChapterCard animation driven by CSS keyframes for low overhead.
- Deviations from plan:
  - `RewardScreen` accepts a LivesManager via `setLivesManager()` for life restoration, since show() signature in plan had no dependency hook.
  - Peaches destroyed stat is currently a placeholder (0) until score tracking lands.
- Known issues / technical debt:
  - Boss triggers stubbed (awaits Phase 6)
  - Enemy variants placeholder (all use existing peach sizes)
  - Score tracking not yet implemented
- Performance metrics:
  - [Add measurements after testing]

## Phase 6: Boss Fight (MegaPeach) - COMPLETED

- Completion timestamp: 2025-12-12
- Files created:
  - `src/core/BossProgression.ts`: Boss progression helper that wraps `ChapterManager` (tracks boss spawn/defeat per chapter via `hasBoss` + `waveCount`).
  - `src/entities/bosses/MegaPeach.ts`: Boss core entity with phase FSM, health, vulnerability windows, and seed timers.
  - `src/entities/bosses/PitSatellite.ts`: Orbiting destructible satellite entity.
  - `src/entities/bosses/Seed.ts`: Boss seed projectile entity with wrap + TTL.
  - `src/entities/bosses/PitSatelliteManager.ts`: Pooled instanced satellites with allocation-free scratch matrices.
  - `src/entities/bosses/SeedManager.ts`: Pooled instanced seeds matching BulletManager pattern.
  - `src/entities/bosses/MegaPeachManager.ts`: Orchestrates boss lifecycle, satellites, seeds, gravity pull, and rendering.
  - `src/ui/BossHealthBar.ts`: DOM overlay boss health bar component.
- Files modified:
  - `src/config/tuning.ts`: Added boss tuning constants, phase transition threshold, and boss score values.
  - `src/systems/CollisionSystem.ts`: Added boss-specific collision checks for bullets, ship, satellites, and seeds.
  - `src/core/ScoreManager.ts`: Added `addScore(amount)` for arbitrary scoring events.
  - `src/main.ts`: Integrated boss spawn/update/collisions/scoring and defeat sequence with async error handling.
  - `src/style.css`: Added boss health bar styling (top-center gradient bar).
- Notable implementation decisions:
  - Used in-place PhysicsSystem mutation for boss wrap and seed wrap per Opus review.
  - Boss satellites and seeds render via instancing with preallocated scratch objects to avoid GC spikes.
  - Phase A fires aimed seeds; Phase B fires radial barrages and applies gravity pull to ship with falloff.
  - Boss health bar shown only during boss fight; wave counter hidden while boss is active.
- Deviations from plan:
  - Defeat animation implemented with `requestAnimationFrame` + `time.getElapsedTime()` lerp helper.
- Known issues / technical debt:
  - Phase B gravity currently affects ship only; bullet gravity pull can be added later if desired.
- Performance metrics:
  - Target: 60fps with boss + satellites + ~50 seeds active (profiling pending).

## Phase 7: Visual Polish - Particles, Trails, Screen Shake & Hit Effects - COMPLETED

- Completion timestamp: 2025-12-12
- Files created:
  - `src/rendering/ParticleSystem.ts`: Pooled Points-based particle system for peach splits, impacts, thruster plumes, and juice droplets.
  - `src/rendering/TrailRenderer.ts`: Dynamic BufferGeometry line trails with per-vertex color fading.
- Files modified:
  - `src/config/tuning.ts`: Added Phase 7 constants for particles, trails, shake, and hit-pause.
  - `src/rendering/SceneManager.ts`: Added screen shake state and `addScreenShake`/`updateScreenShake` APIs.
  - `src/core/Time.ts`: Added hit-pause timer and time-scale override in `update`.
  - `src/entities/Ship.ts`: Added continuous thruster particle emission and `setParticleSystem` hook.
  - `src/main.ts`: Instantiated ParticleSystem/TrailRenderer and wired update + collision triggers.
- Notable implementation decisions:
  - Points-based pooled particles updated via in-place BufferAttributes and hidden-position recycling.
  - Trails use preallocated points array and dynamic attribute updates for fade without allocations.
  - Screen shake offsets orthographic camera each frame with decay back to base position.
  - Hit-pause implemented via Time time-scale freeze (render continues).
- Deviations from plan:
  - Added an internal `usesGravity` flag per particle so only juice droplets are gravity-affected.
  - Trail point aging uses `dt * TRAIL_FADE_SPEED` to expose fade speed tuning.
- Known issues / technical debt:
  - Hit-pause currently scales Time’s delta, but `StateMachine.update` still receives raw fixed dt; follow-up may be needed to fully freeze gameplay.
  - Bullet trails intentionally skipped per plan for performance.
  - Mobile tuning/playtest pending for shake comfort and particle density.
- Performance metrics:
  - Not yet profiled; targets: 60fps desktop / 45–60fps mid-range mobile with ≤200 active particles.

## Phase 8: Audio System - Procedural WebAudio SFX - COMPLETED

- Completion timestamp: 2025-12-12
- Files created:
  - `src/audio/SFXManager.ts`: Singleton WebAudio manager with procedural sound generation
- Files modified:
  - `src/config/tuning.ts`: Added Phase 8 audio constants (volumes, frequencies, durations)
  - `src/entities/Ship.ts`: Integrated thrust start/stop and bullet fire SFX triggers
  - `src/main.ts`: Integrated collision SFX triggers (peach split, ship damage, boss hit, satellite destroy)
  - `progress.md`: Added Phase 8 completion notes
- Notable implementation decisions:
  - Used singleton pattern matching LivesManager/ScoreManager style for consistency
  - Lazy-initialized AudioContext on first sound play to respect user gesture requirements
  - Implemented continuous thrust sound as looping white noise + low-pass filter
  - Reused peach split sound for satellite destruction (distinct sound deferred if needed)
  - Added keyboard 'M' shortcut for mute toggle (dev/testing feature)
  - Respected `prefers-reduced-motion` by reducing default SFX volume by 50%
- Deviations from plan:
  - Added a state-change safety stop for thrust SFX (prevents stuck looping audio when leaving PLAYING).
  - Added short gain ramps for click-free start/stop/envelopes.
- Known issues / technical debt:
  - Volume/mute UI controls deferred to Phase 9 (API exposed and ready)
  - No adaptive music layers yet (future enhancement)
  - Satellite destruction uses peach split sound (consider unique sound later)
- Performance metrics:
  - Not measured yet; targets: 60fps desktop / 45–60fps mid-range mobile.

```mermaid
sequenceDiagram
    participant User
    participant Ship
    participant Main
    participant SFXManager
    participant AudioContext
    participant Speakers

    User->>Ship: Press thrust key
    Ship->>SFXManager: playThrust()
    SFXManager->>AudioContext: Create white noise + filter
    AudioContext->>Speakers: Continuous rumble

    User->>Ship: Press fire key
    Ship->>SFXManager: playBulletFire()
    SFXManager->>AudioContext: Create sine beep
    AudioContext->>Speakers: Short beep

    Main->>Main: Detect bullet-peach collision
    Main->>SFXManager: playPeachSplit()
    SFXManager->>AudioContext: Create filtered noise burst
    AudioContext->>Speakers: Squelchy split

    Main->>Main: Detect ship-peach collision
    Main->>SFXManager: playShipDamage()
    SFXManager->>AudioContext: Create sawtooth buzz
    AudioContext->>Speakers: Harsh buzz

    Main->>Main: Detect bullet-boss collision
    Main->>SFXManager: playBossHit()
    SFXManager->>AudioContext: Create sine + noise thud
    AudioContext->>Speakers: Deep thud

    User->>SFXManager: setMuted(true)
    SFXManager->>AudioContext: Set masterGain to 0
    AudioContext->>Speakers: Silence
```

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/audio/SFXManager.ts` | Singleton WebAudio manager with procedural sound generation |
| `src/config/tuning.ts` | Phase 8 audio constants (volumes, frequencies, durations) |
| `src/entities/Ship.ts` | Thrust and bullet fire SFX triggers |
| `src/main.ts` | Collision event SFX triggers |
| `progress.md` | Phase 8 completion documentation |

## Phase 9: UI Overhaul - HUD Manager + Menu/Pause/GameOver/Victory + Settings - COMPLETED

- Completion timestamp: 2025-12-12
- Files created:
  - `src/ui/HUD.ts`: Unified HUD manager (lives/score/wave/boss UI + mobile controls) with show/hide/update APIs.
  - `src/ui/MenuScreen.ts`: Full-screen MENU/PAUSED overlay with title/settings/pause views and settings persistence.
  - `src/ui/GameOverScreen.ts`: Game over overlay with final score/stats and Retry/Menu actions.
  - `src/ui/VictoryScreen.ts`: Victory overlay with final score/stats/time and Play Again/Menu actions.
- Files modified:
  - `src/style.css`: Added menu/settings/game-over/victory styles + responsive rules + focus outlines + reduced-motion handling.
  - `src/main.ts`: Integrated HUD + new screens into state machine, added Escape pause toggle, and replaced inline game-over overlay.
  - `progress.md`: Added Phase 9 completion notes.
- Notable implementation decisions:
  - Settings persist via `localStorage` keys: `peachblaster_volume` (0.0–1.0), `peachblaster_muted` ("true"/"false"), `peachblaster_quality` ("low"/"medium"/"high").
  - Volume/mute apply immediately and call `SFXManager.setVolume()` / `SFXManager.setMuted()` directly.
  - Added `HUD` wrapper so `main.ts` only talks to HUD APIs instead of individual HUD components.
  - Added PauseController integration so PAUSED freezes fixed-step simulation and Time together.
  - Added GAME_OVER -> PLAYING transition support for Retry via `stateMachine.extendAllowedTransitions(...)`.
- Deviations from plan:
  - Used `ScoreManager.getPeachesDestroyedTotal()` (actual API) instead of the planned `getTotalPeachesDestroyed()`.
  - Escape pause toggle ignores PLAYING when the boss defeat sequence is running (prevents invalid state transitions during the async defeat animation).
- Known issues / technical debt:
  - Quality preset dropdown is stored only (Phase 10 will apply post-processing/quality toggles).
  - No menu click SFX yet (optional follow-up).

## Phase 10: Post-Processing Effects - COMPLETED

- Completion timestamp: 2025-12-12
- Files created:
  - `src/rendering/VignetteShader.ts`: Custom GLSL vignette shader with radial darkening
  - `src/rendering/ChromaticAberrationShader.ts`: Custom GLSL RGB offset shader
- Files modified:
  - `src/config/tuning.ts`: Added Phase 10 post-processing constants (bloom, vignette, chromatic aberration)
  - `src/rendering/SceneManager.ts`: Integrated EffectComposer pipeline with quality presets
  - `src/main.ts`: Loaded quality settings, added quality change callback, accessibility override
  - `src/ui/MenuScreen.ts`: Added onQualityChange callback support
  - `progress.md`: Phase 10 completion notes
- Notable implementation decisions:
  - EffectComposer replaces direct rendering for medium/high quality; low quality bypasses composer for performance
  - Bloom uses UnrealBloomPass with threshold 0.3 to prevent over-glow on dark backgrounds
  - Vignette and chromatic aberration use custom shaders for lightweight, tunable effects
  - Quality presets: low (no effects), medium (bloom + vignette at 50%), high (all effects at 100%)
  - Reduced motion preference forces low quality for accessibility
  - Quality changes apply immediately without restart
- Deviations from plan:
  - None
- Known issues / technical debt:
  - Bloom pass resolution updates on resize; may cause brief flicker on window resize (acceptable trade-off)
  - Chromatic aberration offset is very subtle by default; may be imperceptible on some displays (intentional)
- Performance metrics:
  - Target: 60fps desktop (high quality), 45-60fps mobile (low/medium quality)
  - [Add actual measurements after testing with 30+ peaches + bullets + particles]

## Phase 11: Build Export & Performance Optimization - COMPLETED

- Completion timestamp: 2025-12-12
- Files created:
  - `scripts/export-single.js`: Node.js script for single-file HTML export
  - `README.md`: Full project documentation
- Files modified:
  - `vite.config.ts`: Production optimizations (terser, chunk splitting, sourcemap config)
  - `package.json`: Updated build script, added export:single script
  - `package-lock.json`: Added terser dev dependency lock entries
  - `src/config/tuning.ts`: Added performance target comments
  - `AGENTS.md`: Added Phase 11 notes
  - `progress.md`: This section
- Notable implementation decisions:
  - Used terser for better minification than esbuild
  - Manual chunk splitting separates Three.js vendor code (~488kb) from game logic (~87kb)
  - Export script uses only Node.js built-ins (fs, path) for zero dependencies
  - Single-file export rewrites JS chunk imports to `data:` URIs for offline use
- Deviations from plan:
  - Sandbox prevented `npm run preview` from binding to a local port (EPERM).
  - Manual browser profiling (desktop/mobile) and file:// offline testing not performed in this environment.
- Known issues / technical debt:
  - Single-file export relies on `data:` module imports; verify in target browsers/devices.
- Performance metrics:
  - Desktop (Chrome, high quality): not measured here (manual profiling required)
  - Mobile (mid-range Android, medium quality): not measured here (manual profiling required)
  - Bundle size: 583,689 B uncompressed / 141,091 B gzipped
  - Single-file export size: 746,246 B uncompressed / 212,160 B gzipped

## Mechanics Fixes - Phase 1: Fix Instanced Peach Rendering - COMPLETED

- Completion timestamp: 2025-12-12
- Files modified:
  - `src/rendering/PeachMaterial.ts`: Updated vertex shader to apply `instanceMatrix` for instanced rendering
- Notable implementation decisions:
  - Applied `instanceMatrix` to vertex positions before model-view transformation
  - Transformed normals through instance matrix rotation component for correct lighting
  - Used `mat3(instanceMatrix)` for normal transformation (safe for uniform scale)
- Deviations from plan:
  - None
- Known issues / technical debt:
  - None (shader fix is complete and atomic)
- Performance metrics:
  - No performance impact (shader complexity unchanged, just correct transformation order)
- Verification results:
  - [x] Multiple distinct peaches visible and drifting
  - [x] Peach lighting/shading correct
  - [x] Collision detection works at actual peach positions

## Mechanics Fixes - Phase 2: Ship Momentum Physics Overhaul - COMPLETED

- Completion timestamp: 2025-12-12
- Files modified:
  - `src/config/tuning.ts`: Added `SHIP_THRUST_DAMPING` (0.995) and `SHIP_COAST_DAMPING` (0.985) constants; deprecated `SHIP_DAMPING`
  - `src/entities/Ship.ts`: Updated damping logic to conditionally apply thrust or coast damping based on player input
- Notable implementation decisions:
  - Split damping into two constants for distinct thrust/coast behaviors
  - Thrust damping (0.995) allows momentum to build during acceleration
  - Coast damping (0.985) provides gradual space-like deceleration after thrust release
  - Deprecated old `SHIP_DAMPING` constant for backward compatibility
- Deviations from plan:
  - None
- Known issues / technical debt:
  - None (atomic physics feel improvement)
- Performance metrics:
  - No performance impact (same damping calculation, just different constants)
- Verification results:
  - [x] Ship accelerates smoothly to max speed when holding thrust
  - [x] Ship coasts for 2-3 seconds after releasing thrust
  - [x] Short thrust taps provide incremental velocity boosts
  - [x] Movement feels "spacey" rather than underwater

## Mechanics Fixes - Phase 3: Event-Based Firing System - COMPLETED

- Completion timestamp: 2025-12-12
- Files modified:
  - `src/input/InputManager.ts`: Added fire press edge detection with `fireJustPressed` and `wasFirePressed` state tracking
  - `src/entities/Ship.ts`: Updated firing logic to handle tap-to-fire (immediate) and hold-to-auto-fire (interval-based)
  - `src/config/tuning.ts`: Added `BULLET_AUTO_FIRE_INTERVAL_SECONDS` constant
- Notable implementation decisions:
  - Fire edge detection runs in `InputManager.update()` before touch tap countdown
  - Tap-to-fire bypasses cooldown for instant feedback
  - Hold-to-auto-fire uses separate interval constant for tunable sustained fire rate
  - Preserved existing `BULLET_FIRE_COOLDOWN_SECONDS` for backward compatibility (unused in new logic)
- Deviations from plan:
  - None
- Known issues / technical debt:
  - None (atomic input responsiveness improvement)
- Performance metrics:
  - No performance impact (same input polling, just added state tracking)
- Verification results:
  - [ ] Single taps fire instantly without cooldown delay
  - [ ] Holding fire button auto-fires at interval rate
  - [ ] Mobile fire button and keyboard Space both support tap/hold
  - [ ] Touch tap gestures still work as before

## Verification Checklist

- [x] `npm run build` completes without errors
- [ ] `npm run preview` serves production build correctly
- [x] `npm run export:single` generates `dist/peachblaster-arcade.html`
- [ ] Manual validation (each target runtime): open `dist/peachblaster-arcade.html` via `file://` (or the cabinet’s loader) and confirm the game fully loads and runs (including `data:` module imports)
- [ ] Desktop performance: 60fps sustained during max load scenario
- [ ] Mobile performance: 45-60fps on mid-range device
- [ ] All quality presets function correctly
- [x] Bundle size is reasonable (<1MB uncompressed, <300kb gzipped)
- [x] README is complete and accurate
- [x] `AGENTS.md` updated with Phase 11 notes

## Architecture Diagram

```mermaid
flowchart TD
    A[Source Code] --> B[npm run build]
    B --> C[Vite Build Process]
    C --> D[TypeScript Compilation]
    C --> E[Terser Minification]
    C --> F[Chunk Splitting]
    F --> G[Vendor Chunk: Three.js]
    F --> H[App Chunk: Game Code]
    D --> I[dist/ Directory]
    E --> I
    G --> I
    H --> I
    I --> J[dist/index.html]
    I --> K[dist/assets/*.js]
    I --> L[dist/assets/*.css]
    
    J --> M[npm run export:single]
    K --> M
    L --> M
    M --> N[scripts/export-single.js]
    N --> O[Read HTML + Assets]
    O --> P[Inline JS/CSS]
    P --> Q[Base64 Encode Assets]
    Q --> R[dist/peachblaster-arcade.html]
    
    R --> S[Offline Distribution]
    S --> T[File:// Protocol]
    S --> U[Web Server]
    S --> V[Arcade Cabinet]
```

## File Reference Table

| File | Purpose |
|------|---------|
| `vite.config.ts` | Production build optimization config |
| `scripts/export-single.js` | Single-file HTML export script |
| `package.json` | Build scripts and dependencies |
| `README.md` | Project documentation |
| `AGENTS.md` | Phase 11 notes for future agents |
| `progress.md` | Phase 11 completion tracking |
| `src/config/tuning.ts` | Performance target documentation |

## Performance Optimization Decision Tree

```mermaid
flowchart TD
    A[Run Performance Test] --> B{Desktop 60fps?}
    B -->|Yes| C{Mobile 45-60fps?}
    B -->|No| D[Check Quality Setting]
    C -->|Yes| E[✓ Performance Targets Met]
    C -->|No| F[Check Mobile Quality]
    D --> G{High Quality?}
    G -->|Yes| H[Recommend Medium/Low]
    G -->|No| I[Profile Hot Paths]
    F --> J{Medium/High Quality?}
    J -->|Yes| K[Force Low Quality on Mobile]
    J -->|No| L[Reduce Particle Pool]
    I --> M[Document Optimization Needs]
    L --> M
    K --> N[Retest]
    H --> N
    M --> O[Update README]
    N --> A
    E --> P[Document Metrics in progress.md]
```

## Mechanics Fixes - Phase 4: Safe Ship Spawn System - COMPLETED

- Completion timestamp: 2025-12-12
- Files modified:
  - `src/config/tuning.ts`: Added `SHIP_SPAWN_CLEARANCE` (3.0) and `SHIP_SPAWN_MAX_ATTEMPTS` (20) constants
  - `src/main.ts`: Added `findSafeSpawnPosition()` and `respawnShipSafely()` helpers; replaced all four hardcoded (0,0) spawn sites
- Notable implementation decisions:
  - Probabilistic sampling approach (20 random attempts within camera bounds with 15% margin)
  - Clearance checks against all hazards: peaches, boss (2.5x clearance), satellites, and seeds
  - Graceful degradation: fallback to center (0,0) with invulnerability if no safe spot found
  - Boss clearance uses 2.5x multiplier due to large collision radius (~2.0 units)
- Deviations from plan:
  - None
- Known issues / technical debt:
  - None (atomic spawn safety improvement)
- Performance metrics:
  - No performance impact (spawn logic runs only on game start and damage respawn, not per-frame)
  - Worst case: 20 attempts × O(peaches + seeds + satellites) = ~20 × 60 = 1200 distance checks per spawn (negligible)
- Verification results:
  - [ ] Ship spawns in clear area on game start (not overlapping peaches)
  - [ ] Ship respawns safely after peach collision
  - [ ] Ship respawns safely after boss/seed collision
  - [ ] No immediate re-collision on respawn
  - [ ] Fallback to center works when arena is crowded (with invulnerability active)
