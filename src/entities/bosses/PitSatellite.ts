import * as THREE from "three";
import { BOSS_SATELLITE_HEALTH } from "../../config/tuning";

export default class PitSatellite {
  public position: THREE.Vector2 = new THREE.Vector2();
  public health = BOSS_SATELLITE_HEALTH;
  public orbitAngle = 0;
  public orbitRadius = 0;
  public orbitSpeed = 0; // degrees/sec
  public active = false;
  public instanceIndex = -1;

  public reset(
    bossPosition: THREE.Vector2,
    orbitAngle: number,
    orbitRadius: number,
    orbitSpeed: number
  ): void {
    this.orbitAngle = orbitAngle;
    this.orbitRadius = orbitRadius;
    this.orbitSpeed = orbitSpeed;
    this.health = BOSS_SATELLITE_HEALTH;
    this.active = true;
    this.update(0, bossPosition);
  }

  public update(dt: number, bossPosition: THREE.Vector2): void {
    if (!this.active) {
      return;
    }

    this.orbitAngle += THREE.MathUtils.degToRad(this.orbitSpeed) * dt;
    this.position.set(
      bossPosition.x + Math.cos(this.orbitAngle) * this.orbitRadius,
      bossPosition.y + Math.sin(this.orbitAngle) * this.orbitRadius
    );
  }

  public takeDamage(amount: number): void {
    if (!this.active) {
      return;
    }
    this.health = Math.max(0, this.health - amount);
    if (this.health <= 0) {
      this.active = false;
    }
  }

  public getCollisionRadius(): number {
    return 0.6;
  }
}

