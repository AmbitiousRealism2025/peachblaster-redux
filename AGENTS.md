# AGENTS.md — Peach Blaster Project Guide

This file gives future agents fast context on goals, constraints, and conventions for **Peach Blaster**.

## Agent Roles

This project uses a **multi-agent workflow** with distinct responsibilities:

### ChatGPT 5.2 — Planning & Implementation
- **Planning role:** Creates first-draft plans and specifications
- **Implementation role:** Primary coding agent during YOLO orchestration
- **Responsibilities:**
  - Draft initial implementation plans
  - Write production code following project conventions
  - Execute coding tasks during Traycer orchestration
  - Perform verification steps within YOLO loops

### Claude (Opus 4.5) — Refinement & Review
- **Planning role:** Refines ChatGPT 5.2's drafts into final specifications
- **Review role:** Phase review after YOLO loop completion
- **Responsibilities:**
  - Read and refine first-draft plans into final drafts
  - Identify gaps, risks, and architectural concerns in plans
  - Conduct phase reviews after implementation completes
  - Validate code quality, performance, and design decisions
  - Write and maintain documentation
- **Reference:** See `CLAUDE.md` for detailed Claude agent guidelines

### Traycer — Orchestration
- **Primary role:** YOLO orchestration and task breakdown
- **Responsibilities:**
  - Break final drafts into detailed phases optimized for YOLO execution
  - Orchestrate ChatGPT 5.2 for coding and verification steps
  - Manage the implementation loop until phase completion

### Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│  1. DRAFT        ChatGPT 5.2 creates first-draft plan           │
│                           ↓                                     │
│  2. REFINE       Claude Opus reviews and refines → final draft  │
│                           ↓                                     │
│  3. ORCHESTRATE  Traycer breaks into phases for YOLO execution  │
│                           ↓                                     │
│  4. IMPLEMENT    Traycer runs YOLO loop with ChatGPT 5.2        │
│                  (coding + verification cycles)                 │
│                           ↓                                     │
│  5. REVIEW       Claude Opus conducts phase review              │
└─────────────────────────────────────────────────────────────────┘
```

### Role Boundaries
- **ChatGPT 5.2:** Drafting (*what* could work) and coding (*how* to build it)
- **Claude Opus:** Refining (*what* should work) and reviewing (*did it work well?*)
- **Traycer:** Orchestrating (*when* and *in what order*)

---

## Project Summary

Peach Blaster is a web‑based arcade shooter inspired by Asteroids, expanded into a **5‑chapter campaign with a final boss**. The aesthetic is **semi‑realistic juicy fruit wackiness**: gooey, glossy peaches with fuzzy rim light in surreal cosmic biomes. Tone is playful fruit‑mysticism with occasional mild, cartoony body‑horror metamorphosis — strange but not grim.

## High‑Level Goals

1. **Feel first:** tight, readable arcade controls with inertia + damping tuned for fun.
2. **Juice & beauty:** procedural fruit materials, particles, trails, bloom, and satisfying SFX.
3. **Chaptered campaign:** ~30–40 min full clear, with 5 themed chapters + mini‑bosses + final boss.
4. **Mobile friendly:** ergonomic thumb controls, stable performance on mid‑range phones.
5. **Exportable builds:** primary dev uses tooling, but keep a **single‑file arcade export** path.

## Chosen Tech Stack

- **Build:** `Vite + TypeScript`.
- **Render:** `Three.js` (WebGL2), orthographic 2.5D camera, instancing for scale.
- **Physics:** custom lightweight inertia + wrap + circle collision for MVP.
  - Optional upgrade to `rapier2d` only if complexity demands it.
- **UI:** DOM/CSS overlay.
- **Audio:** WebAudio procedural SFX first; adaptive synth layers later.

Agents should not introduce heavy frameworks unless there is a clear, agreed benefit.

## Gameplay Pillars

- **Classic loop:** thrust/rotate/wrap/shoot.
- **Splitting peaches:** Large → 2 Medium → 2 Small.
- **Variants over time:** each chapter adds one enemy type + one pickup.
- **Risk/reward:** combo meter + juice meter for specials; resets on damage.
- **Boss fights:** vulnerability windows, clear telegraphs, escalation per phase.

## Content Roadmap (Locked)

See `MASTER_PLAN.md` for the authoritative plan. Default campaign pacing:
- 5 chapters, each 4–6 waves + mini‑boss.
- Final boss: “The First Peach / Jam Singularity” with 3 phases.
- Full clear target: 30–40 minutes.

## Code/Style Conventions

- TypeScript, strict mode on.
- Prefer small, pure helper functions over large classes.
- Use object pooling for bullets/peaches/particles.
- Keep rendering and simulation decoupled (fixed timestep).
- Avoid one‑letter names; keep identifiers descriptive.
- No external image assets for peaches; textures are procedural.

## Quality Bar

When adding features, ensure:
- **Readability:** enemy silhouettes + attacks are easy to parse.
- **Performance:** 60fps desktop, 45–60fps mid‑range phones; add quality toggles if needed.
- **Accessibility:** respect reduced‑motion toggles; avoid critical info by color alone.

## How to Run (expected)

Once scaffold exists:
- Install deps: `npm install`
- Dev server: `npm run dev`
- Build: `npm run build`
- Arcade export (if present): `npm run export:single`

If scripts differ, update this file.

## Collaboration Notes

- Keep changes aligned with the master plan unless explicitly asked to pivot.
- If you think a pivot is necessary, propose it in a concise note and wait for approval.
- Avoid scope creep; land vertical slices end‑to‑end before expanding.

## Opus Review Fixes (Phases 1–5, pre‑Phase 6)

The following items from `PHASE_1-5_REVIEW.md` were addressed before starting Phase 6:

- **Hot‑path allocation cleanup:** Removed per‑frame `new THREE.*` in update loops.
  - `PeachManager` and `BulletManager` now reuse preallocated `Vector3/Quaternion/Matrix4` scratch objects and a cached hidden matrix for instanced rendering.
  - `SpawnSystem` uses scratch `Vector2`s for spawn positions, directions, and velocities instead of allocating each spawn.
  - `CollisionSystem.splitPeach` reduces temp allocations and uses `Vector2.rotateAround` for split velocities.
  - `PhysicsSystem` was rewritten to **mutate vectors in place** (apply thrust/damping/clamp/wrap without cloning). Call sites in `Ship`, `Peach`, and `Bullet` were updated accordingly; future code should not assume these helpers return new vectors.

- **Score tracking implemented:** Added `ScoreManager` (mirrors `LivesManager` style) plus tuning constants and a HUD `ScoreDisplay`.
  - Score increments on bullet‑peach kills based on peach size.
  - Tracks peaches destroyed per chapter and total run.
  - Reward screen now shows real `peachesDestroyed` for the completed chapter.

- **Async state safety:** Wrapped the `CHAPTER_TRANSITION` async IIFE in `try/catch` with logging and a safe fallback transition on failure.

- **Minor cleanup:** Removed duplicate `ship.mesh.visible = false` in MENU state.

Opus also recommends two follow‑up fix stages to schedule after boss work begins:
- **Soon (Phases 6–7):** extract remaining magic numbers in `SpawnSystem`, apply chapter background tints, add JSDoc to public APIs.
- **Later (Phase 8+):** set up a test framework, add critical unit tests, and do a mobile playtest pass to tune controls.

## Phase 6 Notes (Boss Progression)

- Boss progression rules live in `src/core/BossProgression.ts` (not `src/core/ChapterManager.ts`).
- `BossProgression.startChapter(chapterManager)` snapshots `chapter.hasBoss` and resets per-chapter boss state.
- `BossProgression.shouldSpawnBoss(chapterManager)` spawns the boss once the chapter has a boss and the last wave completes (`getCurrentWave() >= waveCount`).
- After defeat, the boss flow in `src/main.ts` transitions to `CHAPTER_TRANSITION` (or `VICTORY` for the final chapter); `CHAPTER_TRANSITION` advances chapters and calls `BossProgression.startChapter()` for the next chapter.
- If you need to change boss progression behavior, modify `BossProgression` (and its call sites) rather than adding boss-specific APIs to `ChapterManager`.

## Phase 9 Notes (UI + Settings)

- Unified in-game HUD lives in `src/ui/HUD.ts` (wraps lives/score/wave/boss UI + mobile controls).
- Menu/pause/settings overlay lives in `src/ui/MenuScreen.ts`; game-over and victory overlays are in `src/ui/GameOverScreen.ts` and `src/ui/VictoryScreen.ts`.
- Settings persistence keys:
  - `peachblaster_volume` (0.0–1.0)
  - `peachblaster_muted` ("true"/"false")
  - `peachblaster_quality` ("low"/"medium"/"high", placeholder for Phase 10)
- ScoreManager total peaches API is `getPeachesDestroyedTotal()` (used for Game Over/Victory stats).
- PAUSED state uses `PauseController` to freeze GameLoop + Time; Escape toggles PLAYING ↔ PAUSED (pause is ignored while the boss defeat sequence is running).

## Phase 11 Notes (Build & Export)

- Production build uses Vite with terser minification and manual chunk splitting (Three.js vendor chunk separate).
- Single-file export script (`scripts/export-single.js`) inlines all JS/CSS/assets into `dist/peachblaster-arcade.html`.
- Run `npm run export:single` for offline-ready arcade build.
- Performance targets: 60fps desktop, 45-60fps mid-range mobile (max load: 50 peaches + 100 bullets + 200 particles + boss).
- Quality presets (low/medium/high) provide performance scaling; reduced-motion forces low quality.
- README documents all build commands, controls, architecture, and performance expectations.

## Mechanics Fixes Notes (Post-Phase 11)

- **Phase 1 (Instanced Peach Rendering):** Fixed vertex shader in `src/rendering/PeachMaterial.ts` to apply `instanceMatrix` for correct instanced rendering. Peaches now render at their individual positions instead of all at origin.
- Remaining phases (Ship Momentum, Event-Based Firing, Safe Spawn) are handled by other engineers per the mechanics fixes plan.
- **Phase 2 (Ship Momentum Physics):** Implemented conditional damping system with separate thrust/coast damping factors. Ship now builds momentum during thrust and coasts smoothly in space. Old `SHIP_DAMPING` constant deprecated but retained for compatibility.
- **Phase 3 (Event-Based Firing):** Implemented fire press edge detection in `InputManager` with `wasFireJustPressed()` and `isFireCurrentlyHeld()` methods. Ship now fires instantly on tap (bypassing cooldown) and auto-fires at `BULLET_AUTO_FIRE_INTERVAL_SECONDS` when held. Improves input responsiveness without breaking existing touch/keyboard/mobile button inputs.
- **Phase 4 (Safe Ship Spawn System):** Implemented probabilistic safe spawn system with `findSafeSpawnPosition()` helper that samples random positions within camera bounds and validates clearance against all hazards (peaches, boss, satellites, seeds). Replaced all four hardcoded (0,0) spawn sites in `main.ts` (initial spawn in PLAYING.enter + three damage respawn sites) with `respawnShipSafely()` calls. Added `SHIP_SPAWN_CLEARANCE` (3.0) and `SHIP_SPAWN_MAX_ATTEMPTS` (20) tuning constants. System provides graceful degradation (fallback to center with invulnerability) if no safe spot found after max attempts.
