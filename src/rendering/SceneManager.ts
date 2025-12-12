import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { VignetteShader } from "./VignetteShader";
import { ChromaticAberrationShader } from "./ChromaticAberrationShader";
import {
  BLOOM_RADIUS,
  BLOOM_STRENGTH_HIGH,
  BLOOM_STRENGTH_MEDIUM,
  BLOOM_THRESHOLD,
  CHROMATIC_ABERRATION_OFFSET,
  SCREEN_SHAKE_DECAY_RATE,
  VIGNETTE_DARKNESS,
  VIGNETTE_OFFSET
} from "../config/tuning";

export default class SceneManager {
  private readonly baseHalfHeight = 10;

  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private composer: EffectComposer;
  private renderPass: RenderPass;
  private bloomPass: UnrealBloomPass;
  private vignettePass: ShaderPass;
  private chromaticAberrationPass: ShaderPass;
  private currentQuality: "low" | "medium" | "high" = "medium";
  private composerNeedsReset = false;
  private readonly composerResetSize = new THREE.Vector2(0, 0);
  private shakeOffset = new THREE.Vector2(0, 0);
  private shakeIntensity = 0;
  private readonly basePosition = new THREE.Vector3(0, 0, 10);

  constructor(canvasId = "game-canvas") {
    const canvasElement = document.getElementById(canvasId);
    if (!(canvasElement instanceof HTMLCanvasElement)) {
      throw new Error(`Canvas element #${canvasId} not found`);
    }

    this.canvas = canvasElement;
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    this.camera = new THREE.OrthographicCamera(
      -10,
      10,
      10,
      -10,
      0.1,
      1000
    );
    this.camera.position.copy(this.basePosition);

    this.composer = new EffectComposer(this.renderer);

    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      BLOOM_STRENGTH_HIGH,
      BLOOM_RADIUS,
      BLOOM_THRESHOLD
    );
    this.composer.addPass(this.bloomPass);

    this.vignettePass = new ShaderPass(VignetteShader);
    this.composer.addPass(this.vignettePass);

    this.chromaticAberrationPass = new ShaderPass(ChromaticAberrationShader);
    this.composer.addPass(this.chromaticAberrationPass);

    this.applyQualityPreset("medium");

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
    directionalLight.position.set(6, 10, 8);
    this.scene.add(directionalLight);

    this.resize(window.innerWidth, window.innerHeight);
  }

  public resize(width: number, height: number): void {
    const safeWidth = Math.max(1, width);
    const safeHeight = Math.max(1, height);
    const aspect = safeWidth / safeHeight;
    const halfHeight = this.baseHalfHeight;
    const halfWidth = halfHeight * aspect;

    this.camera.left = -halfWidth;
    this.camera.right = halfWidth;
    this.camera.top = halfHeight;
    this.camera.bottom = -halfHeight;
    this.camera.updateProjectionMatrix();

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(safeWidth, safeHeight, false);

    this.composer.setSize(safeWidth, safeHeight);
    this.bloomPass.resolution.set(safeWidth, safeHeight);
  }

  public screenToWorld(screenX: number, screenY: number): THREE.Vector3 {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      // Canvas can be temporarily zero-sized during layout changes.
      return new THREE.Vector3(0, 0, 0);
    }
    const normalizedX = ((screenX - rect.left) / rect.width) * 2 - 1;
    const normalizedY = -((screenY - rect.top) / rect.height) * 2 + 1;

    const worldPosition = new THREE.Vector3(normalizedX, normalizedY, 0);
    worldPosition.unproject(this.camera);
    return worldPosition;
  }

  public worldToScreen(
    worldX: number,
    worldY: number
  ): { x: number; y: number } {
    const projected = new THREE.Vector3(worldX, worldY, 0).project(this.camera);
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      // Canvas can be temporarily zero-sized during layout changes.
      return { x: rect.left, y: rect.top };
    }

    return {
      x: ((projected.x + 1) / 2) * rect.width + rect.left,
      y: ((-projected.y + 1) / 2) * rect.height + rect.top
    };
  }

  public getCamera(): THREE.OrthographicCamera {
    return this.camera;
  }

  public getScene(): THREE.Scene {
    return this.scene;
  }

  public getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  public addScreenShake(intensity: number): void {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
  }

  public updateScreenShake(dt: number): void {
    if (this.shakeIntensity > 0) {
      this.shakeOffset
        .set(Math.random() * 2 - 1, Math.random() * 2 - 1)
        .multiplyScalar(this.shakeIntensity);

      this.camera.position.set(
        this.basePosition.x + this.shakeOffset.x,
        this.basePosition.y + this.shakeOffset.y,
        this.basePosition.z
      );

      this.shakeIntensity = Math.max(
        0,
        this.shakeIntensity - SCREEN_SHAKE_DECAY_RATE * dt
      );
      return;
    }

    this.camera.position.copy(this.basePosition);
  }

  public setQuality(preset: "low" | "medium" | "high"): void {
    const previousQuality = this.currentQuality;
    this.currentQuality = preset;
    if (previousQuality === "low" && preset !== "low") {
      this.composerNeedsReset = true;
    }
    this.applyQualityPreset(preset);
  }

  private applyQualityPreset(preset: "low" | "medium" | "high"): void {
    if (preset === "low") {
      this.bloomPass.enabled = false;
      this.vignettePass.enabled = false;
      this.chromaticAberrationPass.enabled = false;
      return;
    }

    if (preset === "medium") {
      this.bloomPass.enabled = true;
      this.vignettePass.enabled = true;
      this.chromaticAberrationPass.enabled = false;

      this.bloomPass.strength = BLOOM_STRENGTH_MEDIUM;
      this.bloomPass.radius = BLOOM_RADIUS;
      this.bloomPass.threshold = BLOOM_THRESHOLD;

      this.vignettePass.uniforms["offset"].value = VIGNETTE_OFFSET;
      this.vignettePass.uniforms["darkness"].value = VIGNETTE_DARKNESS;
      this.chromaticAberrationPass.uniforms["offset"].value = 0;
      return;
    }

    this.bloomPass.enabled = true;
    this.vignettePass.enabled = true;
    this.chromaticAberrationPass.enabled = true;

    this.bloomPass.strength = BLOOM_STRENGTH_HIGH;
    this.bloomPass.radius = BLOOM_RADIUS;
    this.bloomPass.threshold = BLOOM_THRESHOLD;

    this.vignettePass.uniforms["offset"].value = VIGNETTE_OFFSET;
    this.vignettePass.uniforms["darkness"].value = VIGNETTE_DARKNESS;
    this.chromaticAberrationPass.uniforms["offset"].value =
      CHROMATIC_ABERRATION_OFFSET;
  }

  public render(): void {
    if (this.currentQuality === "low") {
      this.renderer.render(this.scene, this.camera);
      return;
    }

    if (this.composerNeedsReset) {
      this.composer.reset();
      this.renderer.getSize(this.composerResetSize);
      this.composer.setSize(
        this.composerResetSize.x,
        this.composerResetSize.y
      );
      this.composerNeedsReset = false;
    }

    this.composer.render();
  }
}
