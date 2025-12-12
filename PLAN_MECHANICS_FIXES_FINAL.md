# Peach Blaster — Mechanics Fixes Final Specification

**Document Type:** Refined Implementation Plan (Stage 2 Output)
**Source:** ChatGPT 5.2 first-draft `plan-mechanics-fixlist-v1.md`
**Refined by:** Claude Opus 4.5
**Date:** 2025-12-12

---

## Executive Summary

Four critical gameplay mechanics bugs prevent the game from being playable:

1. **Peaches render at origin** — Shader ignores instance matrices
2. **Ship stops too quickly** — Damping applied every frame regardless of thrust state
3. **Firing drops inputs** — State-based firing misses rapid taps during cooldown
4. **Ship spawns unsafely** — Hardcoded (0,0) spawn with no collision check

This plan provides atomic, YOLO-ready phases with exact file changes, TypeScript types, and verification steps.

---

## Root Cause Verification (Code Evidence)

### Issue #1: All Peaches Render at Origin
**File:** `src/rendering/PeachMaterial.ts:10`
```glsl
vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);  // BUG: No instanceMatrix
```
**Evidence:** Vertex shader transforms vertices using only `modelViewMatrix`, ignoring `instanceMatrix` that Three.js provides for instanced meshes. `PeachManager` correctly updates instance matrices (lines 98-109) but the shader never reads them.

### Issue #2: Ship Decelerates Too Fast
**File:** `src/entities/Ship.ts:137`
```typescript
PhysicsSystem.applyDamping(this.velocity, SHIP_DAMPING);  // Called every frame
```
**File:** `src/config/tuning.ts:25`
```typescript
export const SHIP_DAMPING = 0.92;  // 8% velocity loss per frame at 60Hz
```
**Evidence:** Damping is applied unconditionally. At 60fps, `0.92^60 ≈ 0.007` means 99.3% velocity loss per second. Ship feels like it's in molasses, not space.

### Issue #3: Rapid Fire Inputs Dropped
**File:** `src/entities/Ship.ts:211`
```typescript
if (!inputManager.isFiring() || this.fireCooldown > 0) {
  return;  // BUG: Taps during cooldown are silently lost
}
```
**File:** `src/input/InputManager.ts:138-148`
```typescript
public isFiring(): boolean {
  if (this.pressedKeys.has("Space")) {  // State-based, not event-based
    return true;
  }
  // ...
}
```
**Evidence:** `isFiring()` returns `true` while key is held (state-based). When `fireCooldown > 0`, the entire check fails—there's no queue or edge detection to catch rapid taps.

### Issue #4: Ship Spawns at Hardcoded Origin
**File:** `src/main.ts:248`
```typescript
ship.position.set(0, 0);  // New run spawn
```
**File:** `src/entities/Ship.ts:271`
```typescript
this.position.set(0, 0);  // resetState() after damage
```
**Evidence:** Both spawn paths use hardcoded (0,0). Combined with Issue #1 (all peaches at origin), ship appears "behind" the peach pile. Even with #1 fixed, no collision safety check exists.

---

## Implementation Phases

### Phase 1: Fix Instanced Peach Rendering

**Goal:** Peaches render at their correct world positions.

**Priority:** CRITICAL — Unblocks all other fixes and makes game visually functional.

#### Files to Modify

**`src/rendering/PeachMaterial.ts`** — Rewrite vertex shader for instancing

#### Implementation Steps

1.1. Replace the vertex shader with instancing support:

```glsl
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec2 vUv;

void main() {
  vUv = uv;

  // Apply instance matrix to position
  vec4 instancePosition = instanceMatrix * vec4(position, 1.0);
  vec4 mvPosition = modelViewMatrix * instancePosition;
  vViewPosition = -mvPosition.xyz;

  // Transform normal by instance matrix (rotation only, ignore scale for lighting)
  mat3 instanceNormalMatrix = mat3(instanceMatrix);
  vec3 transformedNormal = instanceNormalMatrix * normal;
  vNormal = normalize(normalMatrix * transformedNormal);

  gl_Position = projectionMatrix * mvPosition;
}
```

1.2. No changes needed to fragment shader or `createPeachMaterial()` function.

#### Verification

- [ ] `npm run dev` — no TypeScript or shader compilation errors
- [ ] Start game → multiple distinct peaches visible around screen edges
- [ ] Peaches drift and wrap correctly (not stuck at center)
- [ ] Peach lighting/shading still looks correct (normals transformed properly)

#### Risks

- **Normal matrix precision:** Using `mat3(instanceMatrix)` for normals works when scale is uniform (which it is for peaches). Non-uniform scale would require `transpose(inverse(mat3(instanceMatrix)))` but is unnecessary here.

---

### Phase 2: Ship Momentum Physics Overhaul

**Goal:** Ship builds speed with sustained thrust, coasts slowly after release, feels "spacey."

**Priority:** HIGH — Core feel issue affecting playability.

#### Files to Modify

1. **`src/config/tuning.ts`** — Add new constants
2. **`src/entities/Ship.ts`** — Conditional damping logic

#### New Tuning Constants

Add to `src/config/tuning.ts` after line 26 (after `SHIP_DAMPING`):

```typescript
/**
 * Per-frame damping factor while thrusting (at 60Hz).
 * Higher value = less drag while accelerating.
 * Set close to 1.0 to let speed build freely during thrust.
 */
export const SHIP_THRUST_DAMPING = 0.995;

/**
 * Per-frame damping factor while coasting (at 60Hz).
 * Lower than thrust damping to create gradual space-like deceleration.
 * 0.985 at 60fps ≈ 60% velocity retained after 1 second.
 */
export const SHIP_COAST_DAMPING = 0.985;
```

**Tuning rationale:**
- `SHIP_THRUST_DAMPING = 0.995` → 0.995^60 ≈ 0.74 (26% loss/sec while thrusting)
- `SHIP_COAST_DAMPING = 0.985` → 0.985^60 ≈ 0.40 (60% loss/sec while coasting)
- Old `SHIP_DAMPING = 0.92` → 0.92^60 ≈ 0.007 (99% loss/sec — way too aggressive)

#### Ship.ts Changes

2.1. Update imports at top of file (add new constants):

```typescript
import {
  BULLET_FIRE_COOLDOWN_SECONDS,
  BULLET_SPEED,
  PARTICLE_SPEED_MIN,
  PARTICLE_THRUSTER_EMIT_RATE,
  SHIP_COAST_DAMPING,      // ADD
  SHIP_THRUST_DAMPING,     // ADD
  SHIP_INVULNERABILITY_BLINK_INTERVAL,
  SHIP_INVULNERABILITY_DURATION,
  SHIP_MAX_SPEED,
  SHIP_ROTATION_SPEED,
  SHIP_SIZE,
  SHIP_THRUST_ACCELERATION,
  WORLD_WRAP_PADDING
} from "../config/tuning";
```

2.2. Replace line 137 (`PhysicsSystem.applyDamping(this.velocity, SHIP_DAMPING);`) with:

```typescript
// Apply appropriate damping based on thrust state
const dampingFactor = thrusting ? SHIP_THRUST_DAMPING : SHIP_COAST_DAMPING;
PhysicsSystem.applyDamping(this.velocity, dampingFactor);
```

2.3. Remove `SHIP_DAMPING` from imports (no longer used in Ship.ts).

#### Optional: Keep SHIP_DAMPING for Backward Compatibility

If other code uses `SHIP_DAMPING`, keep it in `tuning.ts` with a deprecation comment:

```typescript
/**
 * @deprecated Use SHIP_THRUST_DAMPING and SHIP_COAST_DAMPING instead.
 * Retained for any external references.
 */
export const SHIP_DAMPING = 0.92;
```

#### Verification

- [ ] `npm run dev` — no TypeScript errors
- [ ] Hold thrust → ship accelerates smoothly to max speed
- [ ] Release thrust → ship coasts for 2-3 seconds before stopping
- [ ] Tap thrust briefly → small velocity boost that persists
- [ ] Compare feel: should feel like space, not underwater

#### Tuning Adjustments (if needed)

If ship still stops too fast: increase `SHIP_COAST_DAMPING` toward 0.99.
If ship feels too "slippery" / hard to stop: decrease `SHIP_COAST_DAMPING` toward 0.97.

---

### Phase 3: Event-Based Firing System

**Goal:** Single tap = single shot, multiple taps = multiple shots, hold = auto-fire.

**Priority:** HIGH — Input responsiveness affects core gameplay feel.

#### Files to Modify

1. **`src/input/InputManager.ts`** — Add fire press edge detection
2. **`src/entities/Ship.ts`** — Consume press events + auto-fire logic
3. **`src/config/tuning.ts`** — Add auto-fire interval constant

#### Phase 3.1: InputManager Fire Press Detection

Add to `src/input/InputManager.ts`:

3.1.1. Add private fields after line 11:

```typescript
private fireJustPressed = false;
private wasFirePressed = false;
```

3.1.2. Add public method after `isFiring()` (after line 148):

```typescript
/**
 * Returns true for exactly one frame when fire input transitions from released to pressed.
 * Use this for "tap to fire" semantics.
 */
public wasFireJustPressed(): boolean {
  return this.fireJustPressed;
}
```

3.1.3. Modify `update()` method (currently lines 156-160) to detect fire edge:

```typescript
public update(): void {
  // Detect fire button press edge (released → pressed)
  const fireCurrentlyPressed = this.isFireCurrentlyHeld();
  this.fireJustPressed = fireCurrentlyPressed && !this.wasFirePressed;
  this.wasFirePressed = fireCurrentlyPressed;

  // Existing touch fire countdown
  if (this.touchFireFramesRemaining > 0) {
    this.touchFireFramesRemaining -= 1;
  }
}

/**
 * Internal helper: returns true while fire input is held (not edge-detected).
 * Used for auto-fire while holding.
 */
private isFireCurrentlyHeld(): boolean {
  if (this.pressedKeys.has("Space")) {
    return true;
  }
  if (this.mobileControls?.isFirePressed()) {
    return true;
  }
  return false;
}
```

3.1.4. Update `isFiring()` to include touch tap as press event:

```typescript
public isFiring(): boolean {
  // Touch tap triggers fireJustPressed via touchFireFramesRemaining
  // which sets wasFirePressed false → true on tap
  return this.isFireCurrentlyHeld() || this.touchFireFramesRemaining > 0;
}
```

#### Phase 3.2: Ship Firing Logic Overhaul

Add to `src/config/tuning.ts` after `BULLET_FIRE_COOLDOWN_SECONDS`:

```typescript
/**
 * Interval between auto-fire shots while holding fire button (seconds).
 * Should be >= BULLET_FIRE_COOLDOWN_SECONDS.
 */
export const BULLET_AUTO_FIRE_INTERVAL_SECONDS = 0.15;
```

Modify `src/entities/Ship.ts`:

3.2.1. Update imports to include new constant:

```typescript
import {
  BULLET_AUTO_FIRE_INTERVAL_SECONDS,  // ADD
  BULLET_FIRE_COOLDOWN_SECONDS,
  // ... rest unchanged
} from "../config/tuning";
```

3.2.2. Add private field after `fireCooldown` (line 34):

```typescript
private autoFireTimer = 0;
```

3.2.3. Replace `updateFiring()` method (lines 204-230) with:

```typescript
private updateFiring(dt: number, inputManager: InputManager): void {
  if (!this.bulletManager) {
    return;
  }

  // Decrease cooldown
  this.fireCooldown = Math.max(0, this.fireCooldown - dt);

  // Handle press event: fire immediately if cooldown allows
  if (inputManager.wasFireJustPressed() && this.fireCooldown <= 0) {
    this.fireOneBullet();
    this.autoFireTimer = BULLET_AUTO_FIRE_INTERVAL_SECONDS;
    return;
  }

  // Handle held input: auto-fire at interval
  if (inputManager.isFiring()) {
    this.autoFireTimer -= dt;
    if (this.autoFireTimer <= 0 && this.fireCooldown <= 0) {
      this.fireOneBullet();
      this.autoFireTimer = BULLET_AUTO_FIRE_INTERVAL_SECONDS;
    }
  } else {
    // Reset auto-fire timer when not holding
    this.autoFireTimer = 0;
  }
}

private fireOneBullet(): void {
  if (!this.bulletManager) {
    return;
  }

  const forwardDirection = new THREE.Vector2(
    Math.cos(this.rotation),
    Math.sin(this.rotation)
  );
  const spawnOffset = SHIP_SIZE * 0.8;
  const spawnPosition = this.position
    .clone()
    .addScaledVector(forwardDirection, spawnOffset);
  const bulletVelocity = this.velocity
    .clone()
    .addScaledVector(forwardDirection, BULLET_SPEED);

  this.bulletManager.spawn(spawnPosition, bulletVelocity);
  SFXManager.getInstance().playBulletFire();
  this.fireCooldown = BULLET_FIRE_COOLDOWN_SECONDS;
}
```

3.2.4. Reset `autoFireTimer` in `resetState()` (add after line 267):

```typescript
this.autoFireTimer = 0;
```

#### Verification

- [ ] `npm run dev` — no TypeScript errors
- [ ] Single tap Space → exactly 1 bullet fires
- [ ] Rapid taps (faster than cooldown) → 1 bullet per tap (no drops)
- [ ] Hold Space → continuous fire at steady interval
- [ ] Release and re-tap → immediate fire (no delay)
- [ ] Mobile fire button → same behavior as keyboard

#### Risks

- **Macro spam:** Very fast external input devices could fire faster than intended. The `fireCooldown` provides a hard cap regardless of input rate.

---

### Phase 4: Safe Ship Spawn System

**Goal:** Ship never spawns overlapping a peach; always visible immediately.

**Priority:** HIGH — Prevents unfair deaths and visual confusion.

#### Files to Modify

1. **`src/config/tuning.ts`** — Add spawn safety constants
2. **`src/main.ts`** — Add safe spawn helper and integrate

#### New Tuning Constants

Add to `src/config/tuning.ts` after `PEACH_SPAWN_SAFE_ZONE_RADIUS`:

```typescript
/**
 * Minimum clearance between ship spawn position and any peach (world units).
 * Should exceed ship collision radius + largest peach radius + safety margin.
 */
export const SHIP_SPAWN_CLEARANCE = 3.0;

/**
 * Maximum attempts to find a safe spawn position before fallback.
 */
export const SHIP_SPAWN_MAX_ATTEMPTS = 20;
```

#### main.ts Changes

4.1. Add imports at top of file:

```typescript
import {
  // ... existing imports ...
  SHIP_SPAWN_CLEARANCE,
  SHIP_SPAWN_MAX_ATTEMPTS,
  SHIP_SIZE
} from "./config/tuning";
```

4.2. Add helper function after imports, before `initializeApp()`:

```typescript
/**
 * Finds a spawn position for the ship that doesn't overlap any active peaches.
 * Returns a safe position, or (0,0) as fallback if no safe spot found.
 */
function findSafeSpawnPosition(
  camera: THREE.OrthographicCamera,
  peachManager: PeachManager,
  bossManager: MegaPeachManager | null
): THREE.Vector2 {
  const activePeaches = peachManager.getActivePeaches();
  const shipRadius = SHIP_SIZE * 0.5;

  // Calculate camera bounds with margin
  const marginX = (camera.right - camera.left) * 0.15;
  const marginY = (camera.top - camera.bottom) * 0.15;
  const minX = camera.left + marginX;
  const maxX = camera.right - marginX;
  const minY = camera.bottom + marginY;
  const maxY = camera.top - marginY;

  for (let attempt = 0; attempt < SHIP_SPAWN_MAX_ATTEMPTS; attempt++) {
    // Random position within camera bounds (with margin)
    const x = minX + Math.random() * (maxX - minX);
    const y = minY + Math.random() * (maxY - minY);
    const candidate = new THREE.Vector2(x, y);

    let isSafe = true;

    // Check against all active peaches
    for (const peach of activePeaches) {
      const distance = candidate.distanceTo(peach.position);
      const requiredClearance = shipRadius + peach.getCollisionRadius() + SHIP_SPAWN_CLEARANCE;
      if (distance < requiredClearance) {
        isSafe = false;
        break;
      }
    }

    // Check against boss if active
    if (isSafe && bossManager?.isActive()) {
      const boss = bossManager.getBoss();
      if (boss) {
        const bossDistance = candidate.distanceTo(boss.position);
        // Boss is large; use generous clearance
        if (bossDistance < SHIP_SPAWN_CLEARANCE * 2) {
          isSafe = false;
        }
      }

      // Check against seeds
      if (isSafe) {
        for (const seed of bossManager.getSeeds()) {
          const seedDistance = candidate.distanceTo(seed.position);
          if (seedDistance < SHIP_SPAWN_CLEARANCE) {
            isSafe = false;
            break;
          }
        }
      }
    }

    if (isSafe) {
      return candidate;
    }
  }

  // Fallback: return center (shouldn't happen often)
  if (import.meta.env.DEV) {
    console.warn("Could not find safe spawn position; using center");
  }
  return new THREE.Vector2(0, 0);
}
```

4.3. Modify `PLAYING.enter` handler (around line 248) to use safe spawn:

Replace:
```typescript
ship.position.set(0, 0);
ship.velocity.set(0, 0);
ship.rotation = Math.PI / 2;
```

With:
```typescript
const safeSpawn = findSafeSpawnPosition(camera, peachManager, megaPeachManager);
ship.position.copy(safeSpawn);
ship.velocity.set(0, 0);
ship.rotation = Math.PI / 2;
```

4.4. Create a respawn helper for damage scenarios. Add after `findSafeSpawnPosition`:

```typescript
/**
 * Respawns ship at a safe position after taking damage.
 */
function respawnShipSafely(
  ship: Ship,
  camera: THREE.OrthographicCamera,
  peachManager: PeachManager,
  bossManager: MegaPeachManager | null
): void {
  const safePosition = findSafeSpawnPosition(camera, peachManager, bossManager);
  ship.position.copy(safePosition);
  ship.velocity.set(0, 0);
  ship.rotation = Math.PI / 2;
  ship.activateInvulnerability();
}
```

4.5. Replace ship damage respawn in `PLAYING.update` (ship-peach collision, around line 481):

Replace:
```typescript
ship.resetState();
ship.activateInvulnerability();
```

With:
```typescript
respawnShipSafely(ship, camera, peachManager, megaPeachManager);
```

4.6. Replace ship damage respawn for seed collision (around line 351):

Replace:
```typescript
ship.resetState();
ship.activateInvulnerability();
```

With:
```typescript
respawnShipSafely(ship, camera, peachManager, megaPeachManager);
```

4.7. Replace ship damage respawn for boss collision (around line 358):

Replace:
```typescript
ship.resetState();
ship.activateInvulnerability();
```

With:
```typescript
respawnShipSafely(ship, camera, peachManager, megaPeachManager);
```

#### Verification

- [ ] `npm run dev` — no TypeScript errors
- [ ] New game → ship spawns visible, not overlapping any peach
- [ ] Take damage → ship respawns in clear area
- [ ] During boss fight → ship respawns away from boss/seeds
- [ ] Edge case: many peaches on screen → ship still finds safe spot or uses center fallback

#### Risks

- **Performance:** `findSafeSpawnPosition` runs only on spawn/respawn (not every frame), so O(peaches * attempts) is acceptable.
- **Fallback case:** If arena is completely full (unlikely), ship spawns at center with invulnerability active, giving player time to escape.

---

## Files Changed Summary

| File | Phase | Change Type |
|------|-------|-------------|
| `src/rendering/PeachMaterial.ts` | 1 | Modify (vertex shader) |
| `src/config/tuning.ts` | 2, 3, 4 | Modify (add constants) |
| `src/entities/Ship.ts` | 2, 3 | Modify (damping + firing) |
| `src/input/InputManager.ts` | 3 | Modify (fire edge detection) |
| `src/main.ts` | 4 | Modify (safe spawn helpers) |

---

## Full Verification Checklist

### After All Phases Complete

- [ ] **Start game:** Multiple peaches visible and drifting (not a single center blob)
- [ ] **Ship visible:** Ship spawns in clear area, immediately visible
- [ ] **Movement feel:**
  - [ ] Hold thrust → speed builds smoothly to cap
  - [ ] Release thrust → ship coasts for several seconds
  - [ ] Short taps → incremental velocity boosts
- [ ] **Firing feel:**
  - [ ] Single tap = single bullet
  - [ ] Rapid taps = one bullet per tap (no drops)
  - [ ] Hold = steady auto-fire stream
- [ ] **Respawn safety:**
  - [ ] After taking damage, ship respawns in clear area
  - [ ] No immediate re-collision on respawn
- [ ] **Mobile:** Touch joystick + fire button behave same as keyboard
- [ ] **Performance:** No frame rate regression (peach shader change is trivial)

---

## Execution Order for Traycer

**Recommended phase order:** 1 → 2 → 3 → 4

**Rationale:**
- Phase 1 is the critical unblocker; without it, visual debugging is impossible
- Phase 2 and 3 are independent and could theoretically parallelize, but sequential is safer
- Phase 4 depends on Phase 1 being complete (need to see where peaches are to validate safe spawn)

Each phase is atomic and can be verified independently before proceeding.

---

## Notes for Implementers

1. **No new files required** — all changes are modifications to existing files
2. **TypeScript strict mode** — all code must compile without errors
3. **Preserve existing patterns** — follow the singleton/manager patterns already in use
4. **Avoid hot-path allocations** — `fireOneBullet()` still uses `.clone()` which is acceptable since firing isn't 60Hz
5. **Test on both desktop and mobile** — especially firing mechanics

---

## Appendix: Original User Problem Statement

> 1. On start game "Giant Peach" appears at center of the screen, ship spawns in behind it. There are no other peaches visible no movement from peaches.
> 2. Ship momentum needs to be increased. As it stands right now when thrust is released ship comes to a quick stop, this takes place in space so the ship should drift more and slowly decelerate.
> 3. We need to alter the ship firing mechanic. A single press of the "fire" key should trigger a single projectile. Multiple presses should trigger multiple projectiles.
> 4. Ship should not spawn in the same place where a collision would happen.
