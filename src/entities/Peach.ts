import * as THREE from "three";
import PhysicsSystem from "../systems/PhysicsSystem";
import {
  PEACH_LARGE_RADIUS,
  PEACH_MEDIUM_RADIUS,
  PEACH_SMALL_RADIUS
} from "../config/tuning";

export enum PeachSize {
  LARGE = "LARGE",
  MEDIUM = "MEDIUM",
  SMALL = "SMALL"
}

export default class Peach {
  public position: THREE.Vector2 = new THREE.Vector2();
  public velocity: THREE.Vector2 = new THREE.Vector2();
  public rotation = 0;
  public rotationSpeed = 0;
  public size: PeachSize = PeachSize.LARGE;
  public active = false;
  public instanceIndex = -1;

  public reset(
    position: THREE.Vector2,
    velocity: THREE.Vector2,
    size: PeachSize
  ): void {
    this.position.copy(position);
    this.velocity.copy(velocity);
    this.size = size;
    this.rotation = 0;
    this.rotationSpeed = 0;
    this.active = true;
  }

  public update(
    dt: number,
    camera: THREE.OrthographicCamera
  ): void {
    if (!this.active) {
      return;
    }

    this.position.addScaledVector(this.velocity, dt);
    PhysicsSystem.wrapPosition(this.position, camera);
    this.rotation += this.rotationSpeed * dt;
  }

  public getCollisionRadius(): number {
    switch (this.size) {
      case PeachSize.LARGE:
        return PEACH_LARGE_RADIUS;
      case PeachSize.MEDIUM:
        return PEACH_MEDIUM_RADIUS;
      case PeachSize.SMALL:
        return PEACH_SMALL_RADIUS;
      default:
        return PEACH_LARGE_RADIUS;
    }
  }

  public getSplitSize(): PeachSize | null {
    switch (this.size) {
      case PeachSize.LARGE:
        return PeachSize.MEDIUM;
      case PeachSize.MEDIUM:
        return PeachSize.SMALL;
      case PeachSize.SMALL:
        return null;
      default:
        return null;
    }
  }

  public deactivate(): void {
    this.active = false;
  }
}
