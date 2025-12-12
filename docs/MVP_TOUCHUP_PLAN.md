# MVP Touchup Plan — Pre-Phase 2 Stabilization

**Created:** 2025-12-12
**Author:** Claude Opus 4.5 (Plan Refinement)
**Purpose:** Address baseline code review findings before Phase 2 campaign expansion

---

## Overview

This plan addresses findings from the Baseline Code Review (6.8/10 overall) to establish a stable foundation before expanding to the full 5-chapter campaign. The work is organized into 4 implementation sprints totaling ~27 hours of effort.

### Current State Summary

| Category | Score | Target |
|----------|-------|--------|
| Testing | 3.0/10 | 6.0/10 |
| Accessibility | 4.0/10 | 6.5/10 |
| Architecture | 6.5/10 | 7.5/10 |
| Performance | 8.2/10 | 8.5/10 |
| Code Quality | 7.8/10 | 8.2/10 |

### Sprint Overview

| Sprint | Focus | Effort | Priority |
|--------|-------|--------|----------|
| Sprint 1 | Performance & Memory Fixes | ~6h | Critical |
| Sprint 2 | Testing Foundation | ~6h | Critical |
| Sprint 3 | Accessibility & UX | ~5h | High |
| Sprint 4 | Architecture Cleanup | ~10h | Medium |

---

## Sprint 1: Performance & Memory Fixes

**Goal:** Eliminate hot-path allocations and memory leaks
**Effort:** ~6 hours
**Priority:** Critical (blocks smooth gameplay at scale)

### Phase 1.1: Hot-Path Vector Allocations

**Files to Modify:**
- `src/entities/Ship.ts` — Lines 215-225
- `src/systems/CollisionSystem.ts` — Lines 181-247

**Implementation:**

#### Ship.ts Changes
```typescript
// Add as private class members (near line 30)
private readonly _firePosition = new THREE.Vector2();
private readonly _fireVelocity = new THREE.Vector2();
private readonly _fireDirection = new THREE.Vector2();

// Refactor updateFiring() to use scratch vectors
```

**Current (problematic):**
```typescript
private updateFiring(dt: number, inputManager: InputManager): void {
  // Creates new Vector2 every bullet fired
  const bulletVelocity = new THREE.Vector2(
    Math.cos(this.rotation) * BULLET_SPEED + this.velocity.x * BULLET_INHERIT_VELOCITY,
    Math.sin(this.rotation) * BULLET_SPEED + this.velocity.y * BULLET_INHERIT_VELOCITY
  );
}
```

**Target (allocation-free):**
```typescript
private updateFiring(dt: number, inputManager: InputManager): void {
  this._fireDirection.set(Math.cos(this.rotation), Math.sin(this.rotation));
  this._fireVelocity.copy(this._fireDirection)
    .multiplyScalar(BULLET_SPEED)
    .addScaledVector(this.velocity, BULLET_INHERIT_VELOCITY);
  // Pass scratch vector to bulletManager
}
```

#### CollisionSystem.ts Changes
```typescript
// Add module-level scratch vectors (top of file, after imports)
const _splitVelocity1 = new THREE.Vector2();
const _splitVelocity2 = new THREE.Vector2();
const _perpendicular = new THREE.Vector2();
const _normalized = new THREE.Vector2();
const _center = new THREE.Vector2();
const _offset1 = new THREE.Vector2();
const _offset2 = new THREE.Vector2();
const _baseVelocity = new THREE.Vector2();
```

**Verification:**
- [ ] Run game at max load (50 peaches + 100 bullets)
- [ ] Chrome DevTools → Performance → Record 30s
- [ ] Confirm no GC pauses >5ms during gameplay
- [ ] Verify split behavior unchanged (perpendicular velocities)

---

### Phase 1.2: TrailRenderer O(n) Fix

**File:** `src/rendering/TrailRenderer.ts`

**Current Issue:**
```typescript
// O(n) operations every frame
this.points.shift();     // O(n) - copies entire array
this.points.unshift(x);  // O(n) - copies entire array
```

**Solution:** Implement circular buffer pattern

```typescript
// Add to class
private headIndex = 0;
private readonly capacity: number;

// Replace shift/unshift with circular index
private addPoint(x: number, y: number): void {
  this.headIndex = (this.headIndex + 1) % this.capacity;
  this.points[this.headIndex * 2] = x;
  this.points[this.headIndex * 2 + 1] = y;
}
```

**Verification:**
- [ ] Ship trail renders correctly
- [ ] Trail fades from head to tail
- [ ] No visible difference in trail behavior

---

### Phase 1.3: Memory Leak Fixes

**Files to Modify:**
- `src/ui/RewardScreen.ts`
- `src/ui/MobileControls.ts`
- `src/ui/DebugOverlay.ts`

#### RewardScreen.ts
**Issue:** Inline callback never removed (line ~45)

```typescript
// Current (leaks)
continueButton.addEventListener('click', () => { ... });

// Fix: Store reference and add dispose()
private boundContinueHandler: (() => void) | null = null;

show(): void {
  this.boundContinueHandler = () => this.onContinue();
  continueButton.addEventListener('click', this.boundContinueHandler);
}

dispose(): void {
  if (this.boundContinueHandler) {
    continueButton?.removeEventListener('click', this.boundContinueHandler);
    this.boundContinueHandler = null;
  }
}
```

#### MobileControls.ts
**Issue:** 6 touch event listeners never removed

```typescript
// Add dispose() method
dispose(): void {
  this.joystickArea?.removeEventListener('touchstart', this.boundTouchStart);
  this.joystickArea?.removeEventListener('touchmove', this.boundTouchMove);
  this.joystickArea?.removeEventListener('touchend', this.boundTouchEnd);
  this.fireButton?.removeEventListener('touchstart', this.boundFireStart);
  this.fireButton?.removeEventListener('touchend', this.boundFireEnd);
  document.removeEventListener('touchend', this.boundDocTouchEnd);
}
```

#### DebugOverlay.ts
**Issue:** F1 listener never removed

```typescript
// Store bound handler reference
private boundKeyHandler: ((e: KeyboardEvent) => void) | null = null;

// In constructor
this.boundKeyHandler = this.handleKeyDown.bind(this);
document.addEventListener('keydown', this.boundKeyHandler);

// Add dispose()
dispose(): void {
  if (this.boundKeyHandler) {
    document.removeEventListener('keydown', this.boundKeyHandler);
  }
}
```

**Verification:**
- [ ] Chrome DevTools → Memory → Heap snapshot before/after multiple game restarts
- [ ] No detached DOM nodes accumulating
- [ ] No listener count growth after 5 game cycles

---

### Phase 1.4: SceneManager.dispose()

**File:** `src/rendering/SceneManager.ts`

**Add method:**
```typescript
dispose(): void {
  // Dispose composer passes
  if (this.composer) {
    this.composer.passes.forEach(pass => {
      if ('dispose' in pass && typeof pass.dispose === 'function') {
        pass.dispose();
      }
    });
  }

  // Dispose render targets
  this.composer?.renderTarget1?.dispose();
  this.composer?.renderTarget2?.dispose();

  // Dispose renderer
  this.renderer.dispose();
  this.renderer.forceContextLoss();

  // Remove canvas
  this.renderer.domElement.remove();
}
```

**Verification:**
- [ ] Call dispose() in test scenario
- [ ] WebGL context properly released
- [ ] No GPU memory growth after multiple init/dispose cycles

---

## Sprint 2: Testing Foundation

**Goal:** Establish Vitest infrastructure with critical path coverage
**Effort:** ~6 hours
**Priority:** Critical (prevents regression as complexity grows)

### Phase 2.1: Vitest Setup

**Files to Create:**
- `vitest.config.ts`
- `src/setupTests.ts`
- `tests/` directory structure

**package.json additions:**
```json
{
  "scripts": {
    "test": "vitest",
    "test:coverage": "vitest --coverage"
  },
  "devDependencies": {
    "vitest": "^2.1.0",
    "@vitest/coverage-v8": "^2.1.0"
  }
}
```

**vitest.config.ts:**
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/main.ts', 'src/**/*.d.ts']
    }
  }
});
```

**Verification:**
- [ ] `npm run test` executes without errors
- [ ] Coverage report generates

---

### Phase 2.2: ObjectPool Tests

**File to Create:** `tests/systems/ObjectPool.test.ts`

**Test Cases:**
```typescript
describe('ObjectPool', () => {
  describe('acquire', () => {
    it('returns object from pool when available');
    it('calls factory when pool exhausted');
    it('increments activeCount on acquire');
    it('marks acquired object as active');
  });

  describe('release', () => {
    it('decrements activeCount on release');
    it('marks released object as inactive');
    it('allows released object to be reacquired');
    it('handles double-release gracefully');
  });

  describe('releaseAll', () => {
    it('releases all active objects');
    it('resets activeCount to zero');
  });
});
```

**Target Coverage:** 100% of ObjectPool.ts

---

### Phase 2.3: StateMachine Tests

**File to Create:** `tests/core/StateMachine.test.ts`

**Test Cases:**
```typescript
describe('StateMachine', () => {
  describe('transitions', () => {
    it('allows valid transitions');
    it('blocks invalid transitions');
    it('calls exit handler on old state');
    it('calls enter handler on new state');
    it('passes previous state to enter handler');
  });

  describe('update', () => {
    it('calls current state update handler');
    it('passes delta time to update handler');
  });

  describe('listeners', () => {
    it('notifies listeners on state change');
    it('allows listener removal');
  });
});
```

**Target Coverage:** 100% of StateMachine.ts

---

### Phase 2.4: CollisionSystem Tests

**File to Create:** `tests/systems/CollisionSystem.test.ts`

**Test Cases:**
```typescript
describe('CollisionSystem', () => {
  describe('circleCollision', () => {
    it('detects overlapping circles');
    it('returns false for non-overlapping circles');
    it('handles edge-case touching circles');
    it('handles zero-radius circles');
  });

  describe('checkBulletPeachCollisions', () => {
    it('returns hit pairs for colliding bullets and peaches');
    it('respects collision radii from tuning');
    it('handles empty arrays');
  });

  describe('splitPeach', () => {
    it('returns two smaller peaches for LARGE');
    it('returns two smaller peaches for MEDIUM');
    it('returns empty array for SMALL');
    it('positions children at perpendicular offsets');
    it('assigns perpendicular velocities');
  });
});
```

**Target Coverage:** 90%+ of CollisionSystem.ts

---

### Phase 2.5: PhysicsSystem Tests

**File to Create:** `tests/systems/PhysicsSystem.test.ts`

**Test Cases:**
```typescript
describe('PhysicsSystem', () => {
  describe('applyThrust', () => {
    it('adds acceleration in direction of angle');
    it('mutates velocity in place');
  });

  describe('applyDamping', () => {
    it('reduces velocity by damping factor');
    it('mutates velocity in place');
  });

  describe('clampSpeed', () => {
    it('limits velocity magnitude to maxSpeed');
    it('preserves direction when clamping');
    it('does not modify velocity under maxSpeed');
  });

  describe('wrapPosition', () => {
    it('wraps position exceeding right bound');
    it('wraps position exceeding left bound');
    it('wraps position exceeding top bound');
    it('wraps position exceeding bottom bound');
    it('mutates position in place');
  });
});
```

**Target Coverage:** 100% of PhysicsSystem.ts

---

## Sprint 3: Accessibility & UX

**Goal:** Address critical WCAG gaps
**Effort:** ~5 hours
**Priority:** High (affects disabled users)

### Phase 3.1: ARIA Roles for Modals

**Files to Modify:**
- `src/ui/MenuScreen.ts`
- `src/ui/GameOverScreen.ts`
- `src/ui/VictoryScreen.ts`

**Changes per file:**
```typescript
// In constructor or show(), add to container element:
this.container.setAttribute('role', 'dialog');
this.container.setAttribute('aria-modal', 'true');
this.container.setAttribute('aria-labelledby', 'dialog-title-id');

// Add id to title element
titleElement.id = 'dialog-title-id';
```

**Verification:**
- [ ] Screen reader announces "dialog" when modal opens
- [ ] Dialog title is announced

---

### Phase 3.2: Form Input Labels

**File:** `src/ui/MenuScreen.ts`

**Changes:**
```typescript
// Volume slider
volumeSlider.id = 'volume-control';
const volumeLabel = document.createElement('label');
volumeLabel.htmlFor = 'volume-control';
volumeLabel.textContent = 'Volume';
volumeLabel.className = 'sr-only'; // visually hidden but accessible

// Mute checkbox
muteCheckbox.id = 'mute-control';
muteCheckbox.setAttribute('aria-label', 'Mute all sounds');

// Quality dropdown
qualitySelect.id = 'quality-control';
const qualityLabel = document.createElement('label');
qualityLabel.htmlFor = 'quality-control';
qualityLabel.textContent = 'Graphics Quality';
```

**Add to style.css:**
```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

---

### Phase 3.3: ARIA Live Regions

**Files to Modify:**
- `src/ui/WaveCounter.ts`
- `src/ui/BossHealthBar.ts`

**WaveCounter.ts:**
```typescript
// In constructor
this.element.setAttribute('aria-live', 'polite');
this.element.setAttribute('aria-atomic', 'true');
```

**BossHealthBar.ts:**
```typescript
// In constructor
this.container.setAttribute('role', 'progressbar');
this.container.setAttribute('aria-label', 'Boss health');
this.container.setAttribute('aria-valuemin', '0');
this.container.setAttribute('aria-valuemax', '100');

// In update()
this.container.setAttribute('aria-valuenow', String(Math.round(percent)));
```

---

### Phase 3.4: LivesDisplay Unicode Fix

**File:** `src/ui/LivesDisplay.ts`

**Current (problematic):**
```typescript
// Renders: ▲ ▲ ▲
// Screen reader announces: "UPWARDS POINTING TRIANGLE" three times
```

**Fix:**
```typescript
// Use aria-label for accessible count
this.element.setAttribute('aria-label', `${count} lives remaining`);

// Hide decorative unicode from screen readers
const shipIcon = document.createElement('span');
shipIcon.setAttribute('aria-hidden', 'true');
shipIcon.textContent = '▲';
```

---

### Phase 3.5: Focus Trap for Settings Modal

**File:** `src/ui/MenuScreen.ts`

**Add focus trap utility:**
```typescript
private focusableElements: HTMLElement[] = [];
private firstFocusable: HTMLElement | null = null;
private lastFocusable: HTMLElement | null = null;

private setupFocusTrap(): void {
  const focusable = this.container.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  this.focusableElements = Array.from(focusable);
  this.firstFocusable = this.focusableElements[0] || null;
  this.lastFocusable = this.focusableElements[this.focusableElements.length - 1] || null;
}

private handleTabKey = (e: KeyboardEvent): void => {
  if (e.key !== 'Tab') return;

  if (e.shiftKey && document.activeElement === this.firstFocusable) {
    e.preventDefault();
    this.lastFocusable?.focus();
  } else if (!e.shiftKey && document.activeElement === this.lastFocusable) {
    e.preventDefault();
    this.firstFocusable?.focus();
  }
};
```

**Verification:**
- [ ] Tab cycles through settings controls
- [ ] Shift+Tab cycles backwards
- [ ] Focus cannot escape modal while open
- [ ] Focus returns to trigger button on close

---

## Sprint 4: Architecture Cleanup

**Goal:** Reduce main.ts coupling and improve maintainability
**Effort:** ~10 hours
**Priority:** Medium (technical debt reduction)

### Phase 4.1: Extract GameContext

**File to Create:** `src/core/GameContext.ts`

**Purpose:** Central container for all game managers and systems

```typescript
export interface GameContext {
  // Managers
  readonly sceneManager: SceneManager;
  readonly inputManager: InputManager;
  readonly livesManager: LivesManager;
  readonly scoreManager: ScoreManager;
  readonly chapterManager: ChapterManager;
  readonly bossProgression: BossProgression;

  // Systems
  readonly spawnSystem: SpawnSystem;
  readonly particleSystem: ParticleSystem;
  readonly trailRenderer: TrailRenderer;

  // Entities
  readonly ship: Ship;
  readonly peachManager: PeachManager;
  readonly bulletManager: BulletManager;
  readonly megaPeachManager: MegaPeachManager;

  // UI
  readonly hud: HUD;
  readonly menuScreen: MenuScreen;
  readonly gameOverScreen: GameOverScreen;
  readonly victoryScreen: VictoryScreen;

  // Audio
  readonly sfxManager: SFXManager;
}
```

**File to Create:** `src/core/GameFactory.ts`

**Purpose:** Centralize object creation, enable future DI

```typescript
export class GameFactory {
  static createGameContext(): GameContext {
    const sceneManager = new SceneManager();
    const inputManager = InputManager.getInstance();
    // ... wire dependencies
    return context;
  }

  static disposeGameContext(context: GameContext): void {
    context.sceneManager.dispose();
    context.particleSystem.dispose();
    // ... cleanup all
  }
}
```

---

### Phase 4.2: Extract PlayingState

**File to Create:** `src/states/PlayingState.ts`

**Purpose:** Move 252-line PLAYING.update handler to dedicated class

```typescript
export class PlayingState {
  constructor(private context: GameContext) {}

  enter(previousState: GameState): void {
    // Current PLAYING enter logic
  }

  exit(nextState: GameState): void {
    // Current PLAYING exit logic
  }

  update(dt: number): void {
    this.updateShip(dt);
    this.updateEntities(dt);
    this.checkCollisions();
    this.updateEffects(dt);
    this.updateSpawning(dt);
    this.checkWaveCompletion();
  }

  private updateShip(dt: number): void { /* ... */ }
  private updateEntities(dt: number): void { /* ... */ }
  private checkCollisions(): void { /* ... */ }
  private updateEffects(dt: number): void { /* ... */ }
  private updateSpawning(dt: number): void { /* ... */ }
  private checkWaveCompletion(): void { /* ... */ }
}
```

---

### Phase 4.3: Extract MenuState

**File to Create:** `src/states/MenuState.ts`

```typescript
export class MenuState {
  constructor(private context: GameContext) {}

  enter(previousState: GameState): void {
    this.context.menuScreen.show('title');
    this.context.ship.mesh.visible = false;
    this.context.ship.resetState();
    this.resetGameState();
  }

  exit(nextState: GameState): void {
    this.context.menuScreen.hide();
  }

  private resetGameState(): void {
    this.context.peachManager.releaseAll();
    this.context.bulletManager.releaseAll();
    this.context.livesManager.reset();
    this.context.scoreManager.reset();
    this.context.chapterManager.reset();
  }
}
```

---

### Phase 4.4: Extract BossStateController

**File to Create:** `src/states/BossStateController.ts`

**Purpose:** Encapsulate boss spawn/defeat sequence logic

```typescript
export class BossStateController {
  private isBossDefeating = false;

  constructor(private context: GameContext) {}

  get isDefeating(): boolean {
    return this.isBossDefeating;
  }

  spawnBoss(): void {
    this.context.megaPeachManager.spawn(/* center */);
    this.context.hud.showBossHealth();
    this.context.hud.hideWaveCounter();
  }

  async runDefeatSequence(): Promise<void> {
    this.isBossDefeating = true;
    try {
      await this.animateBossDefeat();
      this.cleanupBoss();
      this.transitionToNextPhase();
    } catch (error) {
      console.error('Boss defeat failed:', error);
      this.context.stateMachine.transitionTo(GameState.GAME_OVER);
    } finally {
      this.isBossDefeating = false;
    }
  }
}
```

---

### Phase 4.5: Refactor main.ts

**Goal:** Reduce from 789 lines to ~200 lines

**Final main.ts structure:**
```typescript
import { GameFactory, GameContext } from './core/GameFactory';
import { PlayingState } from './states/PlayingState';
import { MenuState } from './states/MenuState';
// ... other state imports

let context: GameContext;

async function init(): Promise<void> {
  context = GameFactory.createGameContext();

  registerStates(context);
  setupEventListeners(context);

  context.stateMachine.transitionTo(GameState.MENU);
  context.gameLoop.start();
}

function registerStates(ctx: GameContext): void {
  const playingState = new PlayingState(ctx);
  const menuState = new MenuState(ctx);
  // ...

  ctx.stateMachine.register(GameState.PLAYING, playingState);
  ctx.stateMachine.register(GameState.MENU, menuState);
  // ...
}

function setupEventListeners(ctx: GameContext): void {
  // Escape key handler
  // Resize handler
  // Menu callbacks
}

init().catch(console.error);
```

---

### Phase 4.6: Magic Numbers Extraction

**File to Modify:** `src/config/tuning.ts`

**Add constants from SpawnSystem:**
```typescript
// Wave Timing
export const WAVE_MIN_SPAWN_INTERVAL = 0.6;
export const WAVE_SPAWN_INTERVAL_REDUCTION = 0.15;

// Spawn Patterns
export const RING_SPAWN_RADIUS_FACTOR = 0.35;
export const LINE_SPAWN_EDGE_MARGIN = 0.1;
export const SCATTERED_SPAWN_MARGIN = 0.15;
```

**Add constants from ChapterManager:**
```typescript
// Wave Progression
export const CHAPTER_BASE_PEACH_COUNT = 4;
export const CHAPTER_PEACH_INCREMENT = 2;
export const CHAPTER_MAX_PEACH_COUNT = 12;
```

---

## Implementation Order

### Recommended Sequence

```
┌─────────────────────────────────────────────────────────────┐
│  Week 1: Critical Fixes (Sprint 1 + Sprint 2.1-2.2)        │
│                                                             │
│  Day 1-2: Hot-path allocations (Ship, CollisionSystem)     │
│  Day 3: TrailRenderer circular buffer                       │
│  Day 4: Memory leak fixes + SceneManager.dispose()         │
│  Day 5: Vitest setup + ObjectPool tests                    │
├─────────────────────────────────────────────────────────────┤
│  Week 2: Testing + Accessibility (Sprint 2.3-2.5 + Sprint 3)│
│                                                             │
│  Day 1: StateMachine tests                                  │
│  Day 2: CollisionSystem + PhysicsSystem tests              │
│  Day 3: ARIA roles + form labels                           │
│  Day 4: Live regions + LivesDisplay fix                    │
│  Day 5: Focus trap implementation                          │
├─────────────────────────────────────────────────────────────┤
│  Week 3: Architecture (Sprint 4)                           │
│                                                             │
│  Day 1-2: GameContext + GameFactory                        │
│  Day 3-4: PlayingState + MenuState extraction              │
│  Day 5: BossStateController + main.ts refactor             │
│  Day 6: Magic numbers extraction                           │
└─────────────────────────────────────────────────────────────┘
```

---

## Success Criteria

### Sprint 1 (Performance)
- [ ] No GC pauses >5ms during 60s max-load gameplay
- [ ] All dispose() methods implemented
- [ ] Memory stable after 10 game restart cycles

### Sprint 2 (Testing)
- [ ] Vitest configured and running
- [ ] 4 test files with 100% coverage of target modules
- [ ] `npm run test` passes in CI

### Sprint 3 (Accessibility)
- [ ] All modals have `role="dialog"` and `aria-modal="true"`
- [ ] All form inputs have associated labels
- [ ] Wave/boss updates announced to screen readers
- [ ] Focus trapped in settings modal

### Sprint 4 (Architecture)
- [ ] main.ts reduced to <250 lines
- [ ] GameContext interface documented
- [ ] State classes independently testable
- [ ] All magic numbers in tuning.ts

---

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Circular buffer breaks trail visuals | Medium | Low | Keep old implementation as fallback |
| State extraction introduces bugs | Medium | High | Run full manual playtest after refactor |
| Focus trap conflicts with game input | Low | Medium | Disable game input when modal open |
| Test mocks incomplete for Three.js | Medium | Medium | Use minimal mocks, test pure logic only |

---

## Verification Checklist

### After All Sprints Complete

**Performance:**
- [ ] Desktop: 60fps sustained at max load (high quality)
- [ ] Mobile: 45-60fps at max load (low quality)
- [ ] No memory growth after 10 restart cycles

**Testing:**
- [ ] `npm run test` passes
- [ ] Coverage >80% for core/, systems/
- [ ] No regressions from Phase 1-11 functionality

**Accessibility:**
- [ ] VoiceOver/NVDA can navigate all UI
- [ ] All interactive elements focusable
- [ ] No WCAG 2.1 Level A violations

**Architecture:**
- [ ] main.ts <250 lines
- [ ] All states in dedicated files
- [ ] GameContext used consistently
- [ ] Documentation updated

---

## Files Summary

### Files to Create
| File | Sprint | Purpose |
|------|--------|---------|
| `vitest.config.ts` | 2.1 | Test configuration |
| `src/setupTests.ts` | 2.1 | Test setup |
| `tests/systems/ObjectPool.test.ts` | 2.2 | Pool tests |
| `tests/core/StateMachine.test.ts` | 2.3 | FSM tests |
| `tests/systems/CollisionSystem.test.ts` | 2.4 | Collision tests |
| `tests/systems/PhysicsSystem.test.ts` | 2.5 | Physics tests |
| `src/core/GameContext.ts` | 4.1 | Context interface |
| `src/core/GameFactory.ts` | 4.1 | Object creation |
| `src/states/PlayingState.ts` | 4.2 | Playing handler |
| `src/states/MenuState.ts` | 4.3 | Menu handler |
| `src/states/BossStateController.ts` | 4.4 | Boss lifecycle |

### Files to Modify
| File | Sprint | Changes |
|------|--------|---------|
| `src/entities/Ship.ts` | 1.1 | Scratch vectors |
| `src/systems/CollisionSystem.ts` | 1.1 | Scratch vectors |
| `src/rendering/TrailRenderer.ts` | 1.2 | Circular buffer |
| `src/ui/RewardScreen.ts` | 1.3 | dispose() |
| `src/ui/MobileControls.ts` | 1.3 | dispose() |
| `src/ui/DebugOverlay.ts` | 1.3 | dispose() |
| `src/rendering/SceneManager.ts` | 1.4 | dispose() |
| `package.json` | 2.1 | Test deps |
| `src/ui/MenuScreen.ts` | 3.1, 3.2, 3.5 | ARIA, labels, focus trap |
| `src/ui/GameOverScreen.ts` | 3.1 | ARIA roles |
| `src/ui/VictoryScreen.ts` | 3.1 | ARIA roles |
| `src/ui/WaveCounter.ts` | 3.3 | Live region |
| `src/ui/BossHealthBar.ts` | 3.3 | Progressbar role |
| `src/ui/LivesDisplay.ts` | 3.4 | aria-hidden icons |
| `src/style.css` | 3.2 | sr-only class |
| `src/config/tuning.ts` | 4.6 | Magic numbers |
| `src/main.ts` | 4.5 | Refactor |

---

*Plan created by Claude Opus 4.5 on 2025-12-12*
*Ready for Traycer orchestration*
