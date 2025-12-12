# Fix Plan: Mechanics Fixes Implementation Failures

**Purpose:** Fix the 2 failing phases from ChatGPT 5.2's initial implementation
**Priority:** CRITICAL — Game is unplayable without these fixes
**Scope:** Phase 1 (Peach Shader) and Phase 3 (Firing System)

---

## Summary of Failures

| Phase | Issue | Impact |
|-------|-------|--------|
| 1 | Vertex shader ignores `instanceMatrix` | All peaches render at origin — game broken |
| 3 | InputManager missing edge detection | Rapid fire inputs dropped — original bug persists |

---

## Fix 1: Peach Instanced Rendering (CRITICAL)

### Problem
The vertex shader in `PeachMaterial.ts` does not apply `instanceMatrix`, so all instanced peaches render at world origin (0,0) instead of their actual positions.

### File to Modify
`src/rendering/PeachMaterial.ts`

### Current Code (Lines 8-14, broken)
```glsl
void main() {
  vUv = uv;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPosition.xyz;
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * mvPosition;
}
```

### Required Code (Replace entire vertex shader)
```glsl
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec2 vUv;

void main() {
  vUv = uv;

  // Apply instance matrix to position BEFORE model-view transform
  vec4 instancePosition = instanceMatrix * vec4(position, 1.0);
  vec4 mvPosition = modelViewMatrix * instancePosition;
  vViewPosition = -mvPosition.xyz;

  // Transform normal by instance rotation for correct per-instance lighting
  mat3 instanceNormalMatrix = mat3(instanceMatrix);
  vec3 transformedNormal = instanceNormalMatrix * normal;
  vNormal = normalize(normalMatrix * transformedNormal);

  gl_Position = projectionMatrix * mvPosition;
}
```

### What Changed
1. Added `instanceMatrix * vec4(position, 1.0)` to transform vertex positions per-instance
2. Added `mat3(instanceMatrix) * normal` to transform normals per-instance
3. Order: instance transform → model-view transform → projection

### Verification
- [ ] No shader compilation errors (check browser console)
- [ ] Multiple peaches visible at game start (not single blob at center)
- [ ] Peaches drift and wrap correctly
- [ ] Peach lighting looks correct (normals working)

---

## Fix 2: Fire Input Edge Detection (CRITICAL)

### Problem
`InputManager` only tracks whether fire is currently held (`isFiring()`), not when it was just pressed. This means rapid taps during the cooldown window are lost.

### Files to Modify
1. `src/input/InputManager.ts` — Add edge detection
2. `src/entities/Ship.ts` — Use edge detection in firing logic

---

### Fix 2A: InputManager.ts

#### Add Private Fields (after existing private fields, around line 11)
```typescript
private fireJustPressed = false;
private wasFirePressed = false;
```

#### Add Public Method (after `isFiring()` method)
```typescript
/**
 * Returns true for exactly one frame when fire transitions from released to pressed.
 * Use this for tap-to-fire semantics.
 */
public wasFireJustPressed(): boolean {
  return this.fireJustPressed;
}
```

#### Add Private Helper Method (after `isFiring()`)
```typescript
/**
 * Returns true while fire input is actively held (not edge-detected).
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

#### Modify `update()` Method
Find the existing `update()` method and add edge detection at the START:

```typescript
public update(): void {
  // Detect fire button press edge (released → pressed)
  const fireCurrentlyPressed = this.isFireCurrentlyHeld();
  this.fireJustPressed = fireCurrentlyPressed && !this.wasFirePressed;
  this.wasFirePressed = fireCurrentlyPressed;

  // Existing touch fire countdown logic
  if (this.touchFireFramesRemaining > 0) {
    this.touchFireFramesRemaining -= 1;
  }
}
```

---

### Fix 2B: Ship.ts

#### Verify Import
Ensure `BULLET_AUTO_FIRE_INTERVAL_SECONDS` is imported from tuning.ts. If not present, add to imports:
```typescript
import {
  BULLET_AUTO_FIRE_INTERVAL_SECONDS,
  // ... other imports
} from "../config/tuning";
```

#### Replace `updateFiring()` Method
Find the existing `updateFiring()` method and replace entirely:

```typescript
private updateFiring(dt: number, inputManager: InputManager): void {
  if (!this.bulletManager) {
    return;
  }

  // Decrease cooldown
  this.fireCooldown = Math.max(0, this.fireCooldown - dt);

  // PRIORITY 1: Fire immediately on press event (tap-to-fire)
  if (inputManager.wasFireJustPressed() && this.fireCooldown <= 0) {
    this.fireOneBullet();
    this.autoFireTimer = BULLET_AUTO_FIRE_INTERVAL_SECONDS;
    return;
  }

  // PRIORITY 2: Auto-fire while held
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
```

#### Verify `fireOneBullet()` Helper Exists
If `fireOneBullet()` doesn't exist, add it:

```typescript
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

#### Verify `autoFireTimer` Field Exists
If `autoFireTimer` doesn't exist as a private field, add it:
```typescript
private autoFireTimer = 0;
```

#### Update `resetState()` to Reset Timer
In the `resetState()` method, ensure `autoFireTimer` is reset:
```typescript
this.autoFireTimer = 0;
```

---

### Fix 2 Verification
- [ ] No TypeScript compilation errors
- [ ] Single tap Space → exactly 1 bullet fires
- [ ] Rapid taps → 1 bullet per tap (no inputs dropped)
- [ ] Hold Space → continuous auto-fire at steady interval
- [ ] Release then re-tap → immediate fire
- [ ] Mobile fire button behaves same as keyboard

---

## Execution Order

```
1. Fix PeachMaterial.ts vertex shader (Fix 1)
   └─ Verify: Peaches render at correct positions

2. Fix InputManager.ts edge detection (Fix 2A)
   └─ Verify: No TypeScript errors

3. Fix Ship.ts firing logic (Fix 2B)
   └─ Verify: Tap/hold firing works correctly
```

---

## Files Changed Summary

| File | Changes |
|------|---------|
| `src/rendering/PeachMaterial.ts` | Replace vertex shader (add instanceMatrix) |
| `src/input/InputManager.ts` | Add fireJustPressed, wasFirePressed, wasFireJustPressed(), isFireCurrentlyHeld(), update edge detection |
| `src/entities/Ship.ts` | Replace updateFiring() with dual-path logic |

---

## Post-Fix Verification Checklist

### Visual
- [ ] Multiple peaches visible at game start
- [ ] Peaches at different positions (not all at center)
- [ ] Peaches drift and wrap at screen edges
- [ ] Ship visible and not hidden behind peaches

### Movement (Phase 2 — already passing)
- [ ] Hold thrust → speed builds
- [ ] Release thrust → gradual coast/deceleration

### Firing
- [ ] Single tap = single bullet
- [ ] Multiple rapid taps = multiple bullets (1 per tap)
- [ ] Hold = continuous auto-fire
- [ ] No dropped inputs

### Spawning (Phase 4 — already passing)
- [ ] Ship spawns clear of peaches
- [ ] Respawn after damage is in safe location

---

## Notes for Implementation

1. **Vertex shader is GLSL** — syntax errors won't show as TypeScript errors; check browser console
2. **Edge detection timing** — `wasFireJustPressed()` is true for exactly 1 frame per press
3. **Auto-fire vs cooldown** — `autoFireTimer` controls interval between auto-fire shots; `fireCooldown` is the hard minimum between any shots
4. **Test on mobile** — Fire button should behave identically to keyboard Space
