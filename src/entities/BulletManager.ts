import * as THREE from "three";
import SceneManager from "../rendering/SceneManager";
import Bullet from "./Bullet";
import ObjectPool from "../systems/ObjectPool";
import {
  BULLET_POOL_CAPACITY,
  BULLET_RADIUS
} from "../config/tuning";

export default class BulletManager {
  private pool: ObjectPool<Bullet>;
  private instancedMesh: THREE.InstancedMesh;
  private geometry: THREE.BufferGeometry;
  private material: THREE.MeshStandardMaterial;
  private scene: THREE.Scene;
  private capacity: number;
  private readonly hiddenMatrix = new THREE.Matrix4().makeScale(0, 0, 0);
  private readonly tempPosition3 = new THREE.Vector3();
  private readonly tempQuat = new THREE.Quaternion();
  private readonly tempScale3 = new THREE.Vector3(1, 1, 1);
  private readonly tempMatrix = new THREE.Matrix4();

  constructor(sceneManager: SceneManager, capacity: number = BULLET_POOL_CAPACITY) {
    this.scene = sceneManager.getScene();
    this.capacity = capacity;

    const bullets: Bullet[] = [];
    for (let index = 0; index < capacity; index += 1) {
      const bullet = new Bullet();
      bullet.instanceIndex = index;
      bullets.push(bullet);
    }
    this.pool = new ObjectPool<Bullet>(bullets);

    this.geometry = new THREE.SphereGeometry(BULLET_RADIUS, 8, 8);
    this.material = new THREE.MeshStandardMaterial({
      color: 0x00eaff,
      emissive: 0x00eaff,
      emissiveIntensity: 1.0,
      roughness: 0.3,
      metalness: 0.0
    });

    this.instancedMesh = new THREE.InstancedMesh(
      this.geometry,
      this.material,
      capacity
    );
    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.scene.add(this.instancedMesh);

    for (let index = 0; index < capacity; index += 1) {
      this.instancedMesh.setMatrixAt(index, this.hiddenMatrix);
    }
    this.instancedMesh.instanceMatrix.needsUpdate = true;
  }

  public spawn(
    position: THREE.Vector2,
    velocity: THREE.Vector2
  ): Bullet | null {
    const bullet = this.pool.acquire();
    if (!bullet) {
      return null;
    }

    bullet.reset(position, velocity);
    this.updateInstanceMatrix(bullet);
    this.instancedMesh.instanceMatrix.needsUpdate = true;
    return bullet;
  }

  public update(
    dt: number,
    camera: THREE.OrthographicCamera
  ): void {
    const activeBullets = this.pool.getActive();
    let anyActive = false;

    for (let index = activeBullets.length - 1; index >= 0; index -= 1) {
      const bullet = activeBullets[index];
      bullet.update(dt, camera);

      if (!bullet.active) {
        this.hideInstanceMatrix(bullet);
        this.pool.release(bullet);
        continue;
      }

      this.updateInstanceMatrix(bullet);
      anyActive = true;
    }

    if (anyActive) {
      this.instancedMesh.instanceMatrix.needsUpdate = true;
    }
  }

  public getActiveBullets(): ReadonlyArray<Bullet> {
    return this.pool.getActive();
  }

  public despawn(bullet: Bullet): void {
    this.pool.release(bullet);
    this.hideInstanceMatrix(bullet);
    this.instancedMesh.instanceMatrix.needsUpdate = true;
  }

  public reset(): void {
    this.pool.reset();
    for (let index = 0; index < this.capacity; index += 1) {
      this.instancedMesh.setMatrixAt(index, this.hiddenMatrix);
    }
    this.instancedMesh.instanceMatrix.needsUpdate = true;
  }

  private hideInstanceMatrix(bullet: Bullet): void {
    this.instancedMesh.setMatrixAt(bullet.instanceIndex, this.hiddenMatrix);
  }

  private updateInstanceMatrix(bullet: Bullet): void {
    this.tempPosition3.set(bullet.position.x, bullet.position.y, 0);
    this.tempQuat.identity();
    this.tempMatrix.compose(
      this.tempPosition3,
      this.tempQuat,
      this.tempScale3
    );
    this.instancedMesh.setMatrixAt(bullet.instanceIndex, this.tempMatrix);
  }

  public dispose(): void {
    this.scene.remove(this.instancedMesh);
    this.geometry.dispose();
    this.material.dispose();
  }
}
