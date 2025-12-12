import * as THREE from "three";
import CollisionSystem from "@/systems/CollisionSystem";
import Bullet from "@/entities/Bullet";
import Peach, { PeachSize } from "@/entities/Peach";
import type PeachManager from "@/entities/PeachManager";
import Ship from "@/entities/Ship";
import {
  PEACH_SPLIT_ANGLE_SPREAD_DEGREES,
  PEACH_SPLIT_VELOCITY_MULTIPLIER
} from "@/config/tuning";

describe("CollisionSystem", () => {
  describe("checkCircleCollision", () => {
    it("detects overlapping circles", () => {
      const a = new THREE.Vector2(0, 0);
      const b = new THREE.Vector2(1, 0);
      expect(CollisionSystem.checkCircleCollision(a, 1, b, 1)).toBe(true);
    });

    it("detects non-overlapping circles", () => {
      const a = new THREE.Vector2(0, 0);
      const b = new THREE.Vector2(3.1, 0);
      expect(CollisionSystem.checkCircleCollision(a, 1, b, 1)).toBe(false);
    });

    it("treats touching circles as a collision", () => {
      const a = new THREE.Vector2(0, 0);
      const b = new THREE.Vector2(2, 0);
      expect(CollisionSystem.checkCircleCollision(a, 1, b, 1)).toBe(true);
    });

    it("handles zero-radius edge cases", () => {
      const a = new THREE.Vector2(0, 0);
      const b = new THREE.Vector2(0, 0);
      expect(CollisionSystem.checkCircleCollision(a, 0, b, 0)).toBe(true);

      const c = new THREE.Vector2(0.1, 0);
      expect(CollisionSystem.checkCircleCollision(a, 0, c, 0)).toBe(false);
    });
  });

  it("returns bullet-peach collision pairs", () => {
    const bullet1 = {
      id: "b1",
      position: new THREE.Vector2(0, 0),
      getCollisionRadius: () => 1
    } as unknown as Bullet;
    const bullet2 = {
      id: "b2",
      position: new THREE.Vector2(10, 10),
      getCollisionRadius: () => 1
    } as unknown as Bullet;

    const peach1 = {
      id: "p1",
      position: new THREE.Vector2(0.5, 0),
      getCollisionRadius: () => 1
    } as unknown as Peach;
    const peach2 = {
      id: "p2",
      position: new THREE.Vector2(50, 50),
      getCollisionRadius: () => 1
    } as unknown as Peach;

    const collisions = CollisionSystem.checkBulletPeachCollisions(
      [bullet1, bullet2],
      [peach1, peach2]
    );

    expect(collisions).toHaveLength(1);
    expect(collisions[0]?.bullet).toBe(bullet1);
    expect(collisions[0]?.peach).toBe(peach1);
  });

  it("returns bullet-satellite collision pairs", () => {
    const bullet = {
      position: new THREE.Vector2(0, 0),
      getCollisionRadius: () => 1
    } as unknown as Bullet;

    const satellite = {
      position: new THREE.Vector2(0.25, 0),
      getCollisionRadius: () => 1
    } as any;

    const collisions = CollisionSystem.checkBulletSatelliteCollisions(
      [bullet],
      [satellite]
    );

    expect(collisions).toHaveLength(1);
    expect(collisions[0]?.bullet).toBe(bullet);
    expect(collisions[0]?.satellite).toBe(satellite);
  });

  it("returns no bullet-boss collisions while the boss is not vulnerable", () => {
    const bullet = {
      position: new THREE.Vector2(0, 0),
      getCollisionRadius: () => 1
    } as unknown as Bullet;

    const boss = {
      position: new THREE.Vector2(0, 0),
      getCollisionRadius: () => 10,
      isVulnerable: () => false
    } as any;

    expect(CollisionSystem.checkBulletBossCollisions([bullet], boss)).toEqual([]);
  });

  it("returns colliding bullets when the boss is vulnerable", () => {
    const colliding = {
      position: new THREE.Vector2(0, 0),
      getCollisionRadius: () => 1
    } as unknown as Bullet;
    const notColliding = {
      position: new THREE.Vector2(100, 100),
      getCollisionRadius: () => 1
    } as unknown as Bullet;

    const boss = {
      position: new THREE.Vector2(0.5, 0),
      getCollisionRadius: () => 1,
      isVulnerable: () => true
    } as any;

    expect(
      CollisionSystem.checkBulletBossCollisions([colliding, notColliding], boss)
    ).toEqual([colliding]);
  });

  it("respects ship invulnerability for ship-peach collisions", () => {
    const ship = {
      position: new THREE.Vector2(0, 0),
      getCollisionRadius: () => 1,
      isInvulnerable: () => true
    } as unknown as Ship;

    const peach = {
      position: new THREE.Vector2(0.5, 0),
      getCollisionRadius: () => 1
    } as unknown as Peach;

    expect(CollisionSystem.checkShipPeachCollisions(ship, [peach])).toEqual([]);

    const vulnerableShip = {
      ...ship,
      isInvulnerable: () => false
    } as unknown as Ship;

    expect(
      CollisionSystem.checkShipPeachCollisions(vulnerableShip, [peach])
    ).toEqual([peach]);
  });

  it("respects ship invulnerability for ship-seed collisions", () => {
    const ship = {
      position: new THREE.Vector2(0, 0),
      getCollisionRadius: () => 1,
      isInvulnerable: () => true
    } as unknown as Ship;

    const seed = {
      position: new THREE.Vector2(0.5, 0),
      getCollisionRadius: () => 1
    } as any;

    expect(CollisionSystem.checkShipSeedCollisions(ship, [seed])).toEqual([]);

    const vulnerableShip = {
      ...ship,
      isInvulnerable: () => false
    } as unknown as Ship;

    expect(CollisionSystem.checkShipSeedCollisions(vulnerableShip, [seed])).toEqual([
      seed
    ]);
  });

  it("respects ship invulnerability for ship-boss collisions", () => {
    const invulnerableShip = {
      position: new THREE.Vector2(0, 0),
      getCollisionRadius: () => 1,
      isInvulnerable: () => true
    } as unknown as Ship;

    const vulnerableShip = {
      ...invulnerableShip,
      isInvulnerable: () => false
    } as unknown as Ship;

    const boss = {
      position: new THREE.Vector2(0.5, 0),
      getCollisionRadius: () => 1
    } as any;

    expect(CollisionSystem.checkShipBossCollisions(invulnerableShip, boss)).toBe(
      false
    );
    expect(CollisionSystem.checkShipBossCollisions(vulnerableShip, boss)).toBe(
      true
    );
  });

  describe("splitPeach", () => {
    it("returns 0 peaches for SMALL", () => {
      const parent = new Peach();
      parent.size = PeachSize.SMALL;

      const peachManager = {
        spawn: vi.fn()
      } as unknown as PeachManager;

      const spawned = CollisionSystem.splitPeach(parent, peachManager);

      expect(spawned).toEqual([]);
      expect(peachManager.spawn).not.toHaveBeenCalled();
    });

    it("returns 2 peaches for LARGE and assigns spread velocities/positions + rotation speed", () => {
      const randFloat = vi
        .spyOn(THREE.MathUtils, "randFloat")
        .mockReturnValue(123);

      const parent = new Peach();
      parent.size = PeachSize.LARGE;
      parent.position.set(5, 5);
      parent.velocity.set(10, 0);

      const spawnedA = new Peach();
      const spawnedB = new Peach();
      const spawn = vi
        .fn()
        .mockReturnValueOnce(spawnedA)
        .mockReturnValueOnce(spawnedB);
      const peachManager = {
        spawn
      } as unknown as PeachManager;

      const spawned = CollisionSystem.splitPeach(parent, peachManager);

      expect(spawned).toEqual([spawnedA, spawnedB]);
      expect(spawn).toHaveBeenCalledTimes(2);

      const [posA, velA, sizeA] = spawn.mock.calls[0] as [
        THREE.Vector2,
        THREE.Vector2,
        PeachSize
      ];
      const [posB, velB, sizeB] = spawn.mock.calls[1] as [
        THREE.Vector2,
        THREE.Vector2,
        PeachSize
      ];

      expect(sizeA).toBe(PeachSize.MEDIUM);
      expect(sizeB).toBe(PeachSize.MEDIUM);

      const parentY = parent.position.y;
      expect(posA.distanceTo(parent.position)).toBeLessThan(1);
      expect(posB.distanceTo(parent.position)).toBeLessThan(1);
      expect(posA.y).toBeGreaterThan(parentY);
      expect(posB.y).toBeLessThan(parentY);
      expect(Math.abs((posA.y - parentY) + (posB.y - parentY))).toBeLessThan(
        1e-4
      );

      const expectedSpeed = 10 * PEACH_SPLIT_VELOCITY_MULTIPLIER;
      expect(velA.length()).toBeCloseTo(expectedSpeed, 5);
      expect(velB.length()).toBeCloseTo(expectedSpeed, 5);
      expect(Math.sign(velA.y)).toBe(1);
      expect(Math.sign(velB.y)).toBe(-1);
      expect(velA.x).toBeCloseTo(
        Math.cos(THREE.MathUtils.degToRad(PEACH_SPLIT_ANGLE_SPREAD_DEGREES)) *
          expectedSpeed,
        5
      );

      expect(spawnedA.rotationSpeed).toBe(123);
      expect(spawnedB.rotationSpeed).toBe(123);
      expect(randFloat).toHaveBeenCalled();
    });

    it("returns 2 peaches for MEDIUM", () => {
      vi.spyOn(THREE.MathUtils, "randFloat").mockReturnValue(10);

      const parent = new Peach();
      parent.size = PeachSize.MEDIUM;
      parent.position.set(0, 0);
      parent.velocity.set(1, 0);

      const spawnedA = new Peach();
      const spawnedB = new Peach();
      const spawn = vi
        .fn()
        .mockReturnValueOnce(spawnedA)
        .mockReturnValueOnce(spawnedB);
      const peachManager = {
        spawn
      } as unknown as PeachManager;

      const spawned = CollisionSystem.splitPeach(parent, peachManager);

      expect(spawned).toHaveLength(2);
      expect(spawn).toHaveBeenCalledTimes(2);
      expect(spawn.mock.calls[0]?.[2]).toBe(PeachSize.SMALL);
      expect(spawn.mock.calls[1]?.[2]).toBe(PeachSize.SMALL);
    });
  });
});
