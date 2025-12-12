import * as THREE from "three";
import PhysicsSystem from "@/systems/PhysicsSystem";

describe("PhysicsSystem", () => {
  it("applyThrust mutates velocity in the expected direction", () => {
    const velocity = new THREE.Vector2(0, 0);

    const result = PhysicsSystem.applyThrust(velocity, 0, 10, 0.5);
    expect(result).toBe(velocity);
    expect(velocity.x).toBeCloseTo(5);
    expect(velocity.y).toBeCloseTo(0);

    PhysicsSystem.applyThrust(velocity, Math.PI / 2, 10, 0.5);
    expect(velocity.y).toBeGreaterThan(0);
  });

  it("applyDamping reduces speed while preserving direction", () => {
    const velocity = new THREE.Vector2(10, 0);
    PhysicsSystem.applyDamping(velocity, 0.9);
    expect(velocity.x).toBeCloseTo(9);
    expect(velocity.y).toBeCloseTo(0);
  });

  it("clampSpeed caps velocity magnitude while preserving direction", () => {
    const velocity = new THREE.Vector2(3, 4); // length 5
    PhysicsSystem.clampSpeed(velocity, 4);

    expect(velocity.length()).toBeCloseTo(4);
    expect(velocity.y / velocity.x).toBeCloseTo(4 / 3);
  });

  it("wrapPosition wraps across all camera edges and corners", () => {
    const camera = {
      left: -10,
      right: 10,
      top: 10,
      bottom: -10
    } as unknown as THREE.OrthographicCamera;

    const padding = 1;
    const leftBound = camera.left - padding;
    const rightBound = camera.right + padding;
    const topBound = camera.top + padding;
    const bottomBound = camera.bottom - padding;

    const fromLeft = new THREE.Vector2(leftBound - 0.01, 0);
    PhysicsSystem.wrapPosition(fromLeft, camera, padding);
    expect(fromLeft.x).toBeCloseTo(rightBound);

    const fromRight = new THREE.Vector2(rightBound + 0.01, 0);
    PhysicsSystem.wrapPosition(fromRight, camera, padding);
    expect(fromRight.x).toBeCloseTo(leftBound);

    const fromBottom = new THREE.Vector2(0, bottomBound - 0.01);
    PhysicsSystem.wrapPosition(fromBottom, camera, padding);
    expect(fromBottom.y).toBeCloseTo(topBound);

    const fromTop = new THREE.Vector2(0, topBound + 0.01);
    PhysicsSystem.wrapPosition(fromTop, camera, padding);
    expect(fromTop.y).toBeCloseTo(bottomBound);

    const fromCorner = new THREE.Vector2(leftBound - 0.01, topBound + 0.01);
    PhysicsSystem.wrapPosition(fromCorner, camera, padding);
    expect(fromCorner.x).toBeCloseTo(rightBound);
    expect(fromCorner.y).toBeCloseTo(bottomBound);
  });

  it("rotateTowards rotates toward target at a maximum rate and handles wraparound", () => {
    const step = PhysicsSystem.rotateTowards(0, Math.PI / 2, 1, 0.5);
    expect(step).toBeCloseTo(0.5);

    const current = THREE.MathUtils.degToRad(350);
    const target = THREE.MathUtils.degToRad(10);
    const wrapped = PhysicsSystem.rotateTowards(current, target, Math.PI, 0.5);
    expect(wrapped).toBeCloseTo(target);
  });
});
