import * as THREE from "three";
import PhysicsSystem from "../../systems/PhysicsSystem";
import {
  BOSS_COLLISION_RADIUS,
  BOSS_HEALTH,
  BOSS_PHASE_A_SEED_INTERVAL,
  BOSS_PHASE_B_CYCLE_SECONDS,
  BOSS_PHASE_B_SEED_BARRAGE_COUNT,
  BOSS_PHASE_B_SEED_INTERVAL,
  BOSS_PHASE_B_VULNERABLE_SECONDS
} from "../../config/tuning";

export enum BossPhase {
  PHASE_A = "PHASE_A",
  PHASE_B = "PHASE_B",
  DEFEATED = "DEFEATED"
}

export default class MegaPeach {
  public position: THREE.Vector2 = new THREE.Vector2();
  public health = BOSS_HEALTH;
  public maxHealth = BOSS_HEALTH;
  public phase: BossPhase = BossPhase.PHASE_A;
  public phaseTimer = 0;
  public attackTimer = 0;
  private pendingSeedShots = 0;
  private vulnerable = true;

  public reset(position: THREE.Vector2): void {
    this.position.copy(position);
    this.maxHealth = BOSS_HEALTH;
    this.health = this.maxHealth;
    this.phase = BossPhase.PHASE_A;
    this.phaseTimer = 0;
    this.attackTimer = BOSS_PHASE_A_SEED_INTERVAL;
    this.pendingSeedShots = 0;
    this.vulnerable = true;
  }

  public update(dt: number, camera: THREE.OrthographicCamera): void {
    if (this.phase === BossPhase.DEFEATED) {
      return;
    }

    this.phaseTimer += dt;
    this.attackTimer -= dt;

    if (this.phase === BossPhase.PHASE_A) {
      this.vulnerable = true;
      if (this.attackTimer <= 0) {
        this.pendingSeedShots += 1;
        this.attackTimer += BOSS_PHASE_A_SEED_INTERVAL;
      }
    } else if (this.phase === BossPhase.PHASE_B) {
      const cycleProgress =
        this.phaseTimer % BOSS_PHASE_B_CYCLE_SECONDS;
      this.vulnerable =
        cycleProgress <= BOSS_PHASE_B_VULNERABLE_SECONDS;

      if (this.attackTimer <= 0) {
        this.pendingSeedShots += BOSS_PHASE_B_SEED_BARRAGE_COUNT;
        this.attackTimer += BOSS_PHASE_B_SEED_INTERVAL;
      }
    }

    PhysicsSystem.wrapPosition(this.position, camera);
  }

  public takeDamage(amount: number): void {
    if (this.phase === BossPhase.DEFEATED || !this.vulnerable) {
      return;
    }

    this.health = Math.max(0, this.health - amount);
    if (this.health <= 0) {
      this.phase = BossPhase.DEFEATED;
      this.vulnerable = false;
    }
  }

  public transitionPhase(): void {
    if (this.phase !== BossPhase.PHASE_A) {
      return;
    }

    this.phase = BossPhase.PHASE_B;
    this.phaseTimer = 0;
    this.attackTimer = BOSS_PHASE_B_SEED_INTERVAL;
    this.pendingSeedShots = 0;
    this.vulnerable = false;
  }

  public isVulnerable(): boolean {
    return this.vulnerable;
  }

  public popPendingSeedShots(): number {
    const shots = this.pendingSeedShots;
    this.pendingSeedShots = 0;
    return shots;
  }

  public getCollisionRadius(): number {
    return BOSS_COLLISION_RADIUS;
  }
}
