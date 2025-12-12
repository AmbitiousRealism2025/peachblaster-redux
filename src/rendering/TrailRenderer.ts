import * as THREE from "three";
import SceneManager from "./SceneManager";
import {
  PARTICLE_LIFETIME_SECONDS,
  TRAIL_FADE_SPEED
} from "../config/tuning";

interface TrailPoint {
  position: THREE.Vector2;
  age: number;
}

export default class TrailRenderer {
  private readonly points: TrailPoint[];
  private readonly maxLength: number;
  private readonly emitInterval: number;
  private emitTimer = 0;

  private line: THREE.Line;
  private geometry: THREE.BufferGeometry;
  private material: THREE.LineBasicMaterial;
  private scene: THREE.Scene;

  private positionAttribute: THREE.BufferAttribute;
  private colorAttribute: THREE.BufferAttribute;
  private readonly baseColor: THREE.Color;
  private readonly tempColor = new THREE.Color();
  private readonly hiddenPosition = new THREE.Vector3(0, 0, -1000);

  constructor(
    sceneManager: SceneManager,
    maxLength: number,
    color: THREE.Color,
    emitInterval: number
  ) {
    this.scene = sceneManager.getScene();
    this.maxLength = maxLength;
    this.emitInterval = emitInterval;
    this.baseColor = color.clone();

    this.points = new Array<TrailPoint>(maxLength);
    for (let index = 0; index < maxLength; index += 1) {
      this.points[index] = {
        position: new THREE.Vector2(),
        age: Number.POSITIVE_INFINITY
      };
    }

    this.geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(maxLength * 3);
    const colors = new Float32Array(maxLength * 3);

    for (let index = 0; index < maxLength; index += 1) {
      const baseIndex = index * 3;
      positions[baseIndex] = this.hiddenPosition.x;
      positions[baseIndex + 1] = this.hiddenPosition.y;
      positions[baseIndex + 2] = this.hiddenPosition.z;
      colors[baseIndex] = 0;
      colors[baseIndex + 1] = 0;
      colors[baseIndex + 2] = 0;
    }

    this.positionAttribute = new THREE.BufferAttribute(positions, 3);
    this.positionAttribute.setUsage(THREE.DynamicDrawUsage);
    this.colorAttribute = new THREE.BufferAttribute(colors, 3);
    this.colorAttribute.setUsage(THREE.DynamicDrawUsage);

    this.geometry.setAttribute("position", this.positionAttribute);
    this.geometry.setAttribute("color", this.colorAttribute);

    this.material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true
    });

    this.line = new THREE.Line(this.geometry, this.material);
    this.line.visible = false;
    this.scene.add(this.line);
  }

  public addPoint(position: THREE.Vector2, dt: number): void {
    this.emitTimer += dt;
    if (this.emitTimer < this.emitInterval) {
      return;
    }

    while (this.emitTimer >= this.emitInterval) {
      const recycled = this.points.pop();
      if (recycled) {
        recycled.position.copy(position);
        recycled.age = 0;
        this.points.unshift(recycled);
      }
      this.emitTimer -= this.emitInterval;
    }

    this.line.visible = true;
  }

  public update(dt: number): void {
    const maxAge = PARTICLE_LIFETIME_SECONDS;
    let anyActive = false;

    for (let index = 0; index < this.maxLength; index += 1) {
      const point = this.points[index];
      if (point.age !== Number.POSITIVE_INFINITY) {
        point.age += dt * TRAIL_FADE_SPEED;
      }

      const alpha = 1 - point.age / maxAge;
      const clampedAlpha = Math.max(0, Math.min(1, alpha));
      if (clampedAlpha > 0) {
        anyActive = true;
        this.positionAttribute.setXYZ(
          index,
          point.position.x,
          point.position.y,
          0
        );
        this.tempColor.copy(this.baseColor).multiplyScalar(clampedAlpha);
        this.colorAttribute.setXYZ(
          index,
          this.tempColor.r,
          this.tempColor.g,
          this.tempColor.b
        );
      } else {
        point.age = Number.POSITIVE_INFINITY;
        this.positionAttribute.setXYZ(
          index,
          this.hiddenPosition.x,
          this.hiddenPosition.y,
          this.hiddenPosition.z
        );
        this.colorAttribute.setXYZ(index, 0, 0, 0);
      }
    }

    if (anyActive) {
      this.positionAttribute.needsUpdate = true;
      this.colorAttribute.needsUpdate = true;
    } else {
      this.line.visible = false;
    }
  }

  public clear(): void {
    for (let index = 0; index < this.maxLength; index += 1) {
      const point = this.points[index];
      point.age = Number.POSITIVE_INFINITY;
      this.positionAttribute.setXYZ(
        index,
        this.hiddenPosition.x,
        this.hiddenPosition.y,
        this.hiddenPosition.z
      );
      this.colorAttribute.setXYZ(index, 0, 0, 0);
    }
    this.positionAttribute.needsUpdate = true;
    this.colorAttribute.needsUpdate = true;
    this.line.visible = false;
  }

  public dispose(): void {
    this.scene.remove(this.line);
    this.geometry.dispose();
    this.material.dispose();
  }
}

