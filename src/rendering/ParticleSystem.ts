import * as THREE from "three";
import SceneManager from "./SceneManager";
import ObjectPool from "../systems/ObjectPool";
import PhysicsSystem from "../systems/PhysicsSystem";
import {
  PARTICLE_GRAVITY,
  PARTICLE_LIFETIME_SECONDS,
  PARTICLE_SIZE,
  PARTICLE_SPEED_MAX,
  PARTICLE_SPEED_MIN
} from "../config/tuning";

class Particle {
  public position = new THREE.Vector2();
  public velocity = new THREE.Vector2();
  public lifetime = 0;
  public maxLifetime = 0;
  public color = new THREE.Color();
  public active = false;
  public instanceIndex = -1;
  public usesGravity = false;
}

export default class ParticleSystem {
  private pool: ObjectPool<Particle>;
  private points: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private scene: THREE.Scene;

  private positionAttribute: THREE.BufferAttribute;
  private colorAttribute: THREE.BufferAttribute;
  private sizeAttribute: THREE.BufferAttribute;

  private readonly tempColor = new THREE.Color();
  private readonly tempVelocity = new THREE.Vector2();
  private readonly gravityVector = new THREE.Vector2(0, PARTICLE_GRAVITY);
  private readonly hiddenPosition = new THREE.Vector3(0, 0, -1000);

  constructor(sceneManager: SceneManager, capacity: number) {
    this.scene = sceneManager.getScene();

    const particles: Particle[] = [];
    for (let index = 0; index < capacity; index += 1) {
      const particle = new Particle();
      particle.instanceIndex = index;
      particles.push(particle);
    }
    this.pool = new ObjectPool<Particle>(particles);

    this.geometry = new THREE.BufferGeometry();

    const positions = new Float32Array(capacity * 3);
    const colors = new Float32Array(capacity * 3);
    const sizes = new Float32Array(capacity);

    for (let index = 0; index < capacity; index += 1) {
      const baseIndex = index * 3;
      positions[baseIndex] = this.hiddenPosition.x;
      positions[baseIndex + 1] = this.hiddenPosition.y;
      positions[baseIndex + 2] = this.hiddenPosition.z;
      colors[baseIndex] = 0;
      colors[baseIndex + 1] = 0;
      colors[baseIndex + 2] = 0;
      sizes[index] = PARTICLE_SIZE;
    }

    this.positionAttribute = new THREE.BufferAttribute(positions, 3);
    this.positionAttribute.setUsage(THREE.DynamicDrawUsage);
    this.colorAttribute = new THREE.BufferAttribute(colors, 3);
    this.colorAttribute.setUsage(THREE.DynamicDrawUsage);
    this.sizeAttribute = new THREE.BufferAttribute(sizes, 1);
    this.sizeAttribute.setUsage(THREE.DynamicDrawUsage);

    this.geometry.setAttribute("position", this.positionAttribute);
    this.geometry.setAttribute("color", this.colorAttribute);
    this.geometry.setAttribute("size", this.sizeAttribute);

    this.material = new THREE.PointsMaterial({
      vertexColors: true,
      sizeAttenuation: true,
      transparent: true,
      size: PARTICLE_SIZE
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.points);
  }

  public emit(
    position: THREE.Vector2,
    velocity: THREE.Vector2,
    color: THREE.Color,
    lifetime: number,
    usesGravity = false
  ): void {
    const particle = this.pool.acquire();
    if (!particle) {
      return;
    }

    particle.position.copy(position);
    particle.velocity.copy(velocity);
    particle.lifetime = lifetime;
    particle.maxLifetime = lifetime;
    particle.color.copy(color);
    particle.usesGravity = usesGravity;

    const index = particle.instanceIndex;
    this.positionAttribute.setXYZ(index, position.x, position.y, 0);
    this.colorAttribute.setXYZ(index, color.r, color.g, color.b);
    this.sizeAttribute.setX(index, PARTICLE_SIZE);
    this.positionAttribute.needsUpdate = true;
    this.colorAttribute.needsUpdate = true;
    this.sizeAttribute.needsUpdate = true;
  }

  public emitBurst(
    position: THREE.Vector2,
    count: number,
    speedMin: number,
    speedMax: number,
    color: THREE.Color,
    lifetime: number
  ): void {
    for (let index = 0; index < count; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed =
        speedMin + Math.random() * (speedMax - speedMin);
      this.tempVelocity.set(Math.cos(angle), Math.sin(angle));
      this.tempVelocity.multiplyScalar(speed);
      this.emit(position, this.tempVelocity, color, lifetime);
    }
  }

  public emitJuiceDroplets(
    position: THREE.Vector2,
    count: number,
    color: THREE.Color
  ): void {
    const minAngle = -Math.PI * 2 / 3;
    const maxAngle = -Math.PI / 3;

    for (let index = 0; index < count; index += 1) {
      const angle =
        minAngle + Math.random() * (maxAngle - minAngle);
      const speed =
        PARTICLE_SPEED_MIN +
        Math.random() * (PARTICLE_SPEED_MAX - PARTICLE_SPEED_MIN);
      this.tempVelocity.set(Math.cos(angle), Math.sin(angle));
      this.tempVelocity.multiplyScalar(speed);
      this.emit(
        position,
        this.tempVelocity,
        color,
        PARTICLE_LIFETIME_SECONDS,
        true
      );
    }
  }

  public update(
    dt: number,
    camera: THREE.OrthographicCamera
  ): void {
    const activeParticles = this.pool.getActive();
    let anyUpdated = false;

    for (let index = activeParticles.length - 1; index >= 0; index -= 1) {
      const particle = activeParticles[index];

      particle.lifetime -= dt;
      if (particle.lifetime <= 0) {
        this.pool.release(particle);
        this.hideParticle(particle);
        anyUpdated = true;
        continue;
      }

      if (particle.usesGravity) {
        particle.velocity.addScaledVector(this.gravityVector, dt);
      }

      particle.position.addScaledVector(particle.velocity, dt);
      PhysicsSystem.wrapPosition(particle.position, camera);

      const alpha = particle.lifetime / particle.maxLifetime;
      this.tempColor.copy(particle.color).multiplyScalar(alpha);

      const bufferIndex = particle.instanceIndex;
      this.positionAttribute.setXYZ(
        bufferIndex,
        particle.position.x,
        particle.position.y,
        0
      );
      this.colorAttribute.setXYZ(
        bufferIndex,
        this.tempColor.r,
        this.tempColor.g,
        this.tempColor.b
      );
      anyUpdated = true;
    }

    if (anyUpdated) {
      this.positionAttribute.needsUpdate = true;
      this.colorAttribute.needsUpdate = true;
    }
  }

  private hideParticle(particle: Particle): void {
    const index = particle.instanceIndex;
    this.positionAttribute.setXYZ(
      index,
      this.hiddenPosition.x,
      this.hiddenPosition.y,
      this.hiddenPosition.z
    );
    this.colorAttribute.setXYZ(index, 0, 0, 0);
  }

  public dispose(): void {
    this.scene.remove(this.points);
    this.geometry.dispose();
    this.material.dispose();
  }
}

