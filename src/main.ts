import "./style.css";

import * as THREE from "three";

import GameLoop from "./core/GameLoop";
import { createPauseController } from "./core/PauseController";
import time from "./core/Time";
import StateMachine, { GameState } from "./core/StateMachine";
import SceneManager from "./rendering/SceneManager";
import ParticleSystem from "./rendering/ParticleSystem";
import TrailRenderer from "./rendering/TrailRenderer";
import Ship from "./entities/Ship";
import PeachManager from "./entities/PeachManager";
import BulletManager from "./entities/BulletManager";
import SpawnSystem from "./systems/SpawnSystem";
import CollisionSystem from "./systems/CollisionSystem";
import inputManager from "./input/InputManager";
import HUD from "./ui/HUD";
import MobileControls from "./ui/MobileControls";
import MenuScreen from "./ui/MenuScreen";
import GameOverScreen from "./ui/GameOverScreen";
import VictoryScreen from "./ui/VictoryScreen";
import LivesManager from "./core/LivesManager";
import ChapterManager from "./core/ChapterManager";
import BossProgression from "./core/BossProgression";
import ChapterCard from "./ui/ChapterCard";
import RewardScreen from "./ui/RewardScreen";
import ScoreManager from "./core/ScoreManager";
import { chapters } from "./config/chapters";
import MegaPeachManager from "./entities/bosses/MegaPeachManager";
import SFXManager from "./audio/SFXManager";
import { BossPhase } from "./entities/bosses/MegaPeach";
import {
  BULLET_TRAIL_EMIT_INTERVAL,
  BULLET_TRAIL_LENGTH,
  HIT_PAUSE_DURATION_SECONDS,
  PARTICLE_BULLET_IMPACT_COUNT,
  PARTICLE_JUICE_DROPLET_COUNT,
  PARTICLE_LIFETIME_SECONDS,
  PARTICLE_PEACH_SPLIT_COUNT,
  PARTICLE_POOL_CAPACITY,
  PARTICLE_SPEED_MAX,
  PARTICLE_SPEED_MIN,
  SCREEN_SHAKE_BOSS_HIT_INTENSITY,
  SCREEN_SHAKE_PEACH_SPLIT_INTENSITY,
  SCREEN_SHAKE_SHIP_DAMAGE_INTENSITY,
  SCORE_BOSS_DEFEAT_BONUS,
  SCORE_BOSS_HIT,
  SCORE_SATELLITE_DESTROY,
  SHIP_TRAIL_EMIT_INTERVAL,
  SHIP_TRAIL_LENGTH
} from "./config/tuning";

async function initializeApp(): Promise<void> {
  try {
    const sceneManager = new SceneManager();
    const camera = sceneManager.getCamera();

    const particleSystem = new ParticleSystem(
      sceneManager,
      PARTICLE_POOL_CAPACITY
    );
    const shipTrail = new TrailRenderer(
      sceneManager,
      SHIP_TRAIL_LENGTH,
      new THREE.Color(0x00ff88),
      SHIP_TRAIL_EMIT_INTERVAL
    );
    const bulletTrail = new TrailRenderer(
      sceneManager,
      BULLET_TRAIL_LENGTH,
      new THREE.Color(0x00eaff),
      BULLET_TRAIL_EMIT_INTERVAL
    );

    const peachManager = new PeachManager(sceneManager);
    const bulletManager = new BulletManager(sceneManager);
    const ship = new Ship(sceneManager, bulletManager);
    const spawnSystem = new SpawnSystem(peachManager, camera);
    const livesManager = new LivesManager();
    const scoreManager = new ScoreManager();
    const chapterManager = new ChapterManager();
    const bossProgression = new BossProgression();
    const chapterCard = new ChapterCard();
    const rewardScreen = new RewardScreen();
    const mobileControls = new MobileControls();
    const hud = new HUD(mobileControls);

    let megaPeachManager: MegaPeachManager | null = null;
    let bossDefeatSequenceRunning = false;

    rewardScreen.setLivesManager(livesManager);

    const stateMachine = new StateMachine(GameState.LOADING);
    stateMachine.extendAllowedTransitions({
      [GameState.GAME_OVER]: [GameState.PLAYING]
    });

    const menuScreen = new MenuScreen({
      onPlay: () => {
        stateMachine.transitionTo(GameState.PLAYING);
      },
      onResume: () => {
        stateMachine.transitionTo(GameState.PLAYING);
      },
      onQuitToMenu: () => {
        stateMachine.transitionTo(GameState.MENU);
      },
      onQualityChange: quality => {
        sceneManager.setQuality(quality);
      }
    });

    const storedQuality =
      localStorage.getItem("peachblaster_quality") ?? "medium";
    const validatedQuality =
      storedQuality === "low" ||
      storedQuality === "medium" ||
      storedQuality === "high"
        ? storedQuality
        : "medium";
    sceneManager.setQuality(validatedQuality);

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion && validatedQuality !== "low") {
      sceneManager.setQuality("low");
      try {
        localStorage.setItem("peachblaster_quality", "low");
      } catch {
        // no-op (localStorage may be unavailable)
      }
      menuScreen.refreshQualitySelection();
      if (import.meta.env.DEV) {
        console.log("Reduced motion detected: forcing low quality");
      }
    }

    const gameOverScreen = new GameOverScreen({
      onRetry: () => {
        time.reset();
        livesManager.reset();
        chapterManager.startChapter(0);
        bossProgression.startChapter(chapterManager);
        scoreManager.resetRun();

        bossDefeatSequenceRunning = false;
        megaPeachManager?.despawn();
        hud.hideBossUI();

        stateMachine.transitionTo(GameState.PLAYING);
      },
      onMainMenu: () => {
        stateMachine.transitionTo(GameState.MENU);
      }
    });

    const victoryScreen = new VictoryScreen({
      onPlayAgain: () => {
        stateMachine.transitionTo(GameState.MENU);
        stateMachine.transitionTo(GameState.PLAYING);
      },
      onMainMenu: () => {
        stateMachine.transitionTo(GameState.MENU);
      }
    });

    hud.hideGameplayHUD();
    inputManager.setMobileControls(mobileControls);
    menuScreen.loadSettings();

    const gameLoop = new GameLoop();
    const pauseController = createPauseController(gameLoop, time);

    ship.setParticleSystem(particleSystem);

    livesManager.subscribe("livesChanged", lives => {
      hud.updateLives(lives);
    });
    hud.updateLives(livesManager.getLives());

    livesManager.subscribe("gameOver", () => {
      stateMachine.transitionTo(GameState.GAME_OVER);
    });

    scoreManager.subscribe("scoreChanged", score => {
      hud.updateScore(score);
    });
    hud.updateScore(scoreManager.getScore());

    stateMachine.register(GameState.LOADING, {
      enter: () => {
        if (import.meta.env.DEV) {
          console.log("State entered: LOADING");
        }
        stateMachine.transitionTo(GameState.MENU);
      }
    });

    stateMachine.register(GameState.MENU, {
      enter: () => {
        if (import.meta.env.DEV) {
          console.log("State entered: MENU");
        }
        bulletManager.reset();
        bulletTrail.clear();
        shipTrail.clear();
        spawnSystem.stopWave();
        chapterManager.startChapter(0);
        bossProgression.startChapter(chapterManager);
        scoreManager.resetRun();
        bossDefeatSequenceRunning = false;
        megaPeachManager?.despawn();
        hud.hideGameplayHUD();
        menuScreen.showTitle();
        sceneManager.resetBackground();
        ship.resetState();
        ship.mesh.visible = false;
      },
      exit: () => {
        menuScreen.hide();
      }
    });

    stateMachine.register(GameState.PLAYING, {
      enter: previousState => {
        if (previousState === GameState.PAUSED) {
          return;
        }

        const startingNewRun =
          previousState === GameState.MENU ||
          previousState === GameState.GAME_OVER;

        if (startingNewRun) {
          time.reset();
          livesManager.reset();
          chapterManager.startChapter(0);
          bossProgression.startChapter(chapterManager);
          scoreManager.resetRun();
          sceneManager.setBackgroundTint(
            chapterManager.getCurrentChapter().backgroundTint
          );
        }

        bossDefeatSequenceRunning = false;
        megaPeachManager?.despawn();
        hud.hideBossUI();

        ship.position.set(0, 0);
        ship.velocity.set(0, 0);
        ship.rotation = Math.PI / 2;
        ship.mesh.visible = true;
        ship.activateInvulnerability();

        const waveConfig = chapterManager.startNextWave();
        spawnSystem.startWave(waveConfig);
        hud.updateWave(
          chapterManager.getCurrentWave(),
          chapterManager.getTotalWaves()
        );
        hud.showGameplayHUD();
      },
      exit: nextState => {
        if (nextState === GameState.PAUSED) {
          return;
        }
        hud.hideGameplayHUD();
      },
      update: fixedDeltaSeconds => {
        inputManager.update();
        ship.update(fixedDeltaSeconds, inputManager, camera);
        shipTrail.addPoint(ship.position, fixedDeltaSeconds);
        shipTrail.update(fixedDeltaSeconds);
        peachManager.update(fixedDeltaSeconds, camera);
        spawnSystem.update(fixedDeltaSeconds, ship.position);

        bulletManager.update(fixedDeltaSeconds, camera);
        const activeBullets = bulletManager.getActiveBullets();
        let mostRecentBullet: (typeof activeBullets)[number] | null = null;
        let highestTtl = Number.NEGATIVE_INFINITY;
        for (const bullet of activeBullets) {
          if (bullet.ttl > highestTtl) {
            highestTtl = bullet.ttl;
            mostRecentBullet = bullet;
          }
        }

        if (mostRecentBullet) {
          bulletTrail.addPoint(mostRecentBullet.position, fixedDeltaSeconds);
        }

        const boss = megaPeachManager?.getBoss();
        const bossActive = !!boss && megaPeachManager?.isActive();

        if (bossActive && boss) {
          megaPeachManager!.update(fixedDeltaSeconds, camera, ship);

          const bulletSatelliteCollisions =
            CollisionSystem.checkBulletSatelliteCollisions(
              activeBullets,
              megaPeachManager!.getSatellites()
            );

          for (const { bullet, satellite } of bulletSatelliteCollisions) {
            satellite.takeDamage(1);
            SFXManager.getInstance().playPeachSplit();
            bulletManager.despawn(bullet);
            scoreManager.addScore(SCORE_SATELLITE_DESTROY);

            if (!satellite.active) {
              megaPeachManager!.getSatelliteManager().despawn(satellite);
            }
          }

          const bulletBossCollisions =
            CollisionSystem.checkBulletBossCollisions(
              activeBullets,
              boss
            );

          for (const bullet of bulletBossCollisions) {
            boss.takeDamage(1);
            SFXManager.getInstance().playBossHit();
            particleSystem.emitBurst(
              bullet.position,
              PARTICLE_BULLET_IMPACT_COUNT,
              PARTICLE_SPEED_MIN,
              PARTICLE_SPEED_MAX,
              new THREE.Color(0xffaa00),
              PARTICLE_LIFETIME_SECONDS
            );
            sceneManager.addScreenShake(
              SCREEN_SHAKE_BOSS_HIT_INTENSITY
            );
            bulletManager.despawn(bullet);
            scoreManager.addScore(SCORE_BOSS_HIT);
            hud.updateBossHealth(boss.health, boss.maxHealth);
          }

          const shipSeedCollisions =
            CollisionSystem.checkShipSeedCollisions(
              ship,
              megaPeachManager!.getSeeds()
            );

	          if (shipSeedCollisions.length > 0) {
	            for (const seed of shipSeedCollisions) {
	              megaPeachManager!.getSeedManager().despawn(seed);
	            }
	            SFXManager.getInstance().playShipDamage();
	            livesManager.loseLife();
	            ship.resetState();
	            ship.activateInvulnerability();
	          }

	          if (CollisionSystem.checkShipBossCollisions(ship, boss)) {
	            livesManager.loseLife();
	            SFXManager.getInstance().playShipDamage();
	            ship.resetState();
	            ship.activateInvulnerability();
	          }

          if (
            boss.phase === BossPhase.DEFEATED &&
            !bossDefeatSequenceRunning
          ) {
            bossDefeatSequenceRunning = true;
            scoreManager.addScore(SCORE_BOSS_DEFEAT_BONUS);
            megaPeachManager!.getSeedManager().reset();

            void (async () => {
              try {
                const startTime = time.getElapsedTime();
                const durationSeconds = 1.0;
                const initialScale = megaPeachManager!.mesh.scale.x;

                await new Promise<void>(resolve => {
                  const tick = () => {
                    const elapsed = time.getElapsedTime() - startTime;
                    const t = Math.min(1, elapsed / durationSeconds);
                    const scale = THREE.MathUtils.lerp(
                      initialScale,
                      0,
                      t
                    );
                    megaPeachManager!.mesh.scale.setScalar(scale);

                    if (t >= 1) {
                      resolve();
                      return;
                    }
                    requestAnimationFrame(tick);
                  };
                  requestAnimationFrame(tick);
                });

                megaPeachManager!.despawn();
                hud.hideBossUI();

                const atFinalChapter = chapterManager.isLastChapter();
                bossProgression.onBossDefeated(chapterManager);

                if (atFinalChapter) {
                  stateMachine.transitionTo(GameState.VICTORY);
                } else {
                  stateMachine.transitionTo(
                    GameState.CHAPTER_TRANSITION
                  );
                }
              } catch (error) {
                console.error("Boss defeat failed:", error);
                stateMachine.transitionTo(GameState.GAME_OVER);
              }
            })();
          }

          return;
        }

        const bulletPeachCollisions =
          CollisionSystem.checkBulletPeachCollisions(
            activeBullets,
            peachManager.getActivePeaches()
          );

        for (const { bullet, peach } of bulletPeachCollisions) {
          particleSystem.emitBurst(
            bullet.position,
            PARTICLE_BULLET_IMPACT_COUNT,
            PARTICLE_SPEED_MIN * 0.5,
            PARTICLE_SPEED_MAX * 0.5,
            new THREE.Color(0x00eaff),
            PARTICLE_LIFETIME_SECONDS * 0.5
          );
          bulletManager.despawn(bullet);
          SFXManager.getInstance().playPeachSplit();
          scoreManager.addPeachDestroyed(peach.size);
          peachManager.despawn(peach);
          particleSystem.emitBurst(
            peach.position,
            PARTICLE_PEACH_SPLIT_COUNT,
            PARTICLE_SPEED_MIN,
            PARTICLE_SPEED_MAX,
            new THREE.Color(0xffaa66),
            PARTICLE_LIFETIME_SECONDS
          );
          particleSystem.emitJuiceDroplets(
            peach.position,
            PARTICLE_JUICE_DROPLET_COUNT,
            new THREE.Color(0xffcc88)
          );
          sceneManager.addScreenShake(
            SCREEN_SHAKE_PEACH_SPLIT_INTENSITY
          );
          time.triggerHitPause(HIT_PAUSE_DURATION_SECONDS);
          CollisionSystem.splitPeach(peach, peachManager);
        }

        const shipPeachCollisions =
          CollisionSystem.checkShipPeachCollisions(
            ship,
            peachManager.getActivePeaches()
          );

        if (shipPeachCollisions.length > 0) {
          livesManager.loseLife();
          SFXManager.getInstance().playShipDamage();
          particleSystem.emitBurst(
            ship.position,
            PARTICLE_PEACH_SPLIT_COUNT * 1.5,
            PARTICLE_SPEED_MIN,
            PARTICLE_SPEED_MAX * 1.2,
            new THREE.Color(0xff4444),
            PARTICLE_LIFETIME_SECONDS
          );
          sceneManager.addScreenShake(
            SCREEN_SHAKE_SHIP_DAMAGE_INTENSITY
          );
          for (const peach of shipPeachCollisions) {
            peachManager.despawn(peach);
          }
          ship.resetState();
          ship.activateInvulnerability();
        }

        if (spawnSystem.isWaveComplete()) {
          chapterManager.completeWave();

          if (bossProgression.shouldSpawnBoss(chapterManager)) {
            if (!megaPeachManager) {
              megaPeachManager = new MegaPeachManager(sceneManager);
            }

            const bossSpawnPosition = new THREE.Vector2(0, 0);
            megaPeachManager.spawn(bossSpawnPosition);

            const spawnedBoss = megaPeachManager.getBoss();
            if (spawnedBoss) {
              hud.updateBossHealth(
                spawnedBoss.health,
                spawnedBoss.maxHealth
              );
            }

            hud.showBossUI();
            return;
          }

          if (chapterManager.isChapterComplete()) {
            stateMachine.transitionTo(GameState.CHAPTER_TRANSITION);
            return;
          }

          const waveConfig = chapterManager.startNextWave();
          spawnSystem.startWave(waveConfig);
          hud.updateWave(
            chapterManager.getCurrentWave(),
            chapterManager.getTotalWaves()
          );
        }
      }
    });

    stateMachine.register(GameState.GAME_OVER, {
      enter: () => {
        ship.mesh.visible = false;
        spawnSystem.stopWave();
        bulletManager.reset();
        bulletTrail.clear();
        for (const peach of Array.from(peachManager.getActivePeaches())) {
          peachManager.despawn(peach);
        }
        megaPeachManager?.despawn();
        shipTrail.clear();
        hud.hideGameplayHUD();
        sceneManager.resetBackground();

        gameOverScreen.show({
          score: scoreManager.getScore(),
          peachesDestroyed: scoreManager.getPeachesDestroyedTotal(),
          wavesCleared: chapterManager.getCurrentWave()
        });
      },
      exit: () => {
        gameOverScreen.hide();
      }
    });

    stateMachine.register(GameState.CHAPTER_TRANSITION, {
      enter: () => {
        hud.hideGameplayHUD();

        void (async () => {
          try {
            const currentChapter = chapterManager.getCurrentChapter();
            const chapterJustCompleted = chapterManager.isChapterComplete();
            const currentChapterArrayIndex =
              chapters.indexOf(currentChapter);

            if (
              chapterJustCompleted &&
              chapterManager.isLastChapter()
            ) {
              stateMachine.transitionTo(GameState.VICTORY);
              return;
            } else {
              if (
                !chapterJustCompleted &&
                chapterManager.isLastChapter() &&
                import.meta.env.DEV
              ) {
                console.warn(
                  "Chapter transition entered at terminal chapter without completion."
                );
              }

              const nextChapter =
                currentChapterArrayIndex >= 0 &&
                currentChapterArrayIndex < chapters.length - 1
                  ? chapters[currentChapterArrayIndex + 1]
                  : null;

              if (nextChapter) {
                await chapterCard.show(nextChapter);
                sceneManager.setBackgroundTint(nextChapter.backgroundTint);
              }

              if (chapterJustCompleted) {
                const reward = rewardScreen.applyChapterReward();
                await rewardScreen.show(
                  {
                    wavesCleared: chapterManager.getTotalWaves(),
                    peachesDestroyed: scoreManager.getPeachesDestroyedThisChapter()
                  },
                  reward
                );
              }

              const advanced =
                chapterManager.advanceToNextChapter();
              if (advanced) {
                bossProgression.startChapter(chapterManager);
              }
              scoreManager.resetChapter();
              stateMachine.transitionTo(GameState.PLAYING);
            }
          } catch (error) {
            console.error("Chapter transition failed:", error);
            stateMachine.transitionTo(GameState.GAME_OVER);
          }
        })();
      },
      exit: () => {
        chapterCard.hide();
        rewardScreen.hide();
      }
    });

    stateMachine.register(GameState.PAUSED, {
      enter: () => {
        if (import.meta.env.DEV) {
          console.log("State entered: PAUSED");
        }
        SFXManager.getInstance().stopThrust();
        pauseController.pause();
        menuScreen.showPause();
      },
      exit: () => {
        pauseController.resume();
        menuScreen.hide();
      }
    });

    stateMachine.register(GameState.VICTORY, {
      enter: () => {
        ship.mesh.visible = false;
        spawnSystem.stopWave();
        bulletManager.reset();
        bulletTrail.clear();
        for (const peach of Array.from(peachManager.getActivePeaches())) {
          peachManager.despawn(peach);
        }
        megaPeachManager?.despawn();
        shipTrail.clear();
        hud.hideGameplayHUD();
        sceneManager.resetBackground();

        victoryScreen.show({
          score: scoreManager.getScore(),
          peachesDestroyed: scoreManager.getPeachesDestroyedTotal(),
          timeSeconds: time.getElapsedTime()
        });
      },
      exit: () => {
        victoryScreen.hide();
      }
    });

    stateMachine.onChange(newState => {
      if (
        newState === GameState.MENU ||
        newState === GameState.CHAPTER_TRANSITION ||
        newState === GameState.GAME_OVER ||
        newState === GameState.VICTORY
      ) {
        SFXManager.getInstance().stopThrust();
      }
    });

    if (import.meta.env.DEV) {
      stateMachine.onChange((newState, previousState) => {
        console.log(`State transition: ${previousState ?? "none"} -> ${newState}`);
      });
    }

    let debugOverlay:
      | import("./ui/DebugOverlay").default
      | null = null;

    if (import.meta.env.DEV) {
      const debugModule = await import("./ui/DebugOverlay");
      debugOverlay = new debugModule.default();
      debugOverlay.attachToggleShortcut();
    }

    gameLoop.onUpdate(fixedDeltaSeconds => {
      time.update(fixedDeltaSeconds);
      const dt = time.getDeltaTime();
      particleSystem.update(dt, camera);
      sceneManager.updateScreenShake(dt);
      stateMachine.update(dt);
      bulletTrail.update(dt);
    });

    gameLoop.onRender(() => {
      const renderStartMs = performance.now();
      sceneManager.render();
      const renderEndMs = performance.now();

      if (debugOverlay) {
        debugOverlay.update({
          stateLabel: stateMachine.getCurrentState(),
          elapsedSeconds: time.getElapsedTime(),
          frameMs: renderEndMs - renderStartMs
        });
      }
    });

    window.addEventListener("keydown", e => {
      if (e.repeat) {
        return;
      }

      if (e.key === "Escape") {
        const currentState = stateMachine.getCurrentState();
        if (
          currentState === GameState.PLAYING &&
          !bossDefeatSequenceRunning
        ) {
          stateMachine.transitionTo(GameState.PAUSED);
          e.preventDefault();
          return;
        }
        if (currentState === GameState.PAUSED) {
          stateMachine.transitionTo(GameState.PLAYING);
          e.preventDefault();
          return;
        }
      }

      if (e.key === "Enter") {
        const currentState = stateMachine.getCurrentState();
        if (
          currentState === GameState.MENU ||
          currentState === GameState.PAUSED ||
          currentState === GameState.GAME_OVER ||
          currentState === GameState.VICTORY
        ) {
          const activeElement = document.activeElement;
          if (activeElement instanceof HTMLButtonElement) {
            activeElement.click();
            e.preventDefault();
            return;
          }
        }
      }

      if (e.key === "m") {
        const sfxManager = SFXManager.getInstance();
        const muted = !sfxManager.isMuted();
        sfxManager.setMuted(muted);
        try {
          localStorage.setItem(
            "peachblaster_muted",
            muted ? "true" : "false"
          );
        } catch {
          // no-op
        }
      }
    });

    window.addEventListener("resize", () => {
      sceneManager.resize(window.innerWidth, window.innerHeight);
    });

    window.addEventListener("beforeunload", () => {
      inputManager.dispose();
      ship.dispose();
      peachManager.dispose();
      bulletManager.dispose();
      particleSystem.dispose();
      shipTrail.dispose();
      bulletTrail.dispose();
      hud.dispose();
      document.getElementById("mobile-controls")?.remove();
      menuScreen.dispose();
      gameOverScreen.dispose();
      victoryScreen.dispose();
      chapterCard.dispose();
      rewardScreen.dispose();
      megaPeachManager?.dispose();
    });

    stateMachine.transitionTo(GameState.MENU);

    gameLoop.start();
  } catch (error) {
    console.error("Failed to initialize Peach Blaster foundation:", error);
  }
}

void initializeApp();
