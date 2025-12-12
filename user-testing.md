# Peach Blaster Redux — User Testing Guide

This document is for playtesters and QA. It describes how the game works, the controls, and a checklist of things to try.

## Getting A Build To Test

### Option A: Dev Server (recommended for iteration)

```bash
npm install
npm run dev
```

Open the URL printed in the terminal.

### Option B: Production Build

```bash
npm run build
npm run preview
```

### Option C: Offline Single-File Arcade Build

```bash
npm run export:single
```

Open `dist/peachblaster-arcade.html` in a browser (file://). Re-test with your network disconnected to confirm offline play.

## Game Mechanics (How It Works)

### Core Loop

- **Move, shoot, survive:** Fly the ship with inertia, destroy drifting peaches, and avoid collisions.
- **Screen wrap:** Leaving one edge wraps you to the opposite side.
- **Waves → chapters:** Each chapter consists of multiple waves. Clearing all waves advances the chapter.

### Ship

- **Inertia + damping:** You drift after thrusting and gradually slow down when not thrusting.
- **Damage + invulnerability:** Colliding with hazards costs a life; after respawn you briefly blink and can’t be hit.

### Shooting

- **Fire bullets** with a short cooldown between shots.
- Bullets have a limited lifetime; missed shots expire automatically.

### Enemies (Peaches)

- **Splitting rule:** Large → 2 Medium → 2 Small.
- Smaller peaches are harder to hit and award more points.
- Contact with the ship causes damage.

### Boss (Final Chapter)

- The boss appears after the last wave of the final chapter.
- **Phase A:** Boss is vulnerable and fires aimed seed shots.
- **Phase B:** Boss alternates vulnerability windows, fires radial barrages, and exerts a gravity pull on the ship when nearby.

### Scoring (High-Level)

- Score increases when you destroy peaches and when you hit/defeat boss elements.

## Controls

### Desktop (Keyboard)

- **Thrust:** `W` or `ArrowUp`
- **Rotate left:** `A` or `ArrowLeft`
- **Rotate right:** `D` or `ArrowRight`
- **Fire:** `Space`
- **Pause/Resume:** `Escape`
- **Menu navigation:** `Enter` activates the focused button
- **Dev shortcuts:** `F1` toggles the debug overlay (dev builds); `M` toggles mute

### Mobile / Touch

- **Virtual joystick (bottom-left):**
  - Drag **left/right** to rotate.
  - Drag **down** to thrust. If this feels inverted or unintuitive, please call it out in feedback.
- **Fire button (bottom-right):** press/hold to fire.
- **Fallback touch controls (outside the on-screen controls):**
  - Swipe **left/right** to rotate; swipe **down** to thrust; tap to fire.

Audio starts after the first user interaction (browser requirement).

## User Testing Checklist

### First 2 Minutes (Onboarding)

- Start from the title menu → **Play**.
- Confirm you understand the goal: destroy peaches, avoid collisions.
- Confirm you can reliably: rotate, thrust, and fire.

### Gameplay Feel & Readability

- Does the ship feel responsive without being twitchy?
- Is it easy to track your ship and nearby threats during heavy action?
- Are split peaches readable (large/medium/small) while moving?
- Do screen shake / particles / bloom ever obscure threats?

### Systems & UI

- Pause and resume multiple times.
- Open Settings and test:
  - Volume and mute
  - Quality preset changes (low/medium/high)
- Die and confirm:
  - Lives decrement correctly
  - Respawn invulnerability “blink” window feels fair

### Performance (Subjective + Optional Metrics)

- Subjective: note any stutters, slowdowns, overheating, or battery drain.
- Optional (desktop): use Chrome DevTools Performance to capture a 30s trace during a busy wave.

## Feedback Template (Copy/Paste)

- Device:
- OS:
- Browser + version:
- Input method (keyboard / touch):
- Quality setting:
- What you tried:
- What you expected:
- What happened:
- Repro steps (if any):
- Screenshot/video (if possible):
