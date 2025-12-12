import * as THREE from "three";
import SceneManager from "../../rendering/SceneManager";
import Ship from "../Ship";
import MegaPeach, { BossPhase } from "./MegaPeach";
import PitSatelliteManager from "./PitSatelliteManager";
import SeedManager from "./SeedManager";
import {
  BOSS_PHASE_B_GRAVITY_RADIUS,
  BOSS_PHASE_B_GRAVITY_STRENGTH,
  BOSS_PHASE_TRANSITION_HEALTH_PERCENT,
  BOSS_SATELLITE_ORBIT_RADIUS,
  BOSS_SEED_SPEED
} from "../../config/tuning";

export default class MegaPeachManager {
  private boss = new MegaPeach();
  private satelliteManager: PitSatelliteManager;
  private seedManager: SeedManager;
  private scene: THREE.Scene;
  private geometry: THREE.SphereGeometry;
  private material: THREE.MeshStandardMaterial;
  public mesh: THREE.Mesh;
  private active = false;

  private readonly tempDirection = new THREE.Vector2();
  private readonly tempVelocity = new THREE.Vector2();

  constructor(sceneManager: SceneManager) {
    this.scene = sceneManager.getScene();

    this.satelliteManager = new PitSatelliteManager(sceneManager);
    this.seedManager = new SeedManager(sceneManager);

    this.geometry = new THREE.SphereGeometry(1, 24, 24);
    this.material = new THREE.MeshStandardMaterial({
      color: 0xff6699,
      emissive: 0xff2255,
      emissiveIntensity: 0.5,
      roughness: 0.4,
      metalness: 0.05
    });
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.visible = false;
    this.mesh.scale.setScalar(2.0);
    this.scene.add(this.mesh);
  }

  public spawn(position: THREE.Vector2): void {
    this.boss.reset(position);
    this.active = true;
    this.mesh.visible = true;
    this.mesh.scale.setScalar(2.0);
    this.mesh.position.set(position.x, position.y, 0);

    this.satelliteManager.spawnRing(
      this.boss.position,
      BOSS_SATELLITE_ORBIT_RADIUS
    );
  }

  public update(
    dt: number,
    camera: THREE.OrthographicCamera,
    ship: Ship
  ): void {
    if (!this.active) {
      return;
    }

    this.boss.update(dt, camera);
    this.mesh.position.set(
      this.boss.position.x,
      this.boss.position.y,
      0
    );

    if (
      this.boss.phase === BossPhase.PHASE_A &&
      this.boss.health <= this.boss.maxHealth * BOSS_PHASE_TRANSITION_HEALTH_PERCENT
    ) {
      this.boss.transitionPhase();
      this.satelliteManager.despawnAll();
    }

    this.satelliteManager.update(dt, this.boss.position);
    this.seedManager.update(dt, camera);

    const pendingShots = this.boss.popPendingSeedShots();
    if (pendingShots > 0) {
      if (this.boss.phase === BossPhase.PHASE_A) {
        this.spawnAimedShots(pendingShots, ship.position);
      } else if (this.boss.phase === BossPhase.PHASE_B) {
        this.spawnRadialBarrage(pendingShots);
      }
    }

    if (this.boss.phase === BossPhase.PHASE_B) {
      this.applyGravity(dt, ship);
    }
  }

  private spawnAimedShots(count: number, target: THREE.Vector2): void {
    for (let index = 0; index < count; index += 1) {
      this.tempDirection.copy(target).sub(this.boss.position);
      if (this.tempDirection.lengthSq() < 0.0001) {
        this.tempDirection.set(1, 0);
      } else {
        this.tempDirection.normalize();
      }
      this.tempVelocity.copy(this.tempDirection).multiplyScalar(BOSS_SEED_SPEED);
      this.seedManager.spawn(this.boss.position, this.tempVelocity);
    }
  }

  private spawnRadialBarrage(count: number): void {
    const barrageCount = Math.max(1, count);
    for (let index = 0; index < barrageCount; index += 1) {
      const angle = (index / barrageCount) * Math.PI * 2;
      this.tempDirection.set(Math.cos(angle), Math.sin(angle));
      this.tempVelocity.copy(this.tempDirection).multiplyScalar(BOSS_SEED_SPEED);
      this.seedManager.spawn(this.boss.position, this.tempVelocity);
    }
  }

  // Phase B gravity waves currently affect the ship only; bullet gravity interaction can be added later.
  private applyGravity(dt: number, ship: Ship): void {
    this.tempDirection.copy(this.boss.position).sub(ship.position);
    const distanceSq = this.tempDirection.lengthSq();
    const radiusSq = BOSS_PHASE_B_GRAVITY_RADIUS * BOSS_PHASE_B_GRAVITY_RADIUS;
    if (distanceSq <= 0.0001 || distanceSq > radiusSq) {
      return;
    }

    const distance = Math.sqrt(distanceSq);
    const falloff = 1 - distance / BOSS_PHASE_B_GRAVITY_RADIUS;
    const strength = BOSS_PHASE_B_GRAVITY_STRENGTH * falloff;
    this.tempDirection.normalize();
    ship.velocity.addScaledVector(this.tempDirection, strength * dt);
  }

  public despawn(): void {
    this.active = false;
    this.mesh.visible = false;
    this.mesh.scale.setScalar(2.0);
    this.satelliteManager.despawnAll();
    this.seedManager.reset();
  }

  public isActive(): boolean {
    return this.active;
  }

  public getBoss(): MegaPeach | null {
    return this.active ? this.boss : null;
  }

  public getSatellites(): ReadonlyArray<import("./PitSatellite").default> {
    return this.satelliteManager.getActiveSatellites();
  }

  public getSeeds(): ReadonlyArray<import("./Seed").default> {
    return this.seedManager.getActiveSeeds();
  }

  public getSeedManager(): SeedManager {
    return this.seedManager;
  }

  public getSatelliteManager(): PitSatelliteManager {
    return this.satelliteManager;
  }

  public dispose(): void {
    this.despawn();
    this.satelliteManager.dispose();
    this.seedManager.dispose();
    this.scene.remove(this.mesh);
    this.geometry.dispose();
    this.material.dispose();
  }
}
