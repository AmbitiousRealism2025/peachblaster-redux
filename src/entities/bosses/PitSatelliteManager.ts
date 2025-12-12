import * as THREE from "three";
import SceneManager from "../../rendering/SceneManager";
import ObjectPool from "../../systems/ObjectPool";
import PitSatellite from "./PitSatellite";
import {
  BOSS_SATELLITE_COUNT,
  BOSS_SATELLITE_ORBIT_SPEED
} from "../../config/tuning";

export default class PitSatelliteManager {
  private pool: ObjectPool<PitSatellite>;
  private instancedMesh: THREE.InstancedMesh;
  private geometry: THREE.BufferGeometry;
  private material: THREE.MeshStandardMaterial;
  private scene: THREE.Scene;
  private capacity: number;

  private readonly hiddenMatrix = new THREE.Matrix4().makeScale(0, 0, 0);
  private readonly tempPosition3 = new THREE.Vector3();
  private readonly tempQuat = new THREE.Quaternion();
  private readonly tempScale3 = new THREE.Vector3();
  private readonly tempMatrix = new THREE.Matrix4();
  private readonly zAxis = new THREE.Vector3(0, 0, 1);

  constructor(sceneManager: SceneManager, capacity: number = 8) {
    this.scene = sceneManager.getScene();
    this.capacity = capacity;

    const satellites: PitSatellite[] = [];
    for (let index = 0; index < capacity; index += 1) {
      const satellite = new PitSatellite();
      satellite.instanceIndex = index;
      satellites.push(satellite);
    }
    this.pool = new ObjectPool<PitSatellite>(satellites);

    this.geometry = new THREE.SphereGeometry(0.5, 12, 12);
    this.material = new THREE.MeshStandardMaterial({
      color: 0x2b0f0f,
      emissive: 0x6b0000,
      emissiveIntensity: 0.7,
      roughness: 0.6,
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
    bossPosition: THREE.Vector2,
    orbitAngle: number,
    orbitRadius: number
  ): PitSatellite | null {
    const satellite = this.pool.acquire();
    if (!satellite) {
      return null;
    }

    const speed =
      BOSS_SATELLITE_ORBIT_SPEED *
      (Math.random() < 0.5 ? -1 : 1);
    satellite.reset(bossPosition, orbitAngle, orbitRadius, speed);
    this.updateInstanceMatrix(satellite);
    this.instancedMesh.instanceMatrix.needsUpdate = true;
    return satellite;
  }

  public spawnRing(
    bossPosition: THREE.Vector2,
    orbitRadius: number
  ): void {
    for (let index = 0; index < BOSS_SATELLITE_COUNT; index += 1) {
      const orbitAngle =
        (index / Math.max(1, BOSS_SATELLITE_COUNT)) *
        Math.PI *
        2;
      this.spawn(bossPosition, orbitAngle, orbitRadius);
    }
  }

  public update(dt: number, bossPosition: THREE.Vector2): void {
    const activeSatellites = this.pool.getActive();
    let anyActive = false;

    for (let index = activeSatellites.length - 1; index >= 0; index -= 1) {
      const satellite = activeSatellites[index];
      satellite.update(dt, bossPosition);

      if (!satellite.active) {
        this.hideInstanceMatrix(satellite);
        this.pool.release(satellite);
        continue;
      }

      this.updateInstanceMatrix(satellite);
      anyActive = true;
    }

    if (anyActive) {
      this.instancedMesh.instanceMatrix.needsUpdate = true;
    }
  }

  public getActiveSatellites(): ReadonlyArray<PitSatellite> {
    return this.pool.getActive();
  }

  public despawn(satellite: PitSatellite): void {
    this.pool.release(satellite);
    this.hideInstanceMatrix(satellite);
    this.instancedMesh.instanceMatrix.needsUpdate = true;
  }

  public despawnAll(): void {
    for (const satellite of Array.from(this.pool.getActive())) {
      this.despawn(satellite);
    }
  }

  private hideInstanceMatrix(satellite: PitSatellite): void {
    this.instancedMesh.setMatrixAt(
      satellite.instanceIndex,
      this.hiddenMatrix
    );
  }

  private updateInstanceMatrix(satellite: PitSatellite): void {
    this.tempPosition3.set(
      satellite.position.x,
      satellite.position.y,
      0
    );
    this.tempQuat.setFromAxisAngle(this.zAxis, 0);
    this.tempScale3.setScalar(1);
    this.tempMatrix.compose(
      this.tempPosition3,
      this.tempQuat,
      this.tempScale3
    );
    this.instancedMesh.setMatrixAt(
      satellite.instanceIndex,
      this.tempMatrix
    );
  }

  public dispose(): void {
    this.scene.remove(this.instancedMesh);
    this.geometry.dispose();
    this.material.dispose();
  }
}

