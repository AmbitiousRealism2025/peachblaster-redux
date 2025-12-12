# Recommendations Master Plan — Pre-Part 2 Technical Debt Resolution

**Created:** 2025-12-12
**Status:** Ready for Execution (Decisions Confirmed)
**Scope:** Address PHASE_1-5_REVIEW.md findings before Part 2 implementation

---

## Executive Summary

With all 11 phases of Part 1 complete, Peach Blaster Redux has a **functional vertical slice** scoring 7.0/10. Before expanding to the 5-chapter campaign (Part 2), we should address accumulated technical debt to prevent:

1. **Performance degradation** as entity counts scale (5 chapters × more enemies)
2. **Regression risk** from missing test coverage
3. **Maintainability issues** as codebase grows with new enemy types and systems

This plan organizes the 15 identified issues into **4 execution phases** optimized for Traycer's YOLO orchestration.

---

## Issue Inventory

### From PHASE_1-5_REVIEW.md

| ID | Issue | Severity | Original Timeline |
|----|-------|----------|-------------------|
| C1 | Object allocation in hot paths | Medium-High | Immediate |
| C2 | Duplicate ship visibility toggle | Low | Immediate |
| C3 | Async IIFE without error handling | Medium | Immediate |
| M1 | TypeScript strict null checks for managers | Medium | Soon |
| M2 | Score tracking system | High | Immediate |
| M3 | Error boundaries around DOM queries | Medium | Soon |
| M4 | Unused chapter configuration data | Low | Soon |
| S1 | JSDoc comments for public APIs | Low | Soon |
| S2 | Readonly arrays for collision results | Low | Soon |
| S3 | Mobile controls Y-axis inversion | Low | Later |
| S4 | Magic numbers in SpawnSystem | Medium | Soon |
| T1 | No test framework setup | Medium | Later |
| T2 | Missing unit tests for core systems | Medium-High | Later |
| T3 | Missing integration tests | Medium | Later |
| CR1 | Ship design (green triangle) | Low | Creative |
| CR2 | UI visual design (neon theme) | Low | Creative |

### Resolution Status Check

Some issues may have been addressed during later phases. Quick audit:

| ID | Status | Notes |
|----|--------|-------|
| M2 | **RESOLVED** | ScoreManager exists (`src/core/ScoreManager.ts`) |
| C3 | **RESOLVED** | Error handling added in Phase 6 per progress.md |
| C1 | **PARTIAL** | Boss managers use scratch objects; PeachManager/BulletManager may still allocate |

**Active Issues: 13** (after removing M2, C3)

---

## Prioritized Execution Plan

### Phase R1: Performance Critical (Hot Path Allocations)
**Priority:** Critical
**Estimated Effort:** 2-3 hours
**Rationale:** Part 2 introduces 5 chapters with increasing entity counts. GC stutters will compound.

#### R1.1: Audit and Fix Object Allocations

**Files to audit:**
- `src/entities/PeachManager.ts` — `updateInstanceMatrix()`
- `src/entities/BulletManager.ts` — `updateInstanceMatrix()`
- `src/systems/CollisionSystem.ts` — collision checks
- `src/systems/SpawnSystem.ts` — spawn position calculations
- `src/systems/PhysicsSystem.ts` — wrap/movement calculations

**Pattern to apply:**
```typescript
// Class-level scratch objects
private readonly _tempPosition = new THREE.Vector3();
private readonly _tempQuat = new THREE.Quaternion();
private readonly _tempScale = new THREE.Vector3();
private readonly _tempMatrix = new THREE.Matrix4();
private readonly _zAxis = new THREE.Vector3(0, 0, 1);

// In-method reuse
this._tempPosition.set(entity.position.x, entity.position.y, 0);
this._tempQuat.setFromAxisAngle(this._zAxis, entity.rotation);
this._tempScale.setScalar(scale);
this._tempMatrix.compose(this._tempPosition, this._tempQuat, this._tempScale);
```

**Verification:**
- [ ] Profile with Chrome DevTools → Performance tab
- [ ] Verify GC events reduced during 50-peach stress test
- [ ] No new allocations in hot paths (check memory snapshot)

---

### Phase R2: Code Quality Fixes
**Priority:** Important
**Estimated Effort:** 1-2 hours
**Rationale:** Low-effort fixes that improve maintainability.

#### R2.1: Remove Duplicate Ship Visibility Toggle
**File:** `src/main.ts:74-77`
```typescript
// Remove duplicate line
ship.mesh.visible = false; // Keep one
ship.resetState();
// ship.mesh.visible = false; // DELETE
```

#### R2.2: Extract Magic Numbers in SpawnSystem
**File:** `src/systems/SpawnSystem.ts:80`
```typescript
// Current
const interval = Math.max(0.6, WAVE_BASE_SPAWN_INTERVAL - (waveNumber - 1) * 0.15);

// Extract to src/config/tuning.ts
export const WAVE_MIN_SPAWN_INTERVAL = 0.6;
export const WAVE_SPAWN_INTERVAL_REDUCTION = 0.15;
```

#### R2.3: TypeScript Strict Null Check for BulletManager
**File:** `src/entities/Ship.ts`
**Decision:** Required constructor param

```typescript
// Change constructor signature
constructor(scene: THREE.Scene, bulletManager: BulletManager) {
  this.bulletManager = bulletManager; // No longer optional
}

// Remove the optional check in updateFiring
private updateFiring(dt: number, inputManager: InputManager): void {
  // this.bulletManager is now guaranteed to exist
  // Remove: if (!this.bulletManager) { return; }
}
```

**Also update:** `src/main.ts` — ensure BulletManager is instantiated before Ship

#### R2.4: Implement Chapter Background Tint
**Decision:** Implement now

**Files to modify:**
- `src/rendering/SceneManager.ts` — add `setBackgroundTint(color: number)` method
- `src/core/ChapterManager.ts` — call SceneManager on chapter start
- `src/main.ts` — wire chapter changes to background updates

**Implementation approach:**
```typescript
// SceneManager.ts
private baseBackgroundColor = 0x0a0a15; // Current dark purple

public setBackgroundTint(tintColor: number, intensity: number = 0.3): void {
  // Lerp between base color and tint
  const base = new THREE.Color(this.baseBackgroundColor);
  const tint = new THREE.Color(tintColor);
  base.lerp(tint, intensity);
  this.scene.background = base;
}

public resetBackground(): void {
  this.scene.background = new THREE.Color(this.baseBackgroundColor);
}
```

**Chapter tints from config:**
- Chapter 1 (Orchard Belt): warm peach `0xffccaa`
- Chapter 2 (Syrup Nebula): amber `0xffaa44`
- Chapter 3 (Pitstorm Reef): deep red `0xaa4444`
- Chapter 4 (Fuzz Cathedral): purple `0xaa44aa`
- Chapter 5 (Canning Moon): gold `0xffdd66`

**Verification:**
- [ ] All duplicate code removed
- [ ] No magic numbers in SpawnSystem
- [ ] Ship firing behavior explicit
- [ ] Chapter config fields either used or documented

---

### Phase R3: Error Handling & Robustness
**Priority:** Important
**Estimated Effort:** 1 hour
**Rationale:** Graceful degradation prevents hard crashes from DOM/env issues.

#### R3.1: Add Error Boundaries for DOM Queries
**Files:** Multiple UI classes

**Current pattern (throws):**
```typescript
const overlay = document.getElementById("ui-overlay");
if (!overlay) {
  throw new Error("UI overlay container (#ui-overlay) not found.");
}
```

**Proposed pattern (degrades gracefully):**
```typescript
const overlay = document.getElementById("ui-overlay");
if (!overlay) {
  console.error("UI overlay container (#ui-overlay) not found. UI disabled.");
  return; // or set this.enabled = false
}
```

**Files to update:**
- `src/ui/LivesDisplay.ts`
- `src/ui/ScoreDisplay.ts`
- `src/ui/WaveCounter.ts`
- `src/ui/BossHealthBar.ts`
- `src/ui/ChapterCard.ts`
- `src/ui/RewardScreen.ts`
- `src/ui/MenuScreen.ts`
- `src/ui/GameOverScreen.ts`
- `src/ui/VictoryScreen.ts`
- `src/ui/HUD.ts`

**Verification:**
- [ ] Game still runs (degraded) if UI container missing
- [ ] Console errors clearly identify missing elements
- [ ] No uncaught exceptions from DOM queries

---

### Phase R4: Testing Foundation
**Priority:** Medium (High for Part 2 readiness)
**Estimated Effort:** 4-6 hours
**Rationale:** Part 2 adds 5 enemy variants, 5 pickups, 5 mini-bosses. Testing prevents regressions.

#### R4.1: Setup Testing Framework
**New Files:**
- `vitest.config.ts`
- `tests/setup.ts`

**Package additions:**
```json
{
  "devDependencies": {
    "vitest": "^1.0.0",
    "@vitest/coverage-v8": "^1.0.0"
  }
}
```

#### R4.2: Critical Unit Tests
**Priority order:**

1. **ObjectPool** (`tests/systems/ObjectPool.test.ts`)
   - Acquire/release cycles
   - Pool exhaustion behavior
   - Capacity limits

2. **StateMachine** (`tests/core/StateMachine.test.ts`)
   - Valid transitions succeed
   - Invalid transitions rejected
   - Lifecycle hooks called

3. **CollisionSystem** (`tests/systems/CollisionSystem.test.ts`)
   - Circle-circle collision math
   - Edge cases (zero radius, same position)
   - Batch collision results

4. **PhysicsSystem** (`tests/systems/PhysicsSystem.test.ts`)
   - World wrap boundaries
   - Velocity damping
   - Clamp behavior

5. **ChapterManager** (`tests/core/ChapterManager.test.ts`)
   - Wave progression
   - Chapter transitions
   - Boss trigger conditions

#### R4.3: Integration Test Skeleton
**File:** `tests/integration/gameplay.test.ts`

- Ship spawns and responds to input
- Bullets fire and despawn after TTL
- Peach splitting creates correct children
- Lives decrement on collision
- Chapter completes after waves cleared

**Verification:**
- [ ] `npm test` runs without errors
- [ ] Core systems have >80% coverage
- [ ] Integration test passes full chapter flow

---

## Deferred to Part 2

These items are lower priority or naturally fit with Part 2 implementation:

| ID | Issue | Rationale for Deferral |
|----|-------|------------------------|
| S1 | JSDoc for public APIs | Add as new APIs created |
| S2 | Readonly collision arrays | Minor type safety, low risk |
| S3 | Mobile Y-axis testing | Requires device testing during Part 2 polish |
| CR1 | Ship visual design | Part 2 art pass |
| CR2 | UI neon theme | Part 2 polish phase |

---

## Implementation Order (Traycer Orchestration)

```
Phase R1 (Performance) ─────────────────────┐
                                            │
Phase R2 (Code Quality) ────────────────────┼──► Parallel-safe
                                            │
Phase R3 (Error Handling) ──────────────────┘

                    ↓ (dependency)

Phase R4 (Testing) ─────────────────────────── Sequential after R1-R3
```

**Recommended Execution:**
1. R1, R2, R3 can run in parallel (different files, no conflicts)
2. R4 runs after R1-R3 complete (tests should validate fixed code)

---

## Acceptance Criteria

### Performance (R1)
- [ ] Chrome DevTools shows no new THREE.* allocations in hot paths
- [ ] GC pause frequency reduced by >50% in stress test
- [ ] 60fps maintained with 50 peaches + 100 bullets + boss active

### Code Quality (R2)
- [ ] No duplicate code identified by linter
- [ ] All tuning values in `src/config/tuning.ts`
- [ ] TypeScript strict mode passes with no suppressions

### Robustness (R3)
- [ ] Game runs (degraded) with missing DOM elements
- [ ] All errors logged with actionable messages
- [ ] No uncaught exceptions in normal gameplay

### Testing (R4)
- [ ] `npm test` passes
- [ ] Core system coverage >80%
- [ ] Integration test completes Chapter 1 flow

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Hot path fixes introduce bugs | Medium | High | Test thoroughly, profile before/after |
| DOM error handling breaks UI | Low | Medium | Test all UI paths manually |
| Testing framework setup delays | Low | Low | Can defer to early Part 2 if needed |
| Mobile controls need rework | Medium | Medium | Plan mobile testing session |

---

## Decisions (Confirmed)

1. **R2.3 (BulletManager):** **Required constructor param** — enforces dependency at compile-time, cleaner long-term

2. **R2.4 (Chapter Config):** **Implement backgroundTint now** — complete the chapter system before Part 2

3. **R4 (Testing):** **Full foundation now** — establish testing patterns before Part 2 complexity

---

## Next Steps

1. **Approve this plan** (or request modifications)
2. **Create detailed specifications** for each phase (ChatGPT 5.2 first draft → Claude refinement)
3. **Execute via Traycer YOLO** with parallel phases R1-R3, then R4
4. **Review completed work** (Claude phase review)
5. **Proceed to Part 2** planning

---

*Plan generated by Claude Opus 4.5 as Stage 2 (Plan Refinement) of multi-agent workflow.*
