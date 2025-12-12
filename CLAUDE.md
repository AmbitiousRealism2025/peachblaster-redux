# CLAUDE.md — Claude Agent Guide for Peach Blaster Redux

This file provides context and guidelines for Claude agents working on this project.

## Claude's Role

**Primary responsibilities:** Plan refinement and phase review.

This project uses a multi-agent workflow. Claude operates at two key stages:

### Stage 2: Plan Refinement
After ChatGPT 5.2 creates a first-draft plan, Claude:
- Reviews the draft for gaps, risks, and architectural concerns
- Refines the plan into a final draft specification
- Ensures alignment with project conventions and goals
- Validates that the plan is detailed enough for YOLO execution

### Stage 5: Phase Review
After Traycer completes a YOLO implementation loop, Claude:
- Reviews code produced by ChatGPT 5.2
- Identifies bugs, performance issues, and technical debt
- Validates design decisions against project goals
- Documents findings and recommendations

### Workflow Overview

```
1. DRAFT        ChatGPT 5.2 creates first-draft plan
2. REFINE       Claude Opus reviews and refines → final draft  ← YOU ARE HERE
3. ORCHESTRATE  Traycer breaks into phases for YOLO execution
4. IMPLEMENT    Traycer runs YOLO loop with ChatGPT 5.2
5. REVIEW       Claude Opus conducts phase review              ← AND HERE
```

**Do not** implement features directly unless explicitly requested. Instead, produce refined specifications or review feedback.

---

## Project Summary

**Peach Blaster Redux** is a web-based arcade shooter inspired by Asteroids, expanded into a 5-chapter campaign with boss fights and procedural fruit enemies.

**Aesthetic:** Semi-realistic juicy fruit wackiness in a neon-space orchard. Playful cosmic fruit-mysticism with occasional mild, cartoony body-horror metamorphosis — colorful, funny, and strange, not grim.

**Target runtime:** ~30–40 minutes for a full clear (5 chapters).

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Build | Vite + TypeScript (strict mode) |
| Render | Three.js (WebGL2), orthographic 2.5D camera, instancing |
| Physics | Custom lightweight inertia + wrap + circle collision |
| UI | DOM/CSS overlay |
| Audio | WebAudio procedural SFX |

**Do not** introduce heavy frameworks unless there is a clear, agreed benefit.

---

## Directory Structure

```
src/
├── core/          # Game loop, state machine, time, managers
├── entities/      # Ship, peaches, bullets, bosses
├── systems/       # Physics, collisions, spawning, pooling
├── rendering/     # Scene, materials, particles, trails, shaders
├── input/         # Keyboard + touch input
├── audio/         # WebAudio SFX manager
├── ui/            # DOM overlays (HUD, menus, screens)
└── config/        # Tuning constants, chapter configs
```

---

## Key Commands

```bash
npm install           # Install dependencies
npm run dev           # Dev server (localhost:5173)
npm run build         # Production build → dist/
npm run preview       # Preview production build
npm run export:single # Single-file arcade export → dist/peachblaster-arcade.html
```

---

## Code Conventions

- **TypeScript strict mode** — all code must pass strict checks
- **Small, pure helper functions** over large classes
- **Object pooling** for bullets, peaches, particles (zero-allocation hot paths)
- **Instanced rendering** for performance (single draw call per entity type)
- **Fixed timestep** (60Hz physics) with interpolated rendering
- **No external image assets** for peaches — textures are procedural
- **Descriptive identifiers** — avoid one-letter variable names

---

## Architecture Notes

### State Machine
Game flow is managed by `StateMachine` with states:
```
LOADING → MENU → PLAYING ↔ PAUSED
                    ↓
           CHAPTER_TRANSITION → VICTORY
                    ↓
               GAME_OVER
```

### Boss Progression
Boss logic lives in `src/core/BossProgression.ts` (not `ChapterManager`).
- `BossProgression.startChapter()` resets per-chapter boss state
- `BossProgression.shouldSpawnBoss()` triggers boss after final wave
- Modify `BossProgression` for boss behavior changes, not `ChapterManager`

### Settings Persistence
localStorage keys:
- `peachblaster_volume` (0.0–1.0)
- `peachblaster_muted` ("true"/"false")
- `peachblaster_quality` ("low"/"medium"/"high")

---

## Performance Targets

| Platform | Target FPS |
|----------|------------|
| Desktop | 60fps sustained |
| Mobile (mid-range) | 45–60fps |

**Max load scenario:** 50 peaches + 100 bullets + 200 particles + boss active.

Quality presets (low/medium/high) provide performance scaling. Reduced-motion preference forces low quality.

---

## Review Criteria

When reviewing code from ChatGPT 5.2, evaluate:

### Performance
- [ ] No `new THREE.*` allocations in update loops (use preallocated scratch objects)
- [ ] Object pooling used for frequently created/destroyed entities
- [ ] Instanced rendering for batched entities

### Code Quality
- [ ] TypeScript strict mode compliance
- [ ] Consistent naming conventions (PascalCase classes, camelCase methods)
- [ ] No magic numbers — extract to `src/config/tuning.ts`
- [ ] Error handling for async operations

### Architecture
- [ ] Follows existing patterns (manager singletons, pool-based entities)
- [ ] Proper separation of concerns (rendering vs simulation)
- [ ] State machine transitions are valid and handled

### Gameplay
- [ ] Readability — player can track ship and threats
- [ ] Accessibility — respects reduced-motion, no color-only information
- [ ] Mobile — touch controls functional and ergonomic

---

## Plan Refinement Guidelines

When refining ChatGPT 5.2's first-draft plans into final specifications:

### What to Check
1. **Completeness** — Are all necessary files, changes, and constants identified?
2. **Consistency** — Does the plan follow existing codebase patterns?
3. **Clarity** — Is each step specific enough for YOLO execution without ambiguity?
4. **Dependencies** — Are prerequisites and execution order clear?
5. **Risks** — Are edge cases, performance concerns, and potential issues noted?
6. **Acceptance criteria** — Is "done" clearly defined and testable?

### Refinement Actions
- **Add missing details** — File paths, TypeScript types, tuning constants
- **Reorder steps** — Optimize for Traycer's YOLO orchestration
- **Split large steps** — Break into atomic, verifiable tasks
- **Flag concerns** — Note risks or alternatives for user decision
- **Reference patterns** — Point to similar implementations in codebase

### Final Draft Template

```markdown
## Feature: [Name]

### Overview
[Brief description — what and why]

### Files to Create
- `src/path/NewFile.ts` — [purpose]

### Files to Modify
- `src/path/ExistingFile.ts` — [what changes]

### New Tuning Constants
// Add to src/config/tuning.ts
export const NEW_CONSTANT = value; // [description]

### Implementation Phases (for Traycer)
#### Phase N.1: [Name]
- [ ] Step with specific details
- [ ] Verification: [how to confirm step worked]

#### Phase N.2: [Name]
- [ ] Step with specific details
- [ ] Verification: [how to confirm step worked]

### Risks & Considerations
- [Potential issue and mitigation]

### Acceptance Criteria
- [ ] [Testable criterion]
- [ ] [Testable criterion]
```

---

## Current Project State

**All 11 phases complete.** The game is playable with:
- Ship controls with inertia
- Peach enemies with splitting behavior
- 5-chapter campaign with boss fight
- Lives, scoring, and wave progression
- Particles, trails, screen shake
- Procedural WebAudio SFX
- Full UI (menus, HUD, settings)
- Post-processing effects (bloom, vignette, chromatic aberration)
- Production build and single-file export

### Known Technical Debt
- No automated test coverage
- Some magic numbers remain in `SpawnSystem`
- Chapter background tints not yet applied
- JSDoc missing on some public APIs

See `progress.md` for detailed phase completion notes.
See `PHASE_1-5_REVIEW.md` for the initial code review and recommendations.

---

## Reference Documents

| File | Purpose |
|------|---------|
| `MASTER_PLAN.md` | Creative vision and full campaign roadmap |
| `AGENTS.md` | Detailed agent guidance and phase notes |
| `progress.md` | Phase-by-phase implementation log |
| `PHASE_1-5_REVIEW.md` | Code review with scoring and action items |
| `user-testing.md` | QA/playtester guide |
| `README.md` | User-facing documentation |

---

## Collaboration Protocol

### When Refining a Draft (Stage 2)
1. Read ChatGPT 5.2's first draft thoroughly
2. Check against the refinement guidelines above
3. Restructure into Implementation Phases optimized for Traycer's YOLO execution
4. Add verification steps for each phase
5. Flag any risks or decisions needing user input
6. Output the final draft specification

### When Conducting Phase Review (Stage 5)
1. Read the implemented code (use file paths from the plan)
2. Evaluate against the Review Criteria checklist
3. Provide structured feedback with file locations and line numbers
4. Categorize issues: Critical (blocks next phase) / Major (should fix) / Minor (nice to have)
5. Document findings in a review summary

### General Guidelines
- **Reference existing patterns** in the codebase before suggesting new approaches
- **Scope control** — Push back on scope creep; recommend landing vertical slices before expanding
- **Be specific** — Vague feedback creates ambiguity for the YOLO loop
