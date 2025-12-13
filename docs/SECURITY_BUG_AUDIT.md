# Peach Blaster — Bug & Security Review

Date: 2025-12-13

Scope: quick static review of client-side game code + build/export scripts.

## Summary

* **Security:** no obvious high-risk remote attack surface (no network I/O, no dynamic code execution). Primary risks are **DOM XSS footguns** (a few `innerHTML` writes) and **developer-machine safety** in the single-file export script.
* **Stability/gameplay:** a couple of medium-severity logic hazards that can affect gameplay correctness (notably **bullet multi-hit double-processing** and **wave spawning accounting when pools are exhausted**).

## Findings

### 1) Medium — Bullet can be processed against multiple peaches in the same frame

**Where**

* Collision generation: [`CollisionSystem.checkBulletPeachCollisions()`](../src/systems/CollisionSystem.ts:49)
* Collision handling loop: [`initializeApp()` PLAYING update](../src/main.ts:422)

**Why it matters**

[`CollisionSystem.checkBulletPeachCollisions()`](../src/systems/CollisionSystem.ts:49) returns **all** bullet–peach overlaps. In the handler loop in [`initializeApp()`](../src/main.ts:422), the same bullet can be:

* despawned multiple times (mostly benign because [`ObjectPool.release()`](../src/systems/ObjectPool.ts:40) is idempotent-ish), but also
* generate particles/screen shake multiple times, and
* award score / peach splits multiple times.

This can happen if peaches overlap (common after splits), leading to inflated score and excessive effects.

**Evidence**

* Nested O(N·M) collision enumeration: [`CollisionSystem.checkBulletPeachCollisions()`](../src/systems/CollisionSystem.ts:49)
* Single bullet despawn inside a loop that may still keep seeing that bullet in later collision pairs: [`initializeApp()`](../src/main.ts:428)

**Recommendation**

De-duplicate collisions per bullet before applying effects. Options:

* In the handler: keep a `Set` of bullets processed this frame and skip additional pairs.
* Or change [`CollisionSystem.checkBulletPeachCollisions()`](../src/systems/CollisionSystem.ts:49) to return at most one collision per bullet (e.g., first hit, nearest hit).

### 2) Medium — Wave spawn accounting can under-spawn enemies when pools are exhausted

**Where**

* Spawn loop decrements counters regardless of whether a peach actually spawned: [`SpawnSystem.update()`](../src/systems/SpawnSystem.ts:58)
* Actual spawn can fail and return `null`: [`PeachManager.spawn()`](../src/entities/PeachManager.ts:55)

**Why it matters**

[`SpawnSystem.update()`](../src/systems/SpawnSystem.ts:58) decrements `remainingToSpawn` and increments `spawnedCount` every time it *attempts* to spawn.

If [`PeachManager.spawn()`](../src/entities/PeachManager.ts:55) returns `null` (pool exhausted), the wave will still progress toward completion and may end with fewer peaches than configured.

**Recommendation**

Only decrement `remainingToSpawn` when a spawn succeeds, or add retry/backoff logic when the pool is full.

### 3) Medium — Uncaught `localStorage.getItem()` can crash initialization in restricted environments

**Where**

* Direct `localStorage.getItem` without `try/catch`: [`initializeApp()`](../src/main.ts:114)

**Why it matters**

Some environments (privacy modes, embedded webviews, restricted iframes) can throw when accessing `localStorage`. Other parts of the code already treat this as expected and guard it (e.g., [`MenuScreen.saveSettings()`](../src/ui/MenuScreen.ts:168)).

If it throws at startup, the `initializeApp()` try/catch will log and abort the game.

**Recommendation**

Wrap the read in `try/catch` (mirroring [`MenuScreen.readStoredString()`](../src/ui/MenuScreen.ts:432)), and default to `"medium"`.

### 4) Low — `innerHTML` usage is mostly safe today, but is a DOM-XSS footgun

**Where**

* Dev overlay renders via `innerHTML`: [`DebugOverlay.update()`](../src/ui/DebugOverlay.ts:42)
* Multiple UI screens clear containers with `innerHTML = ""` (safe but sets a pattern):
  * [`LivesDisplay.update()`](../src/ui/LivesDisplay.ts:20)
  * [`RewardScreen.show()`](../src/ui/RewardScreen.ts:78)
  * [`GameOverScreen.show()`](../src/ui/GameOverScreen.ts:69)
  * [`VictoryScreen.show()`](../src/ui/VictoryScreen.ts:74)

**Why it matters**

Right now, the interpolated values are numeric or internal enum-like strings (e.g., game state), so this is not an exploitable XSS vector.

However, [`DebugOverlay.update()`](../src/ui/DebugOverlay.ts:42) directly interpolates `stateLabel` into HTML with `<br/>`. If that value ever becomes user-controlled (URL param, server-driven state label, modding hooks), this becomes a straightforward injection point.

**Recommendation**

Prefer DOM node construction with `textContent` + `appendChild(document.createElement("br"))`, or at least escape interpolated strings.

### 5) Low — Potential path traversal in single-file export script (developer-machine risk)

**Where**

* Path resolution joins arbitrary HTML/CSS URLs into a filesystem path:
  * [`resolveHtmlAssetPath()`](../scripts/export-single.js:27)
  * [`inlineRemainingHtmlAssets()`](../scripts/export-single.js:236)

**Why it matters**

The export script assumes the built `dist/index.html` only references legitimate `dist/` assets.

If the HTML is compromised (malicious dependency/build plugin, tampered build output), a URL like `../../../../etc/passwd` could cause the script to read and inline arbitrary local files during export.

**Recommendation**

Harden resolution by normalizing and enforcing a prefix check:

* `const resolved = path.resolve(distDir, cleaned)`
* `if (!resolved.startsWith(distDir + path.sep)) return null`

### 6) Info — Consider a strict Content Security Policy (CSP) for production builds

**Where**

* Base document has no CSP: [`index.html`](../index.html:1)

**Why it matters**

This is a single-page, self-contained game; it can often run with a very strict CSP (no remote scripts/styles). A CSP provides defense-in-depth if future features introduce untrusted strings or third-party content.

**Recommendation**

Add a CSP (prefer response header in production; meta tag is acceptable for static hosting). Ensure it remains compatible with Vite dev and the single-file export.

## Notes / Non-findings

* No use of `eval`, `new Function`, `document.write`, or network APIs was found in `src/`.
* Local storage writes are generally guarded with `try/catch` (e.g., [`MenuScreen.saveSettings()`](../src/ui/MenuScreen.ts:168)).
* Object pooling appears mostly safe; one future-footgun: if entities start calling `deactivate()` directly (e.g., [`Peach.deactivate()`](../src/entities/Peach.ts:76)), managers may need to mirror [`BulletManager.update()`](../src/entities/BulletManager.ts:73) behavior (hide + release inactive objects) to avoid “ghost” instances.

