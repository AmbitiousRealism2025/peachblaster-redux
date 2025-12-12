import * as THREE from "three";
import SceneManager from "../rendering/SceneManager";
import type { InputManager } from "../input/InputManager";
import PhysicsSystem from "../systems/PhysicsSystem";
import BulletManager from "./BulletManager";
import type ParticleSystem from "../rendering/ParticleSystem";
import SFXManager from "../audio/SFXManager";
import {
  BULLET_FIRE_COOLDOWN_SECONDS,
  BULLET_SPEED,
  PARTICLE_SPEED_MIN,
  PARTICLE_THRUSTER_EMIT_RATE,
  SHIP_DAMPING,
  SHIP_INVULNERABILITY_BLINK_INTERVAL,
  SHIP_INVULNERABILITY_DURATION,
  SHIP_MAX_SPEED,
  SHIP_ROTATION_SPEED,
  SHIP_SIZE,
  SHIP_THRUST_ACCELERATION,
  WORLD_WRAP_PADDING
} from "../config/tuning";

export default class Ship {
  public position = new THREE.Vector2(0, 0);
  public velocity = new THREE.Vector2(0, 0);
  public rotation = Math.PI / 2;
  public isThrusting = false;

  private invulnerable = false;
  private invulnerabilityTimer = 0;
  private blinkTimer = 0;

  private wasThrustingLastFrame = false;
  private fireCooldown = 0;
  private bulletManager: BulletManager | null = null;
  private particleSystem: ParticleSystem | null = null;
  private thrusterEmitTimer = 0;
  private readonly thrusterOffset = new THREE.Vector2();
  private readonly thrusterPosition = new THREE.Vector2();
  private readonly thrusterDirection = new THREE.Vector2();
  private readonly thrusterVelocity = new THREE.Vector2();
  private readonly thrusterColor = new THREE.Color(0xff6600);

  public mesh: THREE.Mesh;
  public thrusterMesh: THREE.Mesh;

  private scene: THREE.Scene;

  constructor(sceneManager: SceneManager) {
    this.scene = sceneManager.getScene();

    const size = SHIP_SIZE;
    const vertices = new Float32Array([
      size,
      0,
      0,
      -size * 0.6,
      size * 0.6,
      0,
      -size * 0.6,
      -size * 0.6,
      0
    ]);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      color: 0x00ff88,
      roughness: 0.4,
      metalness: 0.1
    });

    this.mesh = new THREE.Mesh(geometry, material);

    const thrusterVertices = new Float32Array([
      -size * 0.5,
      0,
      0,
      -size * 0.9,
      size * 0.25,
      0,
      -size * 0.9,
      -size * 0.25,
      0
    ]);
    const thrusterGeometry = new THREE.BufferGeometry();
    thrusterGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(thrusterVertices, 3)
    );
    thrusterGeometry.computeVertexNormals();

    const thrusterMaterial = new THREE.MeshStandardMaterial({
      color: 0xffaa00,
      emissive: 0xff6600,
      emissiveIntensity: 0.9,
      roughness: 0.5
    });

    this.thrusterMesh = new THREE.Mesh(thrusterGeometry, thrusterMaterial);
    this.thrusterMesh.visible = false;
    this.mesh.add(this.thrusterMesh);

    this.scene.add(this.mesh);
    this.syncMesh();
  }

  public update(
    dt: number,
    inputManager: InputManager,
    camera: THREE.OrthographicCamera
  ): void {
    const thrusting = inputManager.isThrusting();
    const rotatingLeft = inputManager.isRotatingLeft();
    const rotatingRight = inputManager.isRotatingRight();

    const wasThrusting = this.wasThrustingLastFrame;
    this.wasThrustingLastFrame = thrusting;
    this.isThrusting = thrusting;

    if (thrusting && !wasThrusting) {
      SFXManager.getInstance().playThrust();
    } else if (!thrusting && wasThrusting) {
      SFXManager.getInstance().stopThrust();
    }

    if (thrusting) {
      PhysicsSystem.applyThrust(
        this.velocity,
        this.rotation,
        SHIP_THRUST_ACCELERATION,
        dt
      );
    }

    PhysicsSystem.applyDamping(this.velocity, SHIP_DAMPING);
    PhysicsSystem.clampSpeed(this.velocity, SHIP_MAX_SPEED);

    const rotationStep =
      THREE.MathUtils.degToRad(SHIP_ROTATION_SPEED) * dt;
    if (rotatingLeft) {
      this.rotation += rotationStep;
    }
    if (rotatingRight) {
      this.rotation -= rotationStep;
    }

    this.position.addScaledVector(this.velocity, dt);
    PhysicsSystem.wrapPosition(
      this.position,
      camera,
      WORLD_WRAP_PADDING
    );

    this.updateInvulnerability(dt);

    this.thrusterMesh.visible = this.isThrusting;

    if (this.isThrusting && this.particleSystem) {
      this.thrusterEmitTimer += dt;
      const emitInterval = 1.0 / PARTICLE_THRUSTER_EMIT_RATE;

      while (this.thrusterEmitTimer >= emitInterval) {
        this.thrusterOffset.set(
          Math.cos(this.rotation + Math.PI),
          Math.sin(this.rotation + Math.PI)
        );
        this.thrusterOffset.multiplyScalar(SHIP_SIZE * 0.5);

        this.thrusterPosition.copy(this.position).add(this.thrusterOffset);

        this.thrusterDirection.copy(this.thrusterOffset).normalize();
        this.thrusterVelocity
          .copy(this.velocity)
          .addScaledVector(
            this.thrusterDirection,
            -PARTICLE_SPEED_MIN * 0.5
          );

        this.particleSystem.emit(
          this.thrusterPosition,
          this.thrusterVelocity,
          this.thrusterColor,
          0.3
        );

        this.thrusterEmitTimer -= emitInterval;
      }
    }
    this.syncMesh();

    this.updateFiring(dt, inputManager);
  }

  public setBulletManager(manager: BulletManager): void {
    this.bulletManager = manager;
  }

  public setParticleSystem(particleSystem: ParticleSystem): void {
    this.particleSystem = particleSystem;
  }

  private updateFiring(dt: number, inputManager: InputManager): void {
    if (!this.bulletManager) {
      return;
    }

    this.fireCooldown = Math.max(0, this.fireCooldown - dt);

    if (!inputManager.isFiring() || this.fireCooldown > 0) {
      return;
    }

    const forwardDirection = new THREE.Vector2(
      Math.cos(this.rotation),
      Math.sin(this.rotation)
    );
    const spawnOffset = SHIP_SIZE * 0.8;
    const spawnPosition = this.position
      .clone()
      .addScaledVector(forwardDirection, spawnOffset);
    const bulletVelocity = this.velocity
      .clone()
      .addScaledVector(forwardDirection, BULLET_SPEED);

    this.bulletManager.spawn(spawnPosition, bulletVelocity);
    SFXManager.getInstance().playBulletFire();
    this.fireCooldown = BULLET_FIRE_COOLDOWN_SECONDS;
  }

  private updateInvulnerability(dt: number): void {
    if (!this.invulnerable) {
      return;
    }

    this.invulnerabilityTimer -= dt;
    this.blinkTimer -= dt;

    if (this.blinkTimer <= 0) {
      this.mesh.visible = !this.mesh.visible;
      this.blinkTimer = SHIP_INVULNERABILITY_BLINK_INTERVAL;
    }

    if (this.invulnerabilityTimer <= 0) {
      this.invulnerable = false;
      this.mesh.visible = true;
    }
  }

  private syncMesh(): void {
    this.mesh.position.set(this.position.x, this.position.y, 0);
    this.mesh.rotation.z = this.rotation;
  }

  public activateInvulnerability(): void {
    this.invulnerable = true;
    this.invulnerabilityTimer = SHIP_INVULNERABILITY_DURATION;
    this.blinkTimer = SHIP_INVULNERABILITY_BLINK_INTERVAL;
    this.mesh.visible = true;
  }

  public resetState(): void {
    this.invulnerable = false;
    this.invulnerabilityTimer = 0;
    this.blinkTimer = 0;
    this.thrusterEmitTimer = 0;
    this.wasThrustingLastFrame = false;
    this.isThrusting = false;
    this.mesh.visible = true;
    this.position.set(0, 0);
    this.velocity.set(0, 0);
    this.rotation = Math.PI / 2;
    this.syncMesh();
  }

  public isInvulnerable(): boolean {
    return this.invulnerable;
  }

  public getCollisionRadius(): number {
    return SHIP_SIZE * 0.5;
  }

  public dispose(): void {
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    const materials = Array.isArray(this.mesh.material)
      ? this.mesh.material
      : [this.mesh.material];
    for (const material of materials) {
      material.dispose();
    }
  }
}
