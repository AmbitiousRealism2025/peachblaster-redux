# Peach Blaster — Master Plan

This document captures the current creative + technical master plan for **Peach Blaster**, a web‑based arcade game inspired by Asteroids but expanded into a surreal, chaptered campaign with a final boss.

## Vision

**Core identity:** semi‑realistic, juicy fruit wackiness in a neon‑space orchard.  
**Genre:** arcade shooter with light roguelite powerups.  
**Campaign:** 5 short chapters, each introducing new enemies/pickups/biomes, culminating in a final boss.  
**Tone:** playful cosmic‑fruit mysticism with occasional mild, cartoony body‑horror metamorphosis — colorful, funny, and strange, not grim.  
**Target full‑clear run length:** ~30–40 minutes (5 chapters), with retries feeling rewarding rather than marathon‑like.

## Tech Baseline

- **Build tooling:** `Vite + TypeScript + Three.js (WebGL2)`.
  - Fast iteration now; keep a **single‑file export target** for shareable “arcade builds”.
- **Rendering:** 2.5D feel using an **orthographic camera** + subtle depth/parallax.
  - GPU instancing for peaches/particles.
- **Physics:** custom lightweight inertia + wrap + circle collisions for MVP.
  - Upgrade to `rapier2d` only if richer shapes/constraints become necessary.
- **UI:** DOM/CSS overlay (crisp text, easy layout, good mobile ergonomics).
- **Audio:** WebAudio procedural SFX first; optional looped music layers in full project.

---

## Part 1 — Proof‑of‑Concept MVP (Vertical Slice)

Goal: a polished, playable **Chapter 1 + boss** slice proving core feel, art style, and campaign pipeline.

1. **Project scaffold**
   - Fresh repo, Vite TS setup.
   - Three.js scene, ortho camera, resize handling.
   - Game loop with fixed‑timestep physics + `requestAnimationFrame`.
   - Lightweight game state machine.
2. **Ship feel**
   - Triangular ship with inertia + damping tuned for arcade snap.
   - Thrust, rotation, max‑speed clamp, screen‑wrap.
   - Keyboard controls + simple mobile thumb buttons (left/right/thrust/fire).
3. **Core peaches**
   - Procedural peach texture via canvas gradient + fuzz/noise + juicy specular highlight.
   - Large → 2 Medium → 2 Small splitting.
   - Drift, wrap, pooling.
4. **Combat + collisions**
   - Bullets with cooldown + TTL; pooling.
   - Circle‑vs‑circle collision; ship uses forgiving hit radius.
   - Safe respawn with brief invulnerability blink.
5. **Chapter system v0**
   - `chapters[]` config with: enemy set, wave count, background tint, music cue.
   - Chapter title card + surreal one‑liner.
   - Between‑chapter reward/heal screen (simple).
6. **Boss slice (end of Chapter 1)**
   - “Mega Peach” two‑phase fight (~2–3 minutes):
     - **Phase A:** orbiting pit‑satellites must be cleared to expose a weak core.
     - **Phase B:** core pulses gravity waves + seed barrages; short vulnerability windows after attacks.
7. **Juice v0**
   - Split burst particles (pulp chunks + juice droplets).
   - Micro hit‑pause, subtle screen shake, bullet/ship trails, thruster plume.
   - WebAudio SFX pass: thrust hiss, seed pop, peach split squish.
8. **Export**
   - Stable web build.
   - Optional single‑file `index.html` “arcade export” target.

Deliverable: a fun Chapter 1 loop + boss, with the pipeline ready for more chapters.

---

## Part 2 — Fully Realized Game (5‑Chapter Campaign)

Goal: expand the vertical slice into a complete, replayable, beautiful campaign.

### Campaign Structure

- **5 chapters**, each: 4–6 waves + mini‑boss → short intermission choice → next chapter.
- Each chapter introduces:
  - **1 new enemy variant**
  - **1 new pickup/weapon**
  - **1 new biome/visual treatment**
- Optional collectible lore (“peel fragments”) that assemble into a bizarre orchard‑cosmology myth.

### Chapter Outline

1. **Orchard Belt**
   - Classic drifting peaches, gentle ramp.
   - Pickup: **seed spread‑shot**.
   - Mini‑boss: **Twin Orchard Peaches** that fuse/split.
2. **Syrup Nebula**
   - Rotten peaches leak sticky slow‑clouds; intermittent low‑grav zones.
   - Pickup: **juice‑dash** (short invuln burst).
   - Mini‑boss: **Molasses Maw** spawning goo rings.
3. **Pitstorm Reef**
   - Pit‑satellites latch onto peaches creating spiky clusters.
   - Pickup: **pit bomb** (slow heavy shot with big split).
   - Mini‑boss: **Pit Cyclone** with rotating hazard spokes.
4. **Fuzz Cathedral**
   - Armored/fuzzy peaches with glow‑beat weak points.
   - Pickup: **fuzz beam** (short cone melt).
   - Mini‑boss: **Choir Peach** that “sings” radial waves.
5. **Canning Moon**
   - Golden bonus peaches + gravity wells bending bullets/paths.
   - Pickup: **peel shield** (temporary orbiting rind).
   - Mini‑boss: **Preserver Jar** trapping space into rotating corridors.

### Final Boss

**“The First Peach / Jam Singularity”** (3 cinematic phases, ~5–7 minutes)

1. **Rind Phase**
   - Rotating armor plates + pit turrets.
   - Break plates to open seams.
2. **Pulp Phase**
   - Interior exposed; spits syrup comets leaving wrap‑around trails.
3. **Seed Core Phase**
   - Core detaches and chases.
   - Arena briefly disables wrap, forcing tight dodges.
   - Combo/juice meter fuels last‑stand specials.

Defeat moment: boss implodes into a starburst of seeds that become the end‑screen constellation.

### Systems & Polish

- **Enemy ecology:** armored peaches, rotten gas‑leakers, spiky pit‑clusters, golden bonuses, homers/chargers.
- **Weapons/powerups:** choice‑based pickups between waves; keep controls simple.
- **Scoring/progression:** combo meter + juice meter for specials; cosmetic/meta unlocks.
- **Art pass:** fuzz/peach shaders, gooey interiors on split, parallax biomes.
- **Post‑FX:** bloom, vignette, subtle chromatic aberration, all toggleable.
- **Audio/music:** layered synth groove that ramps with combo/wave; dynamic mixing.
- **UX/accessibility:** thumb‑zone controls, drag‑aim option, haptics, remap keys, gamepad, reduced‑motion + color‑safe modes.
- **Performance:** instancing, pooling, LOD, quality slider, mobile FX downshift.
- **Packaging:** PWA optional; offline arcade build.

---

## Next Step

Start Part 1 scaffold and agree on a compact visual mood board (palette, lighting, peach material targets), then build Chapter 1 vertical slice end‑to‑end.

