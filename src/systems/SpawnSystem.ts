import * as THREE from "three";
import PeachManager from "../entities/PeachManager";
import { PeachSize } from "../entities/Peach";
import {
  PEACH_MAX_DRIFT_SPEED,
  PEACH_MAX_ROTATION_SPEED,
  PEACH_MIN_DRIFT_SPEED,
  PEACH_MIN_ROTATION_SPEED,
  PEACH_SPAWN_SAFE_ZONE_RADIUS,
  WORLD_WRAP_PADDING
} from "../config/tuning";

export type SpawnPattern = "edge" | "ring" | "line" | "scattered";

export type WaveConfig = {
  count: number;
  sizes: PeachSize[];
  interval: number;
  pattern?: SpawnPattern;
};

export default class SpawnSystem {
  // `waveActive` stays true while spawning is ongoing or peaches remain alive.
  public waveActive = false;
  public spawnTimer = 0;
  public spawnInterval = 0;

  private remainingToSpawn = 0;
  private totalToSpawn = 0;
  private spawnedCount = 0;
  private sizes: PeachSize[] = [];
  private pattern: SpawnPattern = "edge";
  private lineEdge: number | null = null;
  private readonly tempCenter = new THREE.Vector2();
  private readonly tempSpawnPosition = new THREE.Vector2();
  private readonly tempDirection = new THREE.Vector2();
  private readonly tempInward = new THREE.Vector2();
  private readonly tempTangent = new THREE.Vector2();
  private readonly tempVelocity = new THREE.Vector2();

  constructor(
    private peachManager: PeachManager,
    private camera: THREE.OrthographicCamera
  ) {}

  public startWave(config: WaveConfig): void {
    this.waveActive = true;
    this.remainingToSpawn = config.count;
    this.totalToSpawn = config.count;
    this.spawnedCount = 0;
    this.sizes = config.sizes;
    this.spawnInterval = config.interval;
    this.spawnTimer = 0;
    this.pattern = config.pattern ?? "edge";
    this.lineEdge = this.pattern === "line" ? Math.floor(Math.random() * 4) : null;
  }

  public update(dt: number, shipPosition: THREE.Vector2): void {
    if (!this.waveActive) {
      return;
    }

    this.spawnTimer -= dt;

    while (this.spawnTimer <= 0 && this.remainingToSpawn > 0) {
      this.spawnOne(shipPosition);
      this.spawnedCount += 1;
      this.remainingToSpawn -= 1;
      this.spawnTimer += this.spawnInterval;
    }

    if (
      this.remainingToSpawn <= 0 &&
      this.peachManager.getActivePeaches().length === 0
    ) {
      this.waveActive = false;
    }
  }

  public stopWave(): void {
    this.waveActive = false;
    this.remainingToSpawn = 0;
    this.spawnTimer = 0;
  }

  public isWaveComplete(): boolean {
    return !this.waveActive;
  }

  private spawnOne(shipPosition: THREE.Vector2): void {
    if (this.pattern === "ring") {
      this.spawnRing(shipPosition, this.spawnedCount, this.totalToSpawn);
      return;
    }

    if (this.pattern === "line") {
      this.spawnLine(shipPosition, this.spawnedCount, this.totalToSpawn);
      return;
    }

    if (this.pattern === "scattered") {
      this.spawnScattered(shipPosition);
      return;
    }

    this.spawnEdge(shipPosition);
  }

  private spawnRing(
    shipPosition: THREE.Vector2,
    spawnIndex: number,
    totalCount: number
  ): void {
    const padding = WORLD_WRAP_PADDING;
    const left = this.camera.left - padding;
    const right = this.camera.right + padding;
    const top = this.camera.top + padding;
    const bottom = this.camera.bottom - padding;

    this.tempCenter.set((left + right) / 2, (top + bottom) / 2);
    const center = this.tempCenter;

    const maxHalfExtent = Math.max(
      Math.abs(this.camera.left),
      Math.abs(this.camera.right),
      Math.abs(this.camera.top),
      Math.abs(this.camera.bottom)
    );
    const radius = maxHalfExtent + THREE.MathUtils.randFloat(2, 4);

    const safeRadiusSq =
      PEACH_SPAWN_SAFE_ZONE_RADIUS * PEACH_SPAWN_SAFE_ZONE_RADIUS;

    const baseAngle = (spawnIndex / Math.max(1, totalCount)) * Math.PI * 2;
    let angle = baseAngle;

    const spawnPosition = this.tempSpawnPosition;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      angle = baseAngle + attempt * (Math.PI * 2) / Math.max(1, totalCount);
      spawnPosition.set(
        center.x + Math.cos(angle) * radius,
        center.y + Math.sin(angle) * radius
      );

      if (spawnPosition.distanceToSquared(shipPosition) >= safeRadiusSq) {
        break;
      }
    }

    this.tempInward.copy(center).sub(spawnPosition).normalize();
    this.tempTangent
      .set(-this.tempInward.y, this.tempInward.x)
      .multiplyScalar(THREE.MathUtils.randFloatSpread(0.6));
    this.tempDirection
      .copy(this.tempInward)
      .add(this.tempTangent)
      .normalize();

    this.spawnPeachAt(spawnPosition, this.tempDirection);
  }

  private spawnLine(
    shipPosition: THREE.Vector2,
    spawnIndex: number,
    totalCount: number
  ): void {
    const padding = WORLD_WRAP_PADDING;
    const left = this.camera.left - padding;
    const right = this.camera.right + padding;
    const top = this.camera.top + padding;
    const bottom = this.camera.bottom - padding;

    const safeRadiusSq =
      PEACH_SPAWN_SAFE_ZONE_RADIUS * PEACH_SPAWN_SAFE_ZONE_RADIUS;

    const edge = this.lineEdge ?? Math.floor(Math.random() * 4);
    const t = (spawnIndex + 0.5) / Math.max(1, totalCount);

    const spawnPosition = this.tempSpawnPosition;
    const direction = this.tempDirection;

    if (edge === 0) {
      spawnPosition.set(left, THREE.MathUtils.lerp(bottom, top, t));
      direction.set(1, THREE.MathUtils.randFloatSpread(0.2));
    } else if (edge === 1) {
      spawnPosition.set(right, THREE.MathUtils.lerp(bottom, top, t));
      direction.set(-1, THREE.MathUtils.randFloatSpread(0.2));
    } else if (edge === 2) {
      spawnPosition.set(THREE.MathUtils.lerp(left, right, t), top);
      direction.set(THREE.MathUtils.randFloatSpread(0.2), -1);
    } else {
      spawnPosition.set(THREE.MathUtils.lerp(left, right, t), bottom);
      direction.set(THREE.MathUtils.randFloatSpread(0.2), 1);
    }

    direction.normalize();

    if (spawnPosition.distanceToSquared(shipPosition) < safeRadiusSq) {
      this.spawnEdge(shipPosition);
      return;
    }

    this.spawnPeachAt(spawnPosition, direction);
  }

  private spawnScattered(shipPosition: THREE.Vector2): void {
    const safeRadiusSq =
      PEACH_SPAWN_SAFE_ZONE_RADIUS * PEACH_SPAWN_SAFE_ZONE_RADIUS;

    const left = this.camera.left;
    const right = this.camera.right;
    const top = this.camera.top;
    const bottom = this.camera.bottom;

    const spawnPosition = this.tempSpawnPosition;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      spawnPosition.set(
        THREE.MathUtils.randFloat(left, right),
        THREE.MathUtils.randFloat(bottom, top)
      );
      if (spawnPosition.distanceToSquared(shipPosition) >= safeRadiusSq) {
        break;
      }
    }

    const direction = this.tempDirection;
    direction.set(
      THREE.MathUtils.randFloatSpread(1),
      THREE.MathUtils.randFloatSpread(1)
    );
    if (direction.lengthSq() < 0.0001) {
      direction.set(1, 0);
    }
    direction.normalize();

    this.spawnPeachAt(spawnPosition, direction);
  }

  private spawnEdge(shipPosition: THREE.Vector2): void {
    const padding = WORLD_WRAP_PADDING;
    const left = this.camera.left - padding;
    const right = this.camera.right + padding;
    const top = this.camera.top + padding;
    const bottom = this.camera.bottom - padding;

    const safeRadiusSq =
      PEACH_SPAWN_SAFE_ZONE_RADIUS * PEACH_SPAWN_SAFE_ZONE_RADIUS;

    let edge = Math.floor(Math.random() * 4);
    const spawnPosition = this.tempSpawnPosition;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      edge = Math.floor(Math.random() * 4);

      if (edge === 0) {
        spawnPosition.set(left, THREE.MathUtils.randFloat(bottom, top));
      } else if (edge === 1) {
        spawnPosition.set(right, THREE.MathUtils.randFloat(bottom, top));
      } else if (edge === 2) {
        spawnPosition.set(THREE.MathUtils.randFloat(left, right), top);
      } else {
        spawnPosition.set(THREE.MathUtils.randFloat(left, right), bottom);
      }

      if (spawnPosition.distanceToSquared(shipPosition) >= safeRadiusSq) {
        break;
      }
    }

    const direction = this.tempDirection;
    if (edge === 0) {
      direction.set(1, THREE.MathUtils.randFloatSpread(1));
    } else if (edge === 1) {
      direction.set(-1, THREE.MathUtils.randFloatSpread(1));
    } else if (edge === 2) {
      direction.set(THREE.MathUtils.randFloatSpread(1), -1);
    } else {
      direction.set(THREE.MathUtils.randFloatSpread(1), 1);
    }
    direction.normalize();
    this.spawnPeachAt(spawnPosition, direction);
  }

  private spawnPeachAt(
    spawnPosition: THREE.Vector2,
    direction: THREE.Vector2
  ): void {
    const speed = THREE.MathUtils.randFloat(
      PEACH_MIN_DRIFT_SPEED,
      PEACH_MAX_DRIFT_SPEED
    );
    const velocity = this.tempVelocity.copy(direction).multiplyScalar(speed);

    const size =
      this.sizes.length > 0
        ? this.sizes[Math.floor(Math.random() * this.sizes.length)]
        : PeachSize.LARGE;

    const peach = this.peachManager.spawn(
      spawnPosition,
      velocity,
      size
    );

    if (peach) {
      const rotationDeg = THREE.MathUtils.randFloat(
        PEACH_MIN_ROTATION_SPEED,
        PEACH_MAX_ROTATION_SPEED
      );
      const rotationRad = THREE.MathUtils.degToRad(rotationDeg);
      peach.rotationSpeed =
        (Math.random() < 0.5 ? -1 : 1) * rotationRad;
    }
  }
}
