// Arcade-feel tuning constants for Phase 2 player ship.
// Values are in world units / seconds unless noted.

// Performance Targets (Phase 11):
// Desktop: 60fps sustained, <16.67ms frame time
// Mobile (mid-range): 45-60fps, <22ms frame time
// Max load: 50 peaches + 100 bullets + 200 particles + boss active

/**
 * Forward thrust acceleration.
 * Higher values make the ship feel snappier but can reduce readability.
 */
export const SHIP_THRUST_ACCELERATION = 15;

/**
 * Maximum ship speed.
 * Caps runaway velocity to keep control and screen-wrap readable.
 */
export const SHIP_MAX_SPEED = 12;

/**
 * Per-frame damping factor at 60Hz.
 * Lower values increase friction (faster slowdown); higher values keep drift.
 */
export const SHIP_DAMPING = 0.92;

/**
 * Rotation speed in degrees per second.
 * Faster turning improves responsiveness but can feel twitchy on mobile.
 */
export const SHIP_ROTATION_SPEED = 180;

/**
 * Base ship size used for rendering and collision radius calculations.
 */
export const SHIP_SIZE = 0.6;

/**
 * Invulnerability duration after respawn, in seconds.
 */
export const SHIP_INVULNERABILITY_DURATION = 2.0;

/**
 * Blink visibility toggle interval during invulnerability, in seconds.
 */
export const SHIP_INVULNERABILITY_BLINK_INTERVAL = 0.1;

/**
 * Extra margin beyond camera bounds before wrapping, in world units.
 * Helps avoid visible popping right at the edge.
 */
export const WORLD_WRAP_PADDING = 1.0;

// Phase 3 peach tuning constants.
export const PEACH_LARGE_RADIUS = 1.2;
export const PEACH_MEDIUM_RADIUS = 0.8;
export const PEACH_SMALL_RADIUS = 0.5;

export const PEACH_LARGE_SCALE = 1.0;
export const PEACH_MEDIUM_SCALE = 0.65;
export const PEACH_SMALL_SCALE = 0.4;

export const PEACH_MIN_DRIFT_SPEED = 1.0;
export const PEACH_MAX_DRIFT_SPEED = 3.0;

export const PEACH_MIN_ROTATION_SPEED = 30;
export const PEACH_MAX_ROTATION_SPEED = 90;

export const PEACH_SPAWN_SAFE_ZONE_RADIUS = 3.0;
export const PEACH_POOL_CAPACITY = 50;

// Phase 4: Bullet constants.
export const BULLET_SPEED = 20;
export const BULLET_RADIUS = 0.15;
export const BULLET_TTL_SECONDS = 2.0;
export const BULLET_FIRE_COOLDOWN_SECONDS = 0.15;
export const BULLET_POOL_CAPACITY = 100;

// Phase 4: Collision constants.
export const BULLET_COLLISION_RADIUS = 0.1;

// Phase 4: Peach split constants.
export const PEACH_SPLIT_VELOCITY_MULTIPLIER = 1.2;
export const PEACH_SPLIT_ANGLE_SPREAD_DEGREES = 60;

// Phase 4: Lives system.
export const STARTING_LIVES = 3;

// Phase 5: Chapter system
export const CHAPTER_CARD_DISPLAY_DURATION_SECONDS = 3.0;
export const WAVE_BASE_PEACH_COUNT = 3;
export const WAVE_COUNT_INCREMENT_PER_WAVE = 1;
export const WAVE_BASE_SPAWN_INTERVAL = 2.0;

// Phase 5: Scoring.
export const SCORE_PEACH_LARGE = 20;
export const SCORE_PEACH_MEDIUM = 50;
export const SCORE_PEACH_SMALL = 100;

// Placeholder for Phase 6+ boss bonuses.
export const SCORE_BOSS_DEFEAT_BONUS = 1000;

// Phase 6: Boss tuning.
export const BOSS_HEALTH = 100;
export const BOSS_PHASE_TRANSITION_HEALTH_PERCENT = 0.5;
export const BOSS_SATELLITE_COUNT = 6;
export const BOSS_SATELLITE_HEALTH = 3;
export const BOSS_SATELLITE_ORBIT_RADIUS = 4.0;
export const BOSS_SATELLITE_ORBIT_SPEED = 60; // degrees/sec
export const BOSS_SEED_SPEED = 8.0;
export const BOSS_SEED_TTL_SECONDS = 3.0;
export const BOSS_PHASE_A_SEED_INTERVAL = 2.0;
export const BOSS_PHASE_B_SEED_INTERVAL = 2.0;
export const BOSS_PHASE_B_SEED_BARRAGE_COUNT = 12;
export const BOSS_PHASE_B_CYCLE_SECONDS = 4.0;
export const BOSS_PHASE_B_VULNERABLE_SECONDS = 1.5;
export const BOSS_PHASE_B_GRAVITY_STRENGTH = 5.0;
export const BOSS_PHASE_B_GRAVITY_RADIUS = 8.0;
export const BOSS_COLLISION_RADIUS = 2.0;
export const SCORE_BOSS_HIT = 10;
export const SCORE_SATELLITE_DESTROY = 50;

// Phase 7: Particle effects
export const PARTICLE_POOL_CAPACITY = 500;
export const PARTICLE_PEACH_SPLIT_COUNT = 12;
export const PARTICLE_BULLET_IMPACT_COUNT = 6;
export const PARTICLE_THRUSTER_EMIT_RATE = 30; // particles/sec
export const PARTICLE_JUICE_DROPLET_COUNT = 8;
export const PARTICLE_LIFETIME_SECONDS = 1.0;
export const PARTICLE_SPEED_MIN = 2.0;
export const PARTICLE_SPEED_MAX = 6.0;
export const PARTICLE_SIZE = 0.08;
export const PARTICLE_GRAVITY = -5.0; // world units/s² for juice droplets

// Phase 7: Trails
export const SHIP_TRAIL_LENGTH = 20; // vertex count
export const SHIP_TRAIL_EMIT_INTERVAL = 0.05; // seconds
export const BULLET_TRAIL_LENGTH = 8;
export const BULLET_TRAIL_EMIT_INTERVAL = 1 / 60; // seconds
export const TRAIL_FADE_SPEED = 2.0; // opacity units/sec

// Phase 7: Screen shake
export const SCREEN_SHAKE_PEACH_SPLIT_INTENSITY = 0.15;
export const SCREEN_SHAKE_SHIP_DAMAGE_INTENSITY = 0.4;
export const SCREEN_SHAKE_BOSS_HIT_INTENSITY = 0.25;
export const SCREEN_SHAKE_DECAY_RATE = 8.0; // units/sec

// Phase 7: Hit-pause
export const HIT_PAUSE_DURATION_SECONDS = 0.05;

// Phase 8: Audio SFX (procedural WebAudio).

/**
 * Master volume applied to all sound effects (0.0–1.0).
 */
export const SFX_MASTER_VOLUME = 0.7;

/**
 * Relative gain multiplier for the continuous thrust sound.
 */
export const SFX_THRUST_VOLUME = 0.3;

/**
 * Relative gain multiplier for bullet fire SFX.
 */
export const SFX_BULLET_FIRE_VOLUME = 0.5;

/**
 * Relative gain multiplier for peach split / squelch SFX.
 */
export const SFX_PEACH_SPLIT_VOLUME = 0.6;

/**
 * Relative gain multiplier for ship damage / impact SFX.
 */
export const SFX_SHIP_DAMAGE_VOLUME = 0.8;

/**
 * Relative gain multiplier for boss hit SFX.
 */
export const SFX_BOSS_HIT_VOLUME = 0.7;

/**
 * Thrust bed pitch reference (Hz). This is used to color the thrust rumble.
 */
export const SFX_THRUST_FREQUENCY = 200;

/**
 * Low-pass filter cutoff (Hz) for the thrust rumble.
 * Lower values feel “heavier”; higher values add fizz.
 */
export const SFX_THRUST_FILTER_CUTOFF = 800;

/**
 * Bullet fire beep pitch (Hz).
 */
export const SFX_BULLET_FREQUENCY = 880;

/**
 * Bullet fire beep duration (seconds).
 */
export const SFX_BULLET_DURATION = 0.08;

/**
 * Peach split squelch duration (seconds).
 */
export const SFX_PEACH_SPLIT_DURATION = 0.15;

/**
 * Band-pass filter center frequency (Hz) for peach split resonance.
 */
export const SFX_PEACH_SPLIT_FILTER_FREQUENCY = 600;

/**
 * Ship damage buzz pitch (Hz).
 */
export const SFX_SHIP_DAMAGE_FREQUENCY = 120;

/**
 * Ship damage buzz duration (seconds).
 */
export const SFX_SHIP_DAMAGE_DURATION = 0.25;

/**
 * Boss hit base thud pitch (Hz).
 */
export const SFX_BOSS_HIT_BASE_FREQUENCY = 80;

/**
 * Boss hit thud duration (seconds).
 */
export const SFX_BOSS_HIT_DURATION = 0.3;

// Phase 10: Post-processing effects
// Bloom strength is tuned to stay readable in particle- and bullet-heavy scenes.
export const BLOOM_STRENGTH_MEDIUM = 0.4;    // Bloom intensity (0.0-3.0)
export const BLOOM_STRENGTH_HIGH = 0.8;      // Bloom intensity (0.0-3.0)
export const BLOOM_RADIUS = 0.4;             // Bloom blur radius
export const BLOOM_THRESHOLD = 0.3;          // Luminance threshold for bloom
export const VIGNETTE_OFFSET = 0.5;          // Vignette darkness start (0.0-1.0)
export const VIGNETTE_DARKNESS = 0.6;        // Vignette darkness intensity (0.0-2.0)
export const CHROMATIC_ABERRATION_OFFSET = 0.0015; // RGB offset (very subtle)
