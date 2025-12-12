import * as THREE from "three";
import SceneManager from "../rendering/SceneManager";
import Peach, { PeachSize } from "./Peach";
import ObjectPool from "../systems/ObjectPool";
import { createPeachMaterial } from "../rendering/PeachMaterial";
import {
  PEACH_LARGE_SCALE,
  PEACH_MEDIUM_SCALE,
  PEACH_SMALL_SCALE,
  PEACH_POOL_CAPACITY
} from "../config/tuning";

export default class PeachManager {
  private pool: ObjectPool<Peach>;
  private instancedMesh: THREE.InstancedMesh;
  private geometry: THREE.BufferGeometry;
  private material: THREE.ShaderMaterial;
  private scene: THREE.Scene;
  private readonly hiddenMatrix = new THREE.Matrix4().makeScale(0, 0, 0);
  private readonly tempPosition3 = new THREE.Vector3();
  private readonly tempQuat = new THREE.Quaternion();
  private readonly tempScale3 = new THREE.Vector3();
  private readonly tempMatrix = new THREE.Matrix4();
  private readonly zAxis = new THREE.Vector3(0, 0, 1);

  constructor(sceneManager: SceneManager, capacity: number = PEACH_POOL_CAPACITY) {
    this.scene = sceneManager.getScene();

    // Preallocate peaches so instanceIndex matches InstancedMesh slot.
    const peaches: Peach[] = [];
    for (let index = 0; index < capacity; index += 1) {
      const peach = new Peach();
      peach.instanceIndex = index;
      peaches.push(peach);
    }
    this.pool = new ObjectPool<Peach>(peaches);

    this.geometry = new THREE.SphereGeometry(1, 16, 16);
    this.material = createPeachMaterial();

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
    velocity: THREE.Vector2,
    size: PeachSize
  ): Peach | null {
    const peach = this.pool.acquire();
    if (!peach) {
      return null;
    }

    peach.reset(position, velocity, size);
    this.updateInstanceMatrix(peach);
    this.instancedMesh.instanceMatrix.needsUpdate = true;
    return peach;
  }

  public update(
    dt: number,
    camera: THREE.OrthographicCamera
  ): void {
    const activePeaches = this.pool.getActive();

    for (const peach of activePeaches) {
      peach.update(dt, camera);
      this.updateInstanceMatrix(peach);
    }

    if (activePeaches.length > 0) {
      this.instancedMesh.instanceMatrix.needsUpdate = true;
    }
  }

  public getActivePeaches(): ReadonlyArray<Peach> {
    return this.pool.getActive();
  }

  public despawn(peach: Peach): void {
    this.pool.release(peach);

    this.instancedMesh.setMatrixAt(peach.instanceIndex, this.hiddenMatrix);
    this.instancedMesh.instanceMatrix.needsUpdate = true;
  }

  private updateInstanceMatrix(peach: Peach): void {
    const scale = this.getScaleForSize(peach.size);
    this.tempPosition3.set(peach.position.x, peach.position.y, 0);
    this.tempQuat.setFromAxisAngle(this.zAxis, peach.rotation);
    this.tempScale3.setScalar(scale);
    this.tempMatrix.compose(
      this.tempPosition3,
      this.tempQuat,
      this.tempScale3
    );

    this.instancedMesh.setMatrixAt(peach.instanceIndex, this.tempMatrix);
  }

  private getScaleForSize(size: PeachSize): number {
    switch (size) {
      case PeachSize.LARGE:
        return PEACH_LARGE_SCALE;
      case PeachSize.MEDIUM:
        return PEACH_MEDIUM_SCALE;
      case PeachSize.SMALL:
        return PEACH_SMALL_SCALE;
      default:
        return PEACH_LARGE_SCALE;
    }
  }

  public dispose(): void {
    this.scene.remove(this.instancedMesh);
    this.geometry.dispose();
    this.material.dispose();
  }
}
