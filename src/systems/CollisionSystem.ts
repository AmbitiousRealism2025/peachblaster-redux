import * as THREE from "three";
import Bullet from "../entities/Bullet";
import Peach, { PeachSize } from "../entities/Peach";
import Ship from "../entities/Ship";
import MegaPeach from "../entities/bosses/MegaPeach";
import PitSatellite from "../entities/bosses/PitSatellite";
import Seed from "../entities/bosses/Seed";
import PeachManager from "../entities/PeachManager";
import {
  PEACH_MAX_ROTATION_SPEED,
  PEACH_MIN_ROTATION_SPEED,
  PEACH_SPLIT_ANGLE_SPREAD_DEGREES,
  PEACH_SPLIT_VELOCITY_MULTIPLIER
} from "../config/tuning";

export type BulletPeachCollision = {
  bullet: Bullet;
  peach: Peach;
};

export type BulletSatelliteCollision = {
  bullet: Bullet;
  satellite: PitSatellite;
};

export default class CollisionSystem {
  private static readonly origin = new THREE.Vector2(0, 0);
  private static readonly scratchParentVelocity = new THREE.Vector2();
  private static readonly scratchBaseDirection = new THREE.Vector2();
  private static readonly scratchPerpendicular = new THREE.Vector2();
  private static readonly scratchSpawnPositionA = new THREE.Vector2();
  private static readonly scratchSpawnPositionB = new THREE.Vector2();
  private static readonly scratchRotatedVelocityA = new THREE.Vector2();
  private static readonly scratchRotatedVelocityB = new THREE.Vector2();

  public static checkCircleCollision(
    positionA: THREE.Vector2,
    radiusA: number,
    positionB: THREE.Vector2,
    radiusB: number
  ): boolean {
    const combinedRadius = radiusA + radiusB;
    return (
      positionA.distanceToSquared(positionB) <=
      combinedRadius * combinedRadius
    );
  }

  public static checkBulletPeachCollisions(
    bullets: ReadonlyArray<Bullet>,
    peaches: ReadonlyArray<Peach>
  ): BulletPeachCollision[] {
    const collisions: BulletPeachCollision[] = [];

    for (const bullet of bullets) {
      for (const peach of peaches) {
        if (
          CollisionSystem.checkCircleCollision(
            bullet.position,
            bullet.getCollisionRadius(),
            peach.position,
            peach.getCollisionRadius()
          )
        ) {
          collisions.push({ bullet, peach });
        }
      }
    }

    return collisions;
  }

  public static checkBulletSatelliteCollisions(
    bullets: ReadonlyArray<Bullet>,
    satellites: ReadonlyArray<PitSatellite>
  ): BulletSatelliteCollision[] {
    const collisions: BulletSatelliteCollision[] = [];

    for (const bullet of bullets) {
      for (const satellite of satellites) {
        if (
          CollisionSystem.checkCircleCollision(
            bullet.position,
            bullet.getCollisionRadius(),
            satellite.position,
            satellite.getCollisionRadius()
          )
        ) {
          collisions.push({ bullet, satellite });
        }
      }
    }

    return collisions;
  }

  public static checkBulletBossCollisions(
    bullets: ReadonlyArray<Bullet>,
    boss: MegaPeach
  ): Bullet[] {
    if (!boss.isVulnerable()) {
      return [];
    }

    const collisions: Bullet[] = [];
    for (const bullet of bullets) {
      if (
        CollisionSystem.checkCircleCollision(
          bullet.position,
          bullet.getCollisionRadius(),
          boss.position,
          boss.getCollisionRadius()
        )
      ) {
        collisions.push(bullet);
      }
    }
    return collisions;
  }

  public static checkShipPeachCollisions(
    ship: Ship,
    peaches: ReadonlyArray<Peach>
  ): Peach[] {
    if (ship.isInvulnerable()) {
      return [];
    }

    const collisions: Peach[] = [];

    for (const peach of peaches) {
      if (
        CollisionSystem.checkCircleCollision(
          ship.position,
          ship.getCollisionRadius(),
          peach.position,
          peach.getCollisionRadius()
        )
      ) {
        collisions.push(peach);
      }
    }

    return collisions;
  }

  public static checkShipSeedCollisions(
    ship: Ship,
    seeds: ReadonlyArray<Seed>
  ): Seed[] {
    if (ship.isInvulnerable()) {
      return [];
    }

    const collisions: Seed[] = [];
    for (const seed of seeds) {
      if (
        CollisionSystem.checkCircleCollision(
          ship.position,
          ship.getCollisionRadius(),
          seed.position,
          seed.getCollisionRadius()
        )
      ) {
        collisions.push(seed);
      }
    }

    return collisions;
  }

  public static checkShipBossCollisions(
    ship: Ship,
    boss: MegaPeach
  ): boolean {
    if (ship.isInvulnerable()) {
      return false;
    }

    return CollisionSystem.checkCircleCollision(
      ship.position,
      ship.getCollisionRadius(),
      boss.position,
      boss.getCollisionRadius()
    );
  }

  public static splitPeach(
    peach: Peach,
    peachManager: PeachManager
  ): Peach[] {
    const nextSize = peach.getSplitSize();
    if (!nextSize) {
      return [];
    }

    const parentVelocity = CollisionSystem.scratchParentVelocity.copy(
      peach.velocity
    );
    const speed = parentVelocity.length();
    const baseDirection = CollisionSystem.scratchBaseDirection;
    if (speed > 0) {
      baseDirection.copy(parentVelocity).normalize();
    } else {
      baseDirection.set(1, 0);
    }

    const perpendicular = CollisionSystem.scratchPerpendicular
      .set(-baseDirection.y, baseDirection.x)
      .multiplyScalar(0.3);

    const spawnPositionA = CollisionSystem.scratchSpawnPositionA
      .copy(peach.position)
      .add(perpendicular);
    const spawnPositionB = CollisionSystem.scratchSpawnPositionB
      .copy(peach.position)
      .sub(perpendicular);

    const angleSpreadRad = THREE.MathUtils.degToRad(
      PEACH_SPLIT_ANGLE_SPREAD_DEGREES
    );

    const rotatedVelocityA = CollisionSystem.scratchRotatedVelocityA
      .copy(parentVelocity)
      .rotateAround(CollisionSystem.origin, angleSpreadRad)
      .multiplyScalar(PEACH_SPLIT_VELOCITY_MULTIPLIER);
    const rotatedVelocityB = CollisionSystem.scratchRotatedVelocityB
      .copy(parentVelocity)
      .rotateAround(CollisionSystem.origin, -angleSpreadRad)
      .multiplyScalar(PEACH_SPLIT_VELOCITY_MULTIPLIER);

    const spawned: Peach[] = [];

    const peachA = peachManager.spawn(
      spawnPositionA,
      rotatedVelocityA,
      nextSize as PeachSize
    );
    if (peachA) {
      peachA.rotationSpeed = THREE.MathUtils.randFloat(
        PEACH_MIN_ROTATION_SPEED,
        PEACH_MAX_ROTATION_SPEED
      );
      spawned.push(peachA);
    }

    const peachB = peachManager.spawn(
      spawnPositionB,
      rotatedVelocityB,
      nextSize as PeachSize
    );
    if (peachB) {
      peachB.rotationSpeed = THREE.MathUtils.randFloat(
        PEACH_MIN_ROTATION_SPEED,
        PEACH_MAX_ROTATION_SPEED
      );
      spawned.push(peachB);
    }

    return spawned;
  }
}
