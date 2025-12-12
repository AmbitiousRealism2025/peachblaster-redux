# Peach Blaster Redux — Testing Guide

## Overview

This document provides comprehensive testing guidelines for Peach Blaster Redux, covering manual testing procedures, performance profiling, and future automated testing recommendations.

---

## Quick Start Testing

### Development Server

```bash
npm install
npm run dev
# Open http://localhost:5173
```

### Production Build

```bash
npm run build
npm run preview
# Open http://localhost:4173
```

### Offline Build

```bash
npm run export:single
# Open dist/peachblaster-arcade.html via file:// protocol
```

---

## Manual Test Checklist

### Core Gameplay

#### Ship Controls
- [ ] Thrust accelerates ship forward
- [ ] Left/right rotates ship smoothly
- [ ] Ship drifts with inertia when not thrusting
- [ ] Ship slows down gradually (damping)
- [ ] Ship wraps around screen edges
- [ ] Ship respects max speed cap

#### Shooting
- [ ] Fire button creates bullets
- [ ] Bullets travel in ship's facing direction
- [ ] Bullets inherit ship velocity
- [ ] Fire cooldown prevents spam
- [ ] Bullets disappear after TTL (2 seconds)
- [ ] Bullets wrap around screen

#### Peach Enemies
- [ ] Peaches spawn from edges
- [ ] Peaches drift and rotate
- [ ] Peaches wrap around screen
- [ ] Large → 2 Medium on destroy
- [ ] Medium → 2 Small on destroy
- [ ] Small → Nothing on destroy
- [ ] Split peaches have perpendicular velocities
- [ ] Safe zone prevents spawning on player

#### Collision Detection
- [ ] Bullets destroy peaches
- [ ] Ship-peach collision causes damage
- [ ] Damage triggers invulnerability
- [ ] Invulnerability shows blinking
- [ ] No damage during invulnerability

#### Lives System
- [ ] Start with 3 lives
- [ ] Lives decrement on damage
- [ ] Lives display updates correctly
- [ ] Game over at 0 lives

#### Scoring
- [ ] Score increases on peach destroy
- [ ] Larger peaches = fewer points
- [ ] Score display updates in real-time

---

### Chapter Progression

#### Wave System
- [ ] Waves spawn correct peach count
- [ ] Wave clears when all peaches destroyed
- [ ] Wave counter updates
- [ ] Next wave starts after clear

#### Chapter Transitions
- [ ] Chapter title card appears
- [ ] Reward screen shows stats
- [ ] Life restoration works
- [ ] Smooth transition to next chapter

#### Boss Fight (Chapter 5)
- [ ] Boss spawns after final wave
- [ ] Satellites orbit correctly
- [ ] Phase A: Aimed seed shots
- [ ] Satellite destruction exposes core
- [ ] Phase B triggers at 50% health
- [ ] Phase B: Radial barrages
- [ ] Phase B: Gravity pull effect
- [ ] Boss defeat animation plays
- [ ] Victory screen appears

---

### User Interface

#### Menu Screen
- [ ] Title displays correctly
- [ ] Play button starts game
- [ ] Settings accessible
- [ ] Volume slider works
- [ ] Mute toggle works
- [ ] Quality preset selector works

#### Pause System
- [ ] Escape pauses game
- [ ] Pause menu appears
- [ ] Resume continues game
- [ ] Quit returns to menu
- [ ] Game state preserved during pause

#### HUD
- [ ] Lives display accurate
- [ ] Score display accurate
- [ ] Wave counter accurate
- [ ] Boss health bar shows during fight
- [ ] Mobile controls visible on touch devices

#### Game Over / Victory
- [ ] Game over shows final stats
- [ ] Retry restarts correctly
- [ ] Victory shows completion stats
- [ ] Play again works

---

### Audio

- [ ] Thrust sound plays when thrusting
- [ ] Thrust sound stops when not thrusting
- [ ] Fire sound plays on shoot
- [ ] Split sound plays on peach destroy
- [ ] Damage sound plays on collision
- [ ] Boss hit sound plays
- [ ] Volume control works
- [ ] Mute toggle works
- [ ] Settings persist after reload
- [ ] Audio starts after first interaction

---

### Visual Effects

#### Particles
- [ ] Split particles on peach destroy
- [ ] Impact particles on bullet hit
- [ ] Thruster particles while thrusting
- [ ] Juice droplets fall with gravity

#### Post-Processing
- [ ] Low quality: No effects
- [ ] Medium quality: Bloom + vignette
- [ ] High quality: All effects
- [ ] Quality changes apply immediately

#### Screen Effects
- [ ] Screen shake on impacts
- [ ] Hit-pause on collisions
- [ ] Trails follow ship and bullets

---

### Mobile Testing

#### Touch Controls
- [ ] Joystick responds to touch
- [ ] Joystick drag controls rotation/thrust
- [ ] Fire button fires bullets
- [ ] Multi-touch works (move + fire)
- [ ] Controls positioned correctly
- [ ] Controls scale on different screens

#### Performance
- [ ] 45+ FPS on mid-range device
- [ ] No visible stuttering
- [ ] Touch latency acceptable

---

### Accessibility

- [ ] Reduced motion forces low quality
- [ ] Keyboard navigation works (Enter on buttons)
- [ ] Focus indicators visible
- [ ] No color-only information

---

### Edge Cases

#### Boundary Conditions
- [ ] 0 lives triggers game over
- [ ] Maximum bullets (100) doesn't crash
- [ ] Maximum peaches (50) doesn't crash
- [ ] Very fast gameplay stable

#### State Transitions
- [ ] Rapid pause/unpause stable
- [ ] Menu → Play → Pause → Menu works
- [ ] Game over → Retry → Play works
- [ ] Victory → Play Again works

#### Error Recovery
- [ ] Missing localStorage handled gracefully
- [ ] Audio context failure doesn't crash
- [ ] WebGL context loss handled (if applicable)

---

## Performance Testing

### Desktop Profiling (Chrome DevTools)

1. Open DevTools → Performance tab
2. Start recording
3. Play through a busy wave (Chapter 5 + boss)
4. Stop recording after 30 seconds
5. Analyze:

| Metric | Target |
|--------|--------|
| FPS | 60 fps sustained |
| Frame time | < 16.67ms |
| JS execution | < 10ms per frame |
| GC pauses | < 5ms, infrequent |

### Mobile Profiling (Chrome Remote Debug)

1. Connect Android device via USB
2. Enable USB debugging
3. Open chrome://inspect
4. Profile using Performance tab
5. Test max load scenario

| Metric | Target |
|--------|--------|
| FPS | 45-60 fps |
| Frame time | < 22ms |
| Memory | < 100MB |

### Memory Testing

1. Open DevTools → Memory tab
2. Take heap snapshot before play
3. Play for 5 minutes
4. Take heap snapshot after
5. Compare for leaks

Watch for:
- Increasing `Detached DOM trees`
- Growing `Array` counts
- Unbounded `Vector3/Matrix4` instances

---

## Debug Tools

### Debug Overlay (Dev Only)

Toggle with F1 key:
- Current FPS
- Frame time (ms)
- Current game state
- Elapsed time

### Console Commands (Dev Only)

State transitions and game events logged to console:
```
State transition: MENU -> PLAYING
State entered: PLAYING
```

### Mute Shortcut

Press 'M' to toggle audio mute (persists to localStorage).

---

## Offline Testing

### Single-File Export

```bash
npm run export:single
```

Test procedure:
1. Disconnect from network
2. Open `dist/peachblaster-arcade.html` via file:// protocol
3. Verify game loads completely
4. Verify all gameplay works
5. Verify audio works
6. Verify settings persist

### Cross-Browser Verification

Test the export in:
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge

---

## Regression Test Scenarios

### Scenario 1: Full Campaign Clear

1. Start new game from menu
2. Complete all 5 chapters
3. Defeat boss
4. Verify victory screen
5. Return to menu

**Expected:** No crashes, correct stats displayed

### Scenario 2: Game Over and Retry

1. Start game
2. Intentionally lose all lives
3. View game over screen
4. Click Retry
5. Complete at least one wave

**Expected:** Clean reset, no state carryover

### Scenario 3: Settings Persistence

1. Change volume to 50%
2. Change quality to High
3. Enable mute
4. Refresh page
5. Check settings

**Expected:** All settings preserved

### Scenario 4: Pause During Boss

1. Reach boss fight
2. Pause mid-fight
3. Access settings
4. Resume
5. Complete boss

**Expected:** Boss state preserved, no audio glitches

### Scenario 5: Mobile Touch Stress

1. Load on mobile device
2. Rapid touch inputs
3. Multi-touch (move + fire)
4. Play through one chapter

**Expected:** No input drops, stable FPS

---

## Future: Automated Testing

### Recommended Test Framework

```bash
npm install --save-dev vitest jsdom
```

### Unit Test Priorities

1. **ObjectPool** — Acquire/release behavior
2. **StateMachine** — Transition validation
3. **CollisionSystem** — Circle collision math
4. **PhysicsSystem** — Wrap boundaries, clamping
5. **ChapterManager** — Wave progression

### Example Test Structure

```typescript
// src/systems/__tests__/ObjectPool.test.ts
import { describe, it, expect } from 'vitest';
import ObjectPool from '../ObjectPool';

describe('ObjectPool', () => {
  it('should acquire and release objects', () => {
    const pool = new ObjectPool(() => ({ value: 0 }), 5);
    const obj = pool.acquire();
    expect(pool.activeCount).toBe(1);
    pool.release(obj);
    expect(pool.activeCount).toBe(0);
  });
});
```

### Integration Test Priorities

1. Ship movement with input simulation
2. Peach splitting behavior
3. Chapter progression flow
4. Boss fight phase transitions

---

## Bug Report Template

When reporting issues, include:

```markdown
## Bug Report

**Device:** [Desktop/Mobile, OS, Browser]
**Build:** [Dev/Production/Single-file]
**Quality Setting:** [Low/Medium/High]

**Steps to Reproduce:**
1.
2.
3.

**Expected Behavior:**


**Actual Behavior:**


**Console Errors (if any):**


**Screenshot/Video:**

```

---

## Performance Optimization Checklist

If performance issues are found:

- [ ] Check quality setting (try Low)
- [ ] Profile with DevTools
- [ ] Look for GC pauses in timeline
- [ ] Check draw call count (aim for < 10)
- [ ] Verify object pooling is working
- [ ] Check for `new THREE.*` in hot paths
- [ ] Verify instanced mesh updates batched
- [ ] Check particle pool not exceeded
