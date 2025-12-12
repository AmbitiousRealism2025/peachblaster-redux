# Peach Blaster Redux — Documentation Index

## Quick Links

| Document | Description |
|----------|-------------|
| [README.md](../README.md) | Project overview, setup, and controls |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System design, code structure, data flow |
| [TECH_STACK.md](./TECH_STACK.md) | Technologies, APIs, build configuration |
| [GAMEPLAY.md](./GAMEPLAY.md) | Game mechanics, features, UI specification |
| [TESTING.md](./TESTING.md) | Manual testing, profiling, bug reporting |

## Agent Documentation

| Document | Description |
|----------|-------------|
| [AGENTS.md](../AGENTS.md) | Multi-agent workflow and conventions |
| [CLAUDE.md](../CLAUDE.md) | Claude agent guidelines (refinement & review) |
| [MASTER_PLAN.md](../MASTER_PLAN.md) | Creative vision and content roadmap |
| [progress.md](../progress.md) | Phase-by-phase implementation log |

## Project Summary

**Peach Blaster Redux** is an Asteroids-inspired arcade shooter with:

- 5-chapter campaign with boss fight
- Procedural peach rendering (no image assets)
- WebAudio procedural sound effects
- Mobile-friendly touch controls
- Single-file offline export

## Tech Stack at a Glance

| Layer | Technology |
|-------|------------|
| Language | TypeScript 5.7 (strict mode) |
| Rendering | Three.js 0.165 (WebGL2) |
| Build | Vite 6.0 |
| Audio | WebAudio API (procedural) |
| UI | DOM/CSS overlay |

## Getting Started

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Production build
npm run build

# Single-file export
npm run export:single
```

## Architecture Overview

```
src/
├── core/       # GameLoop, StateMachine, Time, Managers
├── entities/   # Ship, Peach, Bullet, Boss entities
├── systems/    # Physics, Collision, Spawn, ObjectPool
├── rendering/  # SceneManager, Shaders, Particles, Trails
├── input/      # InputManager (keyboard + touch)
├── audio/      # SFXManager (WebAudio)
├── ui/         # HUD, Menus, Screens, Mobile controls
└── config/     # tuning.ts, chapters.ts
```

## Key Design Decisions

1. **Object Pooling** — Zero-allocation gameplay for consistent performance
2. **Instanced Rendering** — Single draw call per entity type
3. **Procedural Assets** — No external images or audio files
4. **Fixed Timestep** — 60Hz physics with variable render
5. **DOM UI** — Crisp text and easy layout via HTML/CSS

## Performance Targets

| Platform | Target |
|----------|--------|
| Desktop | 60 FPS |
| Mobile | 45-60 FPS |

## Multi-Agent Workflow

```
1. ChatGPT 5.2 drafts plan
2. Claude Opus refines → final spec
3. Traycer orchestrates YOLO execution
4. ChatGPT 5.2 implements
5. Claude Opus reviews
```

## Documentation Maintenance

When updating documentation:

1. **Architecture changes** → Update ARCHITECTURE.md
2. **New dependencies** → Update TECH_STACK.md
3. **New features** → Update GAMEPLAY.md
4. **New test procedures** → Update TESTING.md
5. **Phase completion** → Update progress.md
6. **Agent guidance** → Update AGENTS.md or CLAUDE.md
