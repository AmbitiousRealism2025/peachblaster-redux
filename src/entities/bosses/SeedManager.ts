import * as THREE from "three";
import SceneManager from "../../rendering/SceneManager";
import ObjectPool from "../../systems/ObjectPool";
import Seed from "./Seed";

export default class SeedManager {
  private pool: ObjectPool<Seed>;
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

  constructor(sceneManager: SceneManager, capacity: number = 50) {
    this.scene = sceneManager.getScene();
    this.capacity = capacity;

    const seeds: Seed[] = [];
    for (let index = 0; index < capacity; index += 1) {
      const seed = new Seed();
      seed.instanceIndex = index;
      seeds.push(seed);
    }
    this.pool = new ObjectPool<Seed>(seeds);

    this.geometry = new THREE.SphereGeometry(0.2, 8, 8);
    this.material = new THREE.MeshStandardMaterial({
      color: 0x9b6a34,
      emissive: 0x553000,
      emissiveIntensity: 0.3,
      roughness: 0.8,
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
  ): Seed | null {
    const seed = this.pool.acquire();
    if (!seed) {
      return null;
    }

    seed.reset(position, velocity);
    this.updateInstanceMatrix(seed);
    this.instancedMesh.instanceMatrix.needsUpdate = true;
    return seed;
  }

  public update(
    dt: number,
    camera: THREE.OrthographicCamera
  ): void {
    const activeSeeds = this.pool.getActive();
    let anyActive = false;

    for (let index = activeSeeds.length - 1; index >= 0; index -= 1) {
      const seed = activeSeeds[index];
      seed.update(dt, camera);

      if (!seed.active) {
        this.hideInstanceMatrix(seed);
        this.pool.release(seed);
        continue;
      }

      this.updateInstanceMatrix(seed);
      anyActive = true;
    }

    if (anyActive) {
      this.instancedMesh.instanceMatrix.needsUpdate = true;
    }
  }

  public getActiveSeeds(): ReadonlyArray<Seed> {
    return this.pool.getActive();
  }

  public despawn(seed: Seed): void {
    this.pool.release(seed);
    this.hideInstanceMatrix(seed);
    this.instancedMesh.instanceMatrix.needsUpdate = true;
  }

  public reset(): void {
    this.pool.reset();
    for (let index = 0; index < this.capacity; index += 1) {
      this.instancedMesh.setMatrixAt(index, this.hiddenMatrix);
    }
    this.instancedMesh.instanceMatrix.needsUpdate = true;
  }

  private hideInstanceMatrix(seed: Seed): void {
    this.instancedMesh.setMatrixAt(seed.instanceIndex, this.hiddenMatrix);
  }

  private updateInstanceMatrix(seed: Seed): void {
    this.tempPosition3.set(seed.position.x, seed.position.y, 0);
    this.tempQuat.identity();
    this.tempMatrix.compose(
      this.tempPosition3,
      this.tempQuat,
      this.tempScale3
    );
    this.instancedMesh.setMatrixAt(seed.instanceIndex, this.tempMatrix);
  }

  public dispose(): void {
    this.scene.remove(this.instancedMesh);
    this.geometry.dispose();
    this.material.dispose();
  }
}

