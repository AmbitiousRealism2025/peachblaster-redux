# Peach Blaster — Mechanics Fixlist (First Draft Plan v1)

Context: Reviewed `AGENTS.md` and `progress.md` (note filename casing). The project is through Phases 1–11 with a fixed-timestep loop, pooled/instanced peaches + bullets, chapters, a boss system, and UI overlays. This plan targets the 4 reported mechanics issues without expanding scope.

## Goals (What “done” looks like)

- Starting a new run shows multiple moving peaches (not a single giant one at center).
- Ship feels spacey: speed builds with sustained thrust, and coasts/decays slowly after release (with a max speed cap).
- Firing is event-correct: 1 press → 1 shot; multiple presses → multiple shots; hold → consistent auto-fire.
- Ship spawn/respawn never starts in an immediate collision and is always visible.

## Issue Breakdown + Root Cause Hypotheses

### 1) “Giant Peach” appears at center; no other peaches visible; peaches appear not to move

Observed constraint: no boss health bar → not `MegaPeach`.

Likely root cause (high confidence): **instanced peach rendering ignores `instanceMatrix`**.

- `PeachManager` renders via `THREE.InstancedMesh` and updates per-instance matrices each frame.
- `src/rendering/PeachMaterial.ts` vertex shader currently computes:
  - `mvPosition = modelViewMatrix * vec4(position, 1.0)`
  - `vNormal = normalMatrix * normal`
  - It never applies `instanceMatrix`, so **every instance renders at the origin** even if simulation positions update.
- Result: all peaches “pile up” visually at `(0,0)`, reading as one large peach with bloom/highlight; motion is hidden because the shader always draws at origin.

Secondary contributors to confirm (lower confidence):
- Stale entities from previous state (not fully cleared on PLAYING enter).
- Wave spawn/update not running due to state timing (less likely given current `main.ts` wiring).

### 2) Ship momentum too low; stops quickly after thrust release

Likely root cause: `SHIP_DAMPING` is applied every frame regardless of thrust state.

- `SHIP_DAMPING = 0.92` per 60Hz frame results in extremely fast exponential decay.
- With damping applied during thrust as well, acceleration has to fight constant friction, reducing “build up” feel.

### 3) Firing mechanic should be: tap = 1 shot; multiple taps = multiple shots; hold = auto-fire

Likely root cause: firing is currently **state-based** (`isFiring()`) plus a cooldown.

- Taps inside the cooldown window are ignored (so “multiple presses” can fail to produce “multiple shots”).
- Requirement implies event-based behavior: **shoot on press events**, not “while the key is down”.

### 4) Ship spawns where a collision would happen (and currently looks hidden by center peach)

Contributors:
- New-run spawn position is hard-coded to `(0,0)` (`src/main.ts` PLAYING enter).
- Respawn after damage calls `ship.resetState()` which also resets to `(0,0)`.
- If issue #1 is present, all peaches render at origin → ship looks “behind” the peach until thrust moves it.
- Even after fixing #1, spawning at `(0,0)` is still unsafe if peaches are present there (or if a scattered/ring pattern spawns near center).

## Proposed Implementation Plan (Phased, Minimal Scope)

### Phase A — Fix instanced peach rendering (unblocks issues #1/#4 visibility)

1. Update `src/rendering/PeachMaterial.ts` vertex shader to support instancing:
   - Apply `instanceMatrix` when `USE_INSTANCING` is defined.
   - Apply instance transform to normals (at least `mat3(instanceMatrix)` then normalize).
2. Quick verification:
   - In DEV, start a run and confirm peaches appear around edges/patterns and drift.
   - Confirm the “giant peach at center” symptom is gone.

Acceptance criteria:
- At run start, you can see multiple distinct peaches, not a single center blob.
- Peaches visibly move over time (drift + wrap).

### Phase B — Harden run start/reset and spawn safety (fixes #4 and prevents stale state)

1. On `PLAYING` enter (starting a new run), clear world state explicitly:
   - Stop wave spawning.
   - Despawn all active peaches.
   - Reset bullets + trails.
   - Despawn boss manager (already present).
2. Add a `findSafeSpawnPosition(...)` helper (likely in `src/main.ts` or a small `src/systems/SpawnHelpers.ts`):
   - Sample random points within camera bounds.
   - Ensure minimum clearance from:
     - active peaches: `distance >= shipRadius + peachRadius + margin`
     - (optionally) boss/seeds when relevant
   - Fall back to center only if attempts fail (and optionally clear nearby peaches as a last resort).
3. Use the safe spawn helper for:
   - New-run ship spawn (`PLAYING.enter`)
   - Ship respawn after taking damage (currently uses `ship.resetState()` in collision handling)

Acceptance criteria:
- Starting a run never places the ship overlapping a peach.
- After losing a life, ship respawns clear of collisions.
- Ship is always visible immediately (even before thrust).

### Phase C — Fire input semantics: press vs hold (fix #3)

1. Extend `src/input/InputManager.ts` with fire edge detection:
   - Track `firePressedThisFrame` (keyboard `Space` keydown with `event.repeat === false`)
   - Track rising edge of `mobileControls.isFirePressed()` in `update()`
   - Convert fallback touch tap to a single-frame press event (instead of “2 frames firing”)
2. Update `src/entities/Ship.ts` firing logic:
   - On `firePressedThisFrame`: spawn exactly 1 bullet immediately.
   - While fire is held: keep an auto-fire timer/cooldown for repeat shots.
   - Keep pooling constraints: if pool is exhausted, skip spawn gracefully.
3. Optional fairness guard:
   - If needed, cap maximum tap-fire rate (or buffer taps) to avoid macros spamming beyond intended balance.

Acceptance criteria:
- Tap Space once → exactly 1 bullet.
- Tap repeatedly → 1 bullet per tap.
- Hold Space → continuous auto-fire at a steady interval.
- Mobile fire button mirrors keyboard behavior.

### Phase D — Ship momentum tuning (fix #2)

1. Adjust tuning in `src/config/tuning.ts`:
   - Replace `SHIP_DAMPING` with either:
     - a higher single value (closer to `1.0`), or
     - separate `SHIP_THRUST_DAMPING` vs `SHIP_COAST_DAMPING`.
2. Update `src/entities/Ship.ts` to apply damping appropriately:
   - If using separate values, apply weaker damping (more drift) when not thrusting.
3. Retune `SHIP_THRUST_ACCELERATION` and `SHIP_MAX_SPEED` together:
   - Sustained thrust reaches max speed in a satisfying time window.
   - Release yields a noticeable coast before decay.

Acceptance criteria:
- Ship speed ramps up with sustained thrust and remains capped at `SHIP_MAX_SPEED`.
- Releasing thrust causes a slow, smooth deceleration curve (space-like drift).
- Short taps add small, incremental velocity (no “instant stop”).

## Files Expected to Change

- `src/rendering/PeachMaterial.ts` (instancing in shader)
- `src/main.ts` (world reset + safe spawn helper usage)
- `src/input/InputManager.ts` (fire press events + hold tracking)
- `src/entities/Ship.ts` (firing logic + momentum/damping behavior)
- `src/config/tuning.ts` (new/updated ship damping + fire interval constants)

## Verification Checklist (Manual)

- Start game:
  - Multiple peaches visible and moving immediately.
  - Ship spawns visible and not overlapping any peach.
- Movement:
  - Hold thrust: speed increases smoothly up to cap.
  - Release: ship coasts and slowly decelerates.
- Shooting:
  - Single tap = single bullet.
  - Multiple taps = multiple bullets.
  - Hold = steady auto-fire.
- Respawn:
  - On damage, ship respawns in a safe spot (no instant collision).

## Notes / Risks

- The instancing shader fix is the key unblocker for the “giant center peach” symptom.
- Changing fire semantics can affect balance; keep bullet cooldown/interval as a tuning constant.
- Spawn safety should avoid heavy per-frame work; only run when spawning/respawning.

