# Final Draft Specifications — Technical Debt Resolution

**Status:** Final Draft for Traycer YOLO Execution
**Created:** 2025-12-12
**Execution Model:** ChatGPT 5.2

---

## Pre-Execution Audit Summary

After reviewing the codebase, several issues from PHASE_1-5_REVIEW.md were **already fixed** during later phases:

| Issue | Status | Evidence |
|-------|--------|----------|
| PeachManager allocations | **FIXED** | Lines 19-24 have scratch objects |
| BulletManager allocations | **FIXED** | Lines 17-21 have scratch objects |
| SpawnSystem allocations | **FIXED** | Lines 34-39 have scratch objects |
| PhysicsSystem allocations | **FIXED** | Line 10 has tempForward scratch |
| Duplicate visibility toggle | **FIXED** | Only one `ship.mesh.visible = false` at main.ts:219 |
| Async error handling | **FIXED** | try/catch added at main.ts:370-412, 551-608 |
| Score tracking | **FIXED** | ScoreManager exists |

### Remaining Issues (6 total)

1. **Ship.ts updateFiring()** — allocates Vector2 on every fire (lines 215-225)
2. **CollisionSystem.ts splitPeach()** — allocates Vector2 via .clone() (lines 190-216)
3. **Ship.ts** — BulletManager is optional, should be required
4. **SceneManager.ts** — backgroundTint not implemented
5. **SpawnSystem.ts** — magic numbers at line 80 (calculation uses `0.6` and `0.15`)
6. **UI classes** — throw errors on missing DOM, should degrade gracefully

---

## Phase R1: Remaining Hot Path Allocations

**Priority:** High
**Estimated Effort:** 1 hour
**Files:** 2

### R1.1: Fix Ship.ts updateFiring() Allocations

**File:** `src/entities/Ship.ts`
**Lines:** 215-230

**Current code (allocates on every fire):**
```typescript
private updateFiring(dt: number, inputManager: InputManager): void {
  if (!this.bulletManager) {
    return;
  }

  this.fireCooldown = Math.max(0, this.fireCooldown - dt);

  if (!inputManager.isFiring() || this.fireCooldown > 0) {
    return;
  }

  const forwardDirection = new THREE.Vector2(  // ALLOCATION
    Math.cos(this.rotation),
    Math.sin(this.rotation)
  );
  const spawnOffset = SHIP_SIZE * 0.8;
  const spawnPosition = this.position          // ALLOCATION via clone()
    .clone()
    .addScaledVector(forwardDirection, spawnOffset);
  const bulletVelocity = this.velocity         // ALLOCATION via clone()
    .clone()
    .addScaledVector(forwardDirection, BULLET_SPEED);

  this.bulletManager.spawn(spawnPosition, bulletVelocity);
  // ...
}
```

**Required changes:**

1. Add class-level scratch objects after line 42:
```typescript
private readonly _fireDirection = new THREE.Vector2();
private readonly _fireSpawnPos = new THREE.Vector2();
private readonly _fireBulletVel = new THREE.Vector2();
```

2. Replace updateFiring() implementation (lines 215-230):
```typescript
private updateFiring(dt: number, inputManager: InputManager): void {
  if (!this.bulletManager) {
    return;
  }

  this.fireCooldown = Math.max(0, this.fireCooldown - dt);

  if (!inputManager.isFiring() || this.fireCooldown > 0) {
    return;
  }

  this._fireDirection.set(
    Math.cos(this.rotation),
    Math.sin(this.rotation)
  );
  const spawnOffset = SHIP_SIZE * 0.8;

  this._fireSpawnPos
    .copy(this.position)
    .addScaledVector(this._fireDirection, spawnOffset);

  this._fireBulletVel
    .copy(this.velocity)
    .addScaledVector(this._fireDirection, BULLET_SPEED);

  this.bulletManager.spawn(this._fireSpawnPos, this._fireBulletVel);
  SFXManager.getInstance().playBulletFire();
  this.fireCooldown = BULLET_FIRE_COOLDOWN_SECONDS;
}
```

**Verification:**
- [ ] Build passes: `npm run build`
- [ ] Ship fires bullets correctly
- [ ] No new THREE.Vector2 in updateFiring (check via code review)

---

### R1.2: Fix CollisionSystem.ts splitPeach() Allocations

**File:** `src/systems/CollisionSystem.ts`
**Lines:** 181-247

**Current code (allocates on every split):**
```typescript
public static splitPeach(
  peach: Peach,
  peachManager: PeachManager
): Peach[] {
  // ...
  const parentVelocity = peach.velocity.clone();        // ALLOCATION
  // ...
  const baseDirection =
    speed > 0
      ? parentVelocity.clone().normalize()              // ALLOCATION
      : new THREE.Vector2(1, 0);                        // ALLOCATION

  const perpendicular = new THREE.Vector2(              // ALLOCATION
    -baseDirection.y,
    baseDirection.x
  ).multiplyScalar(0.3);

  const spawnPositionA = peach.position.clone().add(perpendicular);  // ALLOCATION
  const spawnPositionB = peach.position.clone().sub(perpendicular);  // ALLOCATION
  // ...
  const rotatedVelocityA = parentVelocity               // ALLOCATION
    .clone()
    .rotateAround(CollisionSystem.origin, angleSpreadRad)
    .multiplyScalar(PEACH_SPLIT_VELOCITY_MULTIPLIER);
  const rotatedVelocityB = parentVelocity               // ALLOCATION
    .clone()
    .rotateAround(CollisionSystem.origin, -angleSpreadRad)
    .multiplyScalar(PEACH_SPLIT_VELOCITY_MULTIPLIER);
  // ...
}
```

**Required changes:**

1. Add static scratch objects after line 27:
```typescript
// Scratch objects for splitPeach (reused across calls)
private static readonly _splitParentVel = new THREE.Vector2();
private static readonly _splitBaseDir = new THREE.Vector2();
private static readonly _splitPerp = new THREE.Vector2();
private static readonly _splitPosA = new THREE.Vector2();
private static readonly _splitPosB = new THREE.Vector2();
private static readonly _splitVelA = new THREE.Vector2();
private static readonly _splitVelB = new THREE.Vector2();
```

2. Replace splitPeach() implementation:
```typescript
public static splitPeach(
  peach: Peach,
  peachManager: PeachManager
): Peach[] {
  const nextSize = peach.getSplitSize();
  if (!nextSize) {
    return [];
  }

  CollisionSystem._splitParentVel.copy(peach.velocity);
  const speed = CollisionSystem._splitParentVel.length();

  if (speed > 0) {
    CollisionSystem._splitBaseDir
      .copy(CollisionSystem._splitParentVel)
      .normalize();
  } else {
    CollisionSystem._splitBaseDir.set(1, 0);
  }

  CollisionSystem._splitPerp.set(
    -CollisionSystem._splitBaseDir.y,
    CollisionSystem._splitBaseDir.x
  ).multiplyScalar(0.3);

  CollisionSystem._splitPosA
    .copy(peach.position)
    .add(CollisionSystem._splitPerp);
  CollisionSystem._splitPosB
    .copy(peach.position)
    .sub(CollisionSystem._splitPerp);

  const angleSpreadRad = THREE.MathUtils.degToRad(
    PEACH_SPLIT_ANGLE_SPREAD_DEGREES
  );

  CollisionSystem._splitVelA
    .copy(CollisionSystem._splitParentVel)
    .rotateAround(CollisionSystem.origin, angleSpreadRad)
    .multiplyScalar(PEACH_SPLIT_VELOCITY_MULTIPLIER);
  CollisionSystem._splitVelB
    .copy(CollisionSystem._splitParentVel)
    .rotateAround(CollisionSystem.origin, -angleSpreadRad)
    .multiplyScalar(PEACH_SPLIT_VELOCITY_MULTIPLIER);

  const spawned: Peach[] = [];

  const peachA = peachManager.spawn(
    CollisionSystem._splitPosA,
    CollisionSystem._splitVelA,
    nextSize as PeachSize
  );
  if (peachA) {
    peachA.rotationSpeed = THREE.MathUtils.randFloat(
      PEACH_MIN_ROTATION_SPEED,
      PEACH_MAX_ROTATION_SPEED
    );
    spawned.push(peachA);
  }

  const peachB = peachManager.spawn(
    CollisionSystem._splitPosB,
    CollisionSystem._splitVelB,
    nextSize as PeachSize
  );
  if (peachB) {
    peachB.rotationSpeed = THREE.MathUtils.randFloat(
      PEACH_MIN_ROTATION_SPEED,
      PEACH_MAX_ROTATION_SPEED
    );
    spawned.push(peachB);
  }

  return spawned;
}
```

**Verification:**
- [ ] Build passes: `npm run build`
- [ ] Peaches split into two children correctly
- [ ] Children move in expected directions
- [ ] No new THREE.Vector2 in splitPeach (check via code review)

---

## Phase R2: Code Quality Fixes

**Priority:** Important
**Estimated Effort:** 1.5 hours
**Files:** 5

### R2.1: Make BulletManager Required Constructor Param

**File:** `src/entities/Ship.ts`

**Step 1:** Change bulletManager type (line 35):
```typescript
// FROM:
private bulletManager: BulletManager | null = null;

// TO:
private bulletManager: BulletManager;
```

**Step 2:** Update constructor signature (line 49):
```typescript
// FROM:
constructor(sceneManager: SceneManager) {

// TO:
constructor(sceneManager: SceneManager, bulletManager: BulletManager) {
  this.bulletManager = bulletManager;
```

**Step 3:** Remove setBulletManager method (lines 196-198):
```typescript
// DELETE these lines:
public setBulletManager(manager: BulletManager): void {
  this.bulletManager = manager;
}
```

**Step 4:** Remove null check in updateFiring (lines 205-207):
```typescript
// DELETE these lines:
if (!this.bulletManager) {
  return;
}
```

**File:** `src/main.ts`

**Step 5:** Update Ship instantiation (line 76):
```typescript
// FROM:
const ship = new Ship(sceneManager);

// TO:
const bulletManager = new BulletManager(sceneManager);
const ship = new Ship(sceneManager, bulletManager);
```

**Step 6:** Remove setBulletManager call (line 176):
```typescript
// DELETE this line:
ship.setBulletManager(bulletManager);
```

**Step 7:** Remove redundant bulletManager declaration (line 78):
```typescript
// DELETE this line (now declared earlier):
const bulletManager = new BulletManager(sceneManager);
```

**Verification:**
- [ ] TypeScript compiles without errors
- [ ] Ship fires bullets correctly
- [ ] No runtime errors in console

---

### R2.2: Extract SpawnSystem Magic Numbers

**File:** `src/config/tuning.ts`

**Add after line 93 (after WAVE_BASE_SPAWN_INTERVAL):**
```typescript
/**
 * Minimum spawn interval regardless of wave scaling.
 * Prevents spawn rate from becoming too fast in later waves.
 */
export const WAVE_MIN_SPAWN_INTERVAL = 0.6;

/**
 * Spawn interval reduction per wave.
 * Each wave spawns slightly faster to increase difficulty.
 */
export const WAVE_SPAWN_INTERVAL_REDUCTION_PER_WAVE = 0.15;
```

**File:** `src/core/ChapterManager.ts`

**Step 1:** Update imports (add to existing import from tuning.ts):
```typescript
import {
  WAVE_BASE_PEACH_COUNT,
  WAVE_BASE_SPAWN_INTERVAL,
  WAVE_COUNT_INCREMENT_PER_WAVE,
  WAVE_MIN_SPAWN_INTERVAL,                    // ADD
  WAVE_SPAWN_INTERVAL_REDUCTION_PER_WAVE      // ADD
} from "../config/tuning";
```

**Step 2:** Replace lines 73-76 in generateWaveConfig():
```typescript
// FROM (lines 73-76):
const interval = Math.max(
  0.6,
  WAVE_BASE_SPAWN_INTERVAL - (waveNumber - 1) * 0.15
);

// TO:
const interval = Math.max(
  WAVE_MIN_SPAWN_INTERVAL,
  WAVE_BASE_SPAWN_INTERVAL - (waveNumber - 1) * WAVE_SPAWN_INTERVAL_REDUCTION_PER_WAVE
);
```

**Verification:**
- [ ] Build passes
- [ ] Spawn timing feels identical to before
- [ ] No magic numbers remain in spawn/wave logic

---

### R2.3: Implement Chapter Background Tint

**File:** `src/rendering/SceneManager.ts`

**Step 1:** Add property after line 36:
```typescript
private readonly baseBackgroundColor = new THREE.Color(0x0a0a15);
private readonly currentBackgroundColor = new THREE.Color(0x0a0a15);
```

**Step 2:** Update constructor (after line 52):
```typescript
this.scene.background = this.baseBackgroundColor.clone();
```

**Step 3:** Add new public methods before `render()`:
```typescript
/**
 * Applies a tint color to the background, blending with base color.
 * @param tintHex - Hex color string (e.g., "#1d2430") or number
 * @param intensity - Blend intensity 0.0-1.0 (default 0.3)
 */
public setBackgroundTint(tintHex: string | number, intensity: number = 0.3): void {
  const tint = new THREE.Color(tintHex);
  this.currentBackgroundColor
    .copy(this.baseBackgroundColor)
    .lerp(tint, intensity);

  if (this.scene.background instanceof THREE.Color) {
    this.scene.background.copy(this.currentBackgroundColor);
  } else {
    this.scene.background = this.currentBackgroundColor.clone();
  }
}

/**
 * Resets background to base color.
 */
public resetBackground(): void {
  this.currentBackgroundColor.copy(this.baseBackgroundColor);
  if (this.scene.background instanceof THREE.Color) {
    this.scene.background.copy(this.baseBackgroundColor);
  } else {
    this.scene.background = this.baseBackgroundColor.clone();
  }
}
```

**File:** `src/main.ts`

**Step 1:** In PLAYING state enter (around line 254), add after wave setup:
```typescript
// Apply chapter background tint
const currentChapter = chapterManager.getCurrentChapter();
sceneManager.setBackgroundTint(currentChapter.backgroundTint, 0.4);
```

**Step 2:** In MENU state enter (around line 218), add:
```typescript
sceneManager.resetBackground();
```

**Step 3:** In CHAPTER_TRANSITION, after advanceToNextChapter (around line 597):
```typescript
if (advanced) {
  bossProgression.startChapter(chapterManager);
  const newChapter = chapterManager.getCurrentChapter();
  sceneManager.setBackgroundTint(newChapter.backgroundTint, 0.4);
}
```

**Verification:**
- [ ] Build passes
- [ ] Chapter 1 has warm peach tint
- [ ] Each chapter has distinct background color
- [ ] Menu returns to base dark color
- [ ] Tints are subtle (40% blend) not overpowering

---

## Phase R3: Error Handling & Robustness

**Priority:** Important
**Estimated Effort:** 45 minutes
**Files:** 10 UI files

### R3.1: Graceful DOM Query Degradation

**Pattern to apply to ALL UI classes:**

**Current pattern (throws):**
```typescript
constructor() {
  const overlay = document.getElementById("ui-overlay");
  if (!overlay) {
    throw new Error("UI overlay container (#ui-overlay) not found.");
  }
  // ...
}
```

**New pattern (degrades gracefully):**
```typescript
private enabled = true;

constructor() {
  const overlay = document.getElementById("ui-overlay");
  if (!overlay) {
    console.error("UI: #ui-overlay not found. Component disabled.");
    this.enabled = false;
    return;
  }
  // ...
}

public update(/* params */): void {
  if (!this.enabled) return;
  // existing logic
}

public show(): void {
  if (!this.enabled) return;
  // existing logic
}

public hide(): void {
  if (!this.enabled) return;
  // existing logic
}

public dispose(): void {
  if (!this.enabled) return;
  // existing logic
}
```

**Files to update:**

| File | Constructor Line |
|------|------------------|
| `src/ui/LivesDisplay.ts` | 5-8 |
| `src/ui/ScoreDisplay.ts` | ~5-8 |
| `src/ui/WaveCounter.ts` | ~5-8 |
| `src/ui/BossHealthBar.ts` | ~5-8 |
| `src/ui/ChapterCard.ts` | ~5-8 |
| `src/ui/RewardScreen.ts` | ~5-8 |
| `src/ui/MenuScreen.ts` | constructor |
| `src/ui/GameOverScreen.ts` | constructor |
| `src/ui/VictoryScreen.ts` | constructor |
| `src/ui/HUD.ts` | constructor |

**Implementation notes:**
- Add `private enabled = true;` as first class property
- Early return in constructor if DOM missing, set `enabled = false`
- Add `if (!this.enabled) return;` at start of all public methods
- Use `console.error()` not `console.warn()` for visibility

**Verification:**
- [ ] Build passes
- [ ] Game runs normally with all DOM present
- [ ] Game runs (no crash) if `#ui-overlay` manually removed from HTML
- [ ] Console shows clear error message identifying missing element

---

## Phase R4: Testing Foundation

**Priority:** Medium-High
**Estimated Effort:** 4-5 hours
**New Files:** 8

### R4.1: Setup Vitest

**File:** `package.json`

**Add to devDependencies:**
```json
{
  "devDependencies": {
    "vitest": "^2.1.0",
    "@vitest/coverage-v8": "^2.1.0"
  }
}
```

**Add to scripts:**
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

**File:** `vitest.config.ts` (new file in project root)

```typescript
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/main.ts', 'src/vite-env.d.ts']
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  }
});
```

**File:** `tests/setup.ts` (new file)

```typescript
import { vi } from 'vitest';

// Mock THREE.js for unit tests
vi.mock('three', async () => {
  const actual = await vi.importActual('three');
  return {
    ...actual,
    // Add specific mocks if needed
  };
});
```

**Run:** `npm install`

---

### R4.2: ObjectPool Unit Tests

**File:** `tests/systems/ObjectPool.test.ts` (new file)

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import ObjectPool from '../../src/systems/ObjectPool';

interface TestEntity {
  id: number;
  active: boolean;
}

describe('ObjectPool', () => {
  let pool: ObjectPool<TestEntity>;
  const capacity = 5;

  beforeEach(() => {
    const entities: TestEntity[] = [];
    for (let i = 0; i < capacity; i++) {
      entities.push({ id: i, active: false });
    }
    pool = new ObjectPool(entities);
  });

  describe('acquire', () => {
    it('should return an entity from the pool', () => {
      const entity = pool.acquire();
      expect(entity).toBeDefined();
      expect(entity?.id).toBeGreaterThanOrEqual(0);
    });

    it('should track acquired entities as active', () => {
      pool.acquire();
      pool.acquire();
      expect(pool.getActive()).toHaveLength(2);
    });

    it('should return null when pool exhausted', () => {
      for (let i = 0; i < capacity; i++) {
        pool.acquire();
      }
      const extra = pool.acquire();
      expect(extra).toBeNull();
    });
  });

  describe('release', () => {
    it('should return entity to pool', () => {
      const entity = pool.acquire()!;
      pool.release(entity);
      expect(pool.getActive()).toHaveLength(0);
    });

    it('should allow entity to be reacquired', () => {
      const entity1 = pool.acquire()!;
      pool.release(entity1);
      const entity2 = pool.acquire();
      expect(entity2).toBe(entity1);
    });
  });

  describe('reset', () => {
    it('should release all entities', () => {
      pool.acquire();
      pool.acquire();
      pool.acquire();
      pool.reset();
      expect(pool.getActive()).toHaveLength(0);
    });
  });

  describe('getActive', () => {
    it('should return readonly array', () => {
      const active = pool.getActive();
      expect(Array.isArray(active)).toBe(true);
    });
  });
});
```

---

### R4.3: StateMachine Unit Tests

**File:** `tests/core/StateMachine.test.ts` (new file)

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import StateMachine, { GameState } from '../../src/core/StateMachine';

describe('StateMachine', () => {
  let sm: StateMachine;

  beforeEach(() => {
    sm = new StateMachine(GameState.LOADING);
  });

  describe('initialization', () => {
    it('should start in initial state', () => {
      expect(sm.getCurrentState()).toBe(GameState.LOADING);
    });
  });

  describe('transitions', () => {
    it('should allow valid transitions', () => {
      const result = sm.transitionTo(GameState.MENU);
      expect(result).toBe(true);
      expect(sm.getCurrentState()).toBe(GameState.MENU);
    });

    it('should reject invalid transitions', () => {
      const result = sm.transitionTo(GameState.VICTORY);
      expect(result).toBe(false);
      expect(sm.getCurrentState()).toBe(GameState.LOADING);
    });

    it('should allow extended transitions', () => {
      sm.extendAllowedTransitions({
        [GameState.LOADING]: [GameState.VICTORY]
      });
      const result = sm.transitionTo(GameState.VICTORY);
      expect(result).toBe(true);
    });
  });

  describe('lifecycle hooks', () => {
    it('should call enter hook on transition', () => {
      const enterFn = vi.fn();
      sm.register(GameState.MENU, { enter: enterFn });
      sm.transitionTo(GameState.MENU);
      expect(enterFn).toHaveBeenCalledWith(GameState.LOADING);
    });

    it('should call exit hook on transition', () => {
      const exitFn = vi.fn();
      sm.register(GameState.LOADING, { exit: exitFn });
      sm.transitionTo(GameState.MENU);
      expect(exitFn).toHaveBeenCalledWith(GameState.MENU);
    });

    it('should call update hook during update', () => {
      const updateFn = vi.fn();
      sm.register(GameState.LOADING, { update: updateFn });
      sm.update(0.016);
      expect(updateFn).toHaveBeenCalledWith(0.016);
    });
  });

  describe('change listeners', () => {
    it('should notify listeners on state change', () => {
      const listener = vi.fn();
      sm.onChange(listener);
      sm.transitionTo(GameState.MENU);
      expect(listener).toHaveBeenCalledWith(GameState.MENU, GameState.LOADING);
    });
  });
});
```

---

### R4.4: CollisionSystem Unit Tests

**File:** `tests/systems/CollisionSystem.test.ts` (new file)

```typescript
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import CollisionSystem from '../../src/systems/CollisionSystem';

describe('CollisionSystem', () => {
  describe('checkCircleCollision', () => {
    it('should detect overlapping circles', () => {
      const posA = new THREE.Vector2(0, 0);
      const posB = new THREE.Vector2(1, 0);
      const result = CollisionSystem.checkCircleCollision(posA, 1, posB, 1);
      expect(result).toBe(true);
    });

    it('should detect non-overlapping circles', () => {
      const posA = new THREE.Vector2(0, 0);
      const posB = new THREE.Vector2(5, 0);
      const result = CollisionSystem.checkCircleCollision(posA, 1, posB, 1);
      expect(result).toBe(false);
    });

    it('should detect touching circles', () => {
      const posA = new THREE.Vector2(0, 0);
      const posB = new THREE.Vector2(2, 0);
      const result = CollisionSystem.checkCircleCollision(posA, 1, posB, 1);
      expect(result).toBe(true);
    });

    it('should handle zero radius', () => {
      const posA = new THREE.Vector2(0, 0);
      const posB = new THREE.Vector2(0, 0);
      const result = CollisionSystem.checkCircleCollision(posA, 0, posB, 0);
      expect(result).toBe(true);
    });

    it('should handle same position different radii', () => {
      const posA = new THREE.Vector2(5, 5);
      const posB = new THREE.Vector2(5, 5);
      const result = CollisionSystem.checkCircleCollision(posA, 1, posB, 2);
      expect(result).toBe(true);
    });
  });
});
```

---

### R4.5: PhysicsSystem Unit Tests

**File:** `tests/systems/PhysicsSystem.test.ts` (new file)

```typescript
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import PhysicsSystem from '../../src/systems/PhysicsSystem';

describe('PhysicsSystem', () => {
  describe('applyThrust', () => {
    it('should add velocity in direction of angle', () => {
      const velocity = new THREE.Vector2(0, 0);
      PhysicsSystem.applyThrust(velocity, 0, 10, 1); // angle 0 = right
      expect(velocity.x).toBeCloseTo(10);
      expect(velocity.y).toBeCloseTo(0);
    });

    it('should accumulate velocity', () => {
      const velocity = new THREE.Vector2(5, 0);
      PhysicsSystem.applyThrust(velocity, 0, 10, 1);
      expect(velocity.x).toBeCloseTo(15);
    });

    it('should scale by dt', () => {
      const velocity = new THREE.Vector2(0, 0);
      PhysicsSystem.applyThrust(velocity, 0, 10, 0.5);
      expect(velocity.x).toBeCloseTo(5);
    });
  });

  describe('applyDamping', () => {
    it('should reduce velocity', () => {
      const velocity = new THREE.Vector2(10, 10);
      PhysicsSystem.applyDamping(velocity, 0.9);
      expect(velocity.x).toBeCloseTo(9);
      expect(velocity.y).toBeCloseTo(9);
    });

    it('should preserve direction', () => {
      const velocity = new THREE.Vector2(10, 5);
      const originalAngle = Math.atan2(velocity.y, velocity.x);
      PhysicsSystem.applyDamping(velocity, 0.8);
      const newAngle = Math.atan2(velocity.y, velocity.x);
      expect(newAngle).toBeCloseTo(originalAngle);
    });
  });

  describe('clampSpeed', () => {
    it('should cap speed at max', () => {
      const velocity = new THREE.Vector2(100, 0);
      PhysicsSystem.clampSpeed(velocity, 10);
      expect(velocity.length()).toBeCloseTo(10);
    });

    it('should not affect speeds below max', () => {
      const velocity = new THREE.Vector2(5, 0);
      PhysicsSystem.clampSpeed(velocity, 10);
      expect(velocity.length()).toBeCloseTo(5);
    });

    it('should preserve direction when clamping', () => {
      const velocity = new THREE.Vector2(100, 100);
      const originalAngle = Math.atan2(velocity.y, velocity.x);
      PhysicsSystem.clampSpeed(velocity, 10);
      const newAngle = Math.atan2(velocity.y, velocity.x);
      expect(newAngle).toBeCloseTo(originalAngle);
    });
  });

  describe('wrapPosition', () => {
    it('should wrap position across bounds', () => {
      const mockCamera = {
        left: -10,
        right: 10,
        top: 10,
        bottom: -10
      } as THREE.OrthographicCamera;

      const position = new THREE.Vector2(-12, 0);
      PhysicsSystem.wrapPosition(position, mockCamera, 1);
      expect(position.x).toBeCloseTo(11); // wrapped to right
    });
  });
});
```

---

### R4.6: ChapterManager Unit Tests

**File:** `tests/core/ChapterManager.test.ts` (new file)

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import ChapterManager from '../../src/core/ChapterManager';

describe('ChapterManager', () => {
  let cm: ChapterManager;

  beforeEach(() => {
    cm = new ChapterManager();
    cm.startChapter(0);
  });

  describe('initialization', () => {
    it('should start at chapter 1', () => {
      expect(cm.getCurrentChapter().id).toBe(1);
    });

    it('should start at wave 0', () => {
      expect(cm.getCurrentWave()).toBe(0);
    });
  });

  describe('wave progression', () => {
    it('should increment wave on startNextWave', () => {
      cm.startNextWave();
      expect(cm.getCurrentWave()).toBe(1);
    });

    it('should return wave config', () => {
      const config = cm.startNextWave();
      expect(config).toHaveProperty('count');
      expect(config).toHaveProperty('sizes');
      expect(config).toHaveProperty('interval');
    });
  });

  describe('chapter completion', () => {
    it('should not be complete at start', () => {
      expect(cm.isChapterComplete()).toBe(false);
    });

    it('should track completed waves', () => {
      cm.startNextWave();
      cm.completeWave();
      // Need to complete all waves to mark chapter complete
    });
  });

  describe('chapter advancement', () => {
    it('should advance to next chapter', () => {
      // Complete all waves first
      const totalWaves = cm.getTotalWaves();
      for (let i = 0; i < totalWaves; i++) {
        cm.startNextWave();
        cm.completeWave();
      }

      const advanced = cm.advanceToNextChapter();
      expect(advanced).toBe(true);
      expect(cm.getCurrentChapter().id).toBe(2);
    });

    it('should detect last chapter', () => {
      // Advance to last chapter
      for (let c = 0; c < 4; c++) {
        const totalWaves = cm.getTotalWaves();
        for (let w = 0; w < totalWaves; w++) {
          cm.startNextWave();
          cm.completeWave();
        }
        cm.advanceToNextChapter();
      }
      expect(cm.isLastChapter()).toBe(true);
    });
  });
});
```

---

### R4.7: Integration Test Skeleton

**File:** `tests/integration/gameplay.test.ts` (new file)

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock DOM elements
beforeEach(() => {
  document.body.innerHTML = `
    <canvas id="game-canvas"></canvas>
    <div id="ui-overlay"></div>
    <div id="mobile-controls"></div>
  `;
});

describe('Gameplay Integration', () => {
  it.skip('should initialize game systems', async () => {
    // TODO: Import and test initialization
    // This requires more complete mocking of Three.js WebGL
  });

  it.skip('should handle ship movement', () => {
    // TODO: Test ship responds to input
  });

  it.skip('should handle bullet firing', () => {
    // TODO: Test bullets spawn and despawn
  });

  it.skip('should handle peach splitting', () => {
    // TODO: Test peaches split correctly
  });

  it.skip('should handle chapter progression', () => {
    // TODO: Test chapter flow
  });
});

// Note: Full integration tests require WebGL mocking or headless browser
// These are marked skip until browser-based testing is set up
```

---

## Execution Order for Traycer

```
┌───────────────────────────────────────────────────────────┐
│  PHASE R1: Hot Path Allocations (1 hour)                  │
│  ├─ R1.1: Ship.ts updateFiring scratch objects            │
│  └─ R1.2: CollisionSystem.ts splitPeach scratch objects   │
├───────────────────────────────────────────────────────────┤
│  PHASE R2: Code Quality (1.5 hours)                       │
│  ├─ R2.1: BulletManager required param                    │
│  ├─ R2.2: SpawnSystem magic numbers → tuning.ts           │
│  └─ R2.3: Chapter background tint implementation          │
├───────────────────────────────────────────────────────────┤
│  PHASE R3: Error Handling (45 min)                        │
│  └─ R3.1: Graceful DOM query degradation (10 files)       │
├───────────────────────────────────────────────────────────┤
│  PHASE R4: Testing Foundation (4-5 hours)                 │
│  ├─ R4.1: Vitest setup                                    │
│  ├─ R4.2: ObjectPool tests                                │
│  ├─ R4.3: StateMachine tests                              │
│  ├─ R4.4: CollisionSystem tests                           │
│  ├─ R4.5: PhysicsSystem tests                             │
│  ├─ R4.6: ChapterManager tests                            │
│  └─ R4.7: Integration test skeleton                       │
└───────────────────────────────────────────────────────────┘
```

**Parallelization:** R1, R2, R3 can run in parallel. R4 should run after R1-R3.

---

## Verification Checklist

### After R1 (Performance)
- [ ] `npm run build` passes
- [ ] Ship fires correctly
- [ ] Peaches split correctly
- [ ] No `new THREE.Vector2` in Ship.updateFiring or CollisionSystem.splitPeach

### After R2 (Code Quality)
- [ ] `npm run build` passes (no TypeScript errors)
- [ ] Ship requires BulletManager at construction
- [ ] No magic numbers in spawn timing
- [ ] Background color changes per chapter
- [ ] Menu has base dark color

### After R3 (Error Handling)
- [ ] `npm run build` passes
- [ ] Game runs normally
- [ ] Removing `#ui-overlay` from HTML doesn't crash game
- [ ] Console shows informative error for missing DOM

### After R4 (Testing)
- [ ] `npm test` passes
- [ ] `npm run test:coverage` shows >80% on core systems
- [ ] All 5 unit test files pass
- [ ] Integration skeleton exists (skipped tests OK)

---

## Final Acceptance Criteria

- [ ] All verification checklists pass
- [ ] `npm run build` produces working production build
- [ ] `npm test` passes with no failures
- [ ] Manual playtest confirms: firing, splitting, chapter progression, background tints
- [ ] Chrome DevTools Performance tab shows no GC spikes during intense gameplay

---

*Final draft specification generated by Claude Opus 4.5 for Traycer YOLO execution with ChatGPT 5.2*
