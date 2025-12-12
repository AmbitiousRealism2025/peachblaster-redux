# Peach Blaster Redux — Gameplay & Functional Specification

## Game Overview

**Peach Blaster Redux** is an Asteroids-inspired arcade shooter expanded into a 5-chapter campaign with boss fights. Players control a spaceship, destroying drifting peaches while avoiding collisions.

**Target playtime:** 30-40 minutes for a full campaign clear.

---

## Core Mechanics

### Ship Controls

| Action | Desktop | Mobile |
|--------|---------|--------|
| Thrust | W / Arrow Up | Joystick Down |
| Rotate Left | A / Arrow Left | Joystick Left |
| Rotate Right | D / Arrow Right | Joystick Right |
| Fire | Space | Fire Button |
| Pause | Escape | — |

### Movement Physics

The ship uses Asteroids-style inertia:

- **Thrust:** Accelerates in the direction the ship is facing
- **Inertia:** Ship continues moving after thrust stops
- **Damping:** Gradual velocity reduction (friction)
- **Max Speed:** Velocity capped for playability
- **Screen Wrap:** Exiting one edge wraps to the opposite

### Shooting

- Bullets fire from ship's nose in facing direction
- Bullets inherit ship's velocity + fixed speed
- Fixed cooldown between shots (0.15 seconds)
- Bullets expire after 2 seconds (TTL)
- Maximum 100 active bullets

### Lives System

- Start with 3 lives
- Lose 1 life on collision with:
  - Peaches
  - Boss projectiles (seeds)
  - Boss core
- Respawn at center with brief invulnerability (2 seconds)
- Invulnerability shown via blinking effect
- Game over when lives reach 0

---

## Enemy: Peaches

### Behavior

- Drift across screen at random angles
- Rotate while drifting
- Screen wrap (continuous movement)
- No targeting or aggression

### Splitting Mechanic

| Size | Radius | Splits Into | Score |
|------|--------|-------------|-------|
| Large | 1.2 | 2 Medium | 20 |
| Medium | 0.8 | 2 Small | 50 |
| Small | 0.5 | Nothing | 100 |

Split peaches inherit parent velocity with perpendicular spread.

### Spawn Patterns

| Pattern | Description |
|---------|-------------|
| Edge | Spawn at screen edges, drift inward |
| Ring | Spawn in circle around center |
| Line | Spawn in line from single edge |
| Scattered | Random positions avoiding ship |

All patterns respect a safe zone around the player ship.

---

## Chapter System

### Structure

- 5 chapters total
- Each chapter: 4-6 waves + optional boss
- Waves increase peach count progressively
- Chapter completion awards life restoration

### Chapter Progression

```
Chapter 1: Orchard Belt
├── Waves 1-4
└── No boss (introduction chapter)

Chapter 2: Syrup Nebula
├── Waves 1-5
└── No boss

Chapter 3: Pitstorm Reef
├── Waves 1-5
└── No boss

Chapter 4: Fuzz Cathedral
├── Waves 1-6
└── No boss

Chapter 5: Canning Moon
├── Waves 1-6
└── Boss: MegaPeach (final boss)
```

### Wave Mechanics

- Base peach count: 3
- +1 peach per wave
- Spawn interval decreases each wave
- Pattern rotation for variety
- Wave clears when all peaches destroyed

### Between Chapters

1. Chapter title card with flavor text
2. Reward screen showing stats
3. Life restoration (if applicable)
4. Brief preparation before next chapter

---

## Boss Fight: MegaPeach

### Overview

The boss appears after completing Chapter 5's final wave. It's a two-phase fight with distinct attack patterns.

### Phase A (100% → 50% health)

| Element | Behavior |
|---------|----------|
| Core | Stationary at center, vulnerable |
| Satellites | 6 orbiting shields with 3 HP each |
| Attack | Aimed seed shots at player |

Strategy: Destroy satellites to expose core, dodge aimed shots.

### Phase B (50% → 0% health)

| Element | Behavior |
|---------|----------|
| Core | Alternates vulnerable/invulnerable |
| Gravity | Pulls ship toward center when near |
| Attack | Radial seed barrages (12 seeds) |

Strategy: Attack during vulnerability windows, resist gravity pull, weave through barrages.

### Boss Defeat

1. Seeds cleared immediately
2. Boss shrinks over 1 second
3. Victory screen if final chapter
4. Chapter transition otherwise

---

## Scoring System

### Points

| Action | Points |
|--------|--------|
| Destroy Large Peach | 20 |
| Destroy Medium Peach | 50 |
| Destroy Small Peach | 100 |
| Hit Boss | 10 |
| Destroy Satellite | 50 |
| Defeat Boss | 1000 |

### Statistics Tracked

- Total score
- Peaches destroyed (per chapter and total)
- Waves cleared
- Time elapsed

---

## Visual Effects

### Particles

| Event | Effect |
|-------|--------|
| Peach destroyed | Orange burst + juice droplets |
| Bullet impact | Cyan spark burst |
| Ship damage | Red burst |
| Thruster | Continuous green particles |

### Trails

- Ship: Green fading trail behind movement
- Bullets: Cyan fading trail

### Screen Effects

| Event | Effect |
|-------|--------|
| Peach split | Light screen shake |
| Ship damage | Heavy screen shake |
| Boss hit | Medium screen shake |
| Any impact | Brief hit-pause (50ms) |

### Post-Processing

| Quality | Effects |
|---------|---------|
| Low | None |
| Medium | Bloom + Vignette |
| High | Bloom + Vignette + Chromatic Aberration |

---

## Audio

### Sound Effects

| Event | Sound |
|-------|-------|
| Thrust | Continuous rumble (white noise) |
| Fire | Short beep |
| Peach split | Squelchy burst |
| Ship damage | Harsh buzz |
| Boss hit | Deep thud |

### Controls

- Volume: 0-100% slider
- Mute: Toggle button or 'M' key
- Settings persist via localStorage

---

## User Interface

### In-Game HUD

```
┌─────────────────────────────────────────┐
│ ❤️ ❤️ ❤️                    Wave 3/6    │
│                                         │
│               [Game Area]               │
│                                         │
│ Score: 12,450                           │
└─────────────────────────────────────────┘
```

### Menu Screen

- Title with Play button
- Settings (Volume, Quality)
- Credits (future)

### Pause Menu

- Resume button
- Settings access
- Quit to menu

### Game Over Screen

- Final score
- Peaches destroyed
- Waves cleared
- Retry / Main Menu buttons

### Victory Screen

- Final score
- Peaches destroyed
- Completion time
- Play Again / Main Menu buttons

### Mobile UI

- Virtual joystick (bottom-left)
- Fire button (bottom-right)
- Touch areas: 150px diameter

---

## Game States

| State | Description |
|-------|-------------|
| LOADING | Initial load, auto-transitions to MENU |
| MENU | Title screen, settings, start game |
| PLAYING | Active gameplay |
| PAUSED | Game frozen, pause menu visible |
| CHAPTER_TRANSITION | Between chapters |
| GAME_OVER | Player lost all lives |
| VICTORY | Campaign complete |

### Valid Transitions

```
LOADING → MENU
MENU → PLAYING
PLAYING → PAUSED, CHAPTER_TRANSITION, GAME_OVER, VICTORY
PAUSED → PLAYING, MENU
CHAPTER_TRANSITION → PLAYING, GAME_OVER, VICTORY
GAME_OVER → MENU, PLAYING (retry)
VICTORY → MENU
```

---

## Accessibility

### Implemented

- Reduced motion detection (forces low quality)
- Keyboard-only navigation (Enter activates buttons)
- High contrast UI elements
- No critical information by color alone

### Settings Persistence

All settings saved to localStorage:
- Volume level
- Mute state
- Quality preset

---

## Performance Targets

| Platform | Target FPS |
|----------|------------|
| Desktop | 60 fps |
| Mobile (mid-range) | 45-60 fps |

### Max Load Scenario

- 50 peaches active
- 100 bullets active
- 200 particles active
- Boss + satellites + seeds active
- All post-processing effects (high quality)

---

## Future Content (Planned in MASTER_PLAN.md)

### Enemy Variants
- Rotten peaches (slow clouds)
- Armored peaches (weak points)
- Golden bonus peaches

### Power-ups
- Seed spread-shot
- Juice-dash (invulnerability burst)
- Pit bomb (heavy shot)
- Fuzz beam (cone attack)
- Peel shield (orbiting protection)

### Additional Bosses
- Twin Orchard Peaches (Chapter 1)
- Molasses Maw (Chapter 2)
- Pit Cyclone (Chapter 3)
- Choir Peach (Chapter 4)
- The First Peach (final boss, 3 phases)

### Systems
- Combo meter
- Juice meter for specials
- Collectible lore fragments
- Adaptive music layers
