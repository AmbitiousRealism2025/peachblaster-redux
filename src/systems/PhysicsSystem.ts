import * as THREE from "three";
import { WORLD_WRAP_PADDING } from "../config/tuning";

/**
 * In-place physics helpers for 2D arcade movement.
 * Methods mutate the provided vectors and return them for chaining.
 * This avoids per-frame allocations in hot paths.
 */
export default class PhysicsSystem {
  private static readonly tempForward = new THREE.Vector2();

  /**
   * Adds forward thrust to a velocity vector based on rotation angle.
   */
  public static applyThrust(
    velocity: THREE.Vector2,
    angle: number,
    thrustAccel: number,
    dt: number
  ): THREE.Vector2 {
    PhysicsSystem.tempForward.set(Math.cos(angle), Math.sin(angle));
    velocity.addScaledVector(
      PhysicsSystem.tempForward,
      thrustAccel * dt
    );
    return velocity;
  }

  /**
   * Applies arcade friction by scaling velocity by a damping factor.
   */
  public static applyDamping(
    velocity: THREE.Vector2,
    dampingFactor: number
  ): THREE.Vector2 {
    velocity.multiplyScalar(dampingFactor);
    return velocity;
  }

  /**
   * Caps velocity magnitude while preserving direction.
   */
  public static clampSpeed(
    velocity: THREE.Vector2,
    maxSpeed: number
  ): THREE.Vector2 {
    const speed = velocity.length();
    if (speed <= maxSpeed) {
      return velocity;
    }
    velocity.setLength(maxSpeed);
    return velocity;
  }

  /**
   * Wraps a world position across orthographic camera bounds.
   */
  public static wrapPosition(
    position: THREE.Vector2,
    camera: THREE.OrthographicCamera,
    padding: number = WORLD_WRAP_PADDING
  ): THREE.Vector2 {
    const leftBound = camera.left - padding;
    const rightBound = camera.right + padding;
    const topBound = camera.top + padding;
    const bottomBound = camera.bottom - padding;

    if (position.x < leftBound) {
      position.x = rightBound;
    } else if (position.x > rightBound) {
      position.x = leftBound;
    }

    if (position.y < bottomBound) {
      position.y = topBound;
    } else if (position.y > topBound) {
      position.y = bottomBound;
    }

    return position;
  }

  /**
   * Rotates currentAngle toward targetAngle at a maximum rate.
   * Useful for future AI steering.
   */
  public static rotateTowards(
    currentAngle: number,
    targetAngle: number,
    rotationSpeed: number,
    dt: number
  ): number {
    const twoPi = Math.PI * 2;
    const rawDifference = targetAngle - currentAngle;
    const shortestDifference =
      THREE.MathUtils.euclideanModulo(rawDifference + Math.PI, twoPi) -
      Math.PI;

    const maxStep = rotationSpeed * dt;
    if (Math.abs(shortestDifference) <= maxStep) {
      return targetAngle;
    }

    return currentAngle + Math.sign(shortestDifference) * maxStep;
  }
}
