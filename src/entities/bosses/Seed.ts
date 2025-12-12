import * as THREE from "three";
import PhysicsSystem from "../../systems/PhysicsSystem";
import { BOSS_SEED_TTL_SECONDS } from "../../config/tuning";

export default class Seed {
  public position: THREE.Vector2 = new THREE.Vector2();
  public velocity: THREE.Vector2 = new THREE.Vector2();
  public ttl = 0;
  public active = false;
  public instanceIndex = -1;

  public reset(position: THREE.Vector2, velocity: THREE.Vector2): void {
    this.position.copy(position);
    this.velocity.copy(velocity);
    this.ttl = BOSS_SEED_TTL_SECONDS;
    this.active = true;
  }

  public update(dt: number, camera: THREE.OrthographicCamera): void {
    if (!this.active) {
      return;
    }

    this.ttl -= dt;
    if (this.ttl <= 0) {
      this.active = false;
      return;
    }

    this.position.addScaledVector(this.velocity, dt);
    PhysicsSystem.wrapPosition(this.position, camera);
  }

  public getCollisionRadius(): number {
    return 0.25;
  }
}

