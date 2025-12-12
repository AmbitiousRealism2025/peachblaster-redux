import * as THREE from "three";
import type MobileControls from "../ui/MobileControls";

export class InputManager {
  private pressedKeys = new Set<string>();

  private touchStartPosition: THREE.Vector2 | null = null;
  private touchCurrentPosition: THREE.Vector2 | null = null;
  private touchDirection: THREE.Vector2 | null = null;
  private touchStartMs = 0;
  private touchFireFramesRemaining = 0;

  private mobileControls: MobileControls | null = null;

  private fireJustPressed = false;
  private wasFirePressed = false;

  private isTouchWithinMobileControls(event: TouchEvent): boolean {
    const mobileControlsContainer = document.getElementById("mobile-controls");
    if (!mobileControlsContainer) {
      return false;
    }
    const target = event.target;
    return target instanceof Node && mobileControlsContainer.contains(target);
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    this.pressedKeys.add(event.code);
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log("Key down:", event.code);
    }
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    this.pressedKeys.delete(event.code);
  };

  private readonly onTouchStart = (event: TouchEvent): void => {
    if (this.isTouchWithinMobileControls(event)) {
      return;
    }
    if (event.touches.length === 0) {
      return;
    }
    const touch = event.touches[0];
    this.touchStartPosition = new THREE.Vector2(touch.clientX, touch.clientY);
    this.touchCurrentPosition = this.touchStartPosition.clone();
    this.touchDirection = null;
    this.touchStartMs = performance.now();
  };

  private readonly onTouchMove = (event: TouchEvent): void => {
    if (this.isTouchWithinMobileControls(event)) {
      return;
    }
    if (!this.touchStartPosition || event.touches.length === 0) {
      return;
    }
    const touch = event.touches[0];
    this.touchCurrentPosition = new THREE.Vector2(
      touch.clientX,
      touch.clientY
    );

    const delta = this.touchCurrentPosition.clone().sub(this.touchStartPosition);
    const deadzonePx = 10;
    if (delta.length() < deadzonePx) {
      this.touchDirection = null;
      return;
    }

    this.touchDirection = delta.normalize();
  };

  private readonly onTouchEnd = (event: TouchEvent): void => {
    if (this.isTouchWithinMobileControls(event)) {
      return;
    }
    if (this.touchStartPosition && this.touchCurrentPosition) {
      const durationMs = performance.now() - this.touchStartMs;
      const delta = this.touchCurrentPosition
        .clone()
        .sub(this.touchStartPosition);
      const isTap = durationMs < 250 && delta.length() < 15;
      if (isTap) {
        this.touchFireFramesRemaining = 2;
      }
    }

    this.touchStartPosition = null;
    this.touchCurrentPosition = null;
    this.touchDirection = null;
  };

  constructor() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);

    // Global touch handlers provide swipe/tap gameplay controls as a fallback
    // for touch devices without the dedicated MobileControls overlay. UI touch
    // components like MobileControls are expected to stopPropagation() so these
    // listeners don't double-handle gestures.
    window.addEventListener("touchstart", this.onTouchStart, { passive: true });
    window.addEventListener("touchmove", this.onTouchMove, { passive: true });
    window.addEventListener("touchend", this.onTouchEnd);
    window.addEventListener("touchcancel", this.onTouchEnd);
  }

  public setMobileControls(controls: MobileControls | null): void {
    this.mobileControls = controls;
  }

  public isThrusting(): boolean {
    if (this.pressedKeys.has("KeyW") || this.pressedKeys.has("ArrowUp")) {
      return true;
    }

    const direction = this.getTouchDirection();
    return Boolean(direction && direction.y > 0.2);
  }

  public isRotatingLeft(): boolean {
    if (this.pressedKeys.has("KeyA") || this.pressedKeys.has("ArrowLeft")) {
      return true;
    }

    const direction = this.getTouchDirection();
    return Boolean(direction && direction.x < -0.2);
  }

  public isRotatingRight(): boolean {
    if (this.pressedKeys.has("KeyD") || this.pressedKeys.has("ArrowRight")) {
      return true;
    }

    const direction = this.getTouchDirection();
    return Boolean(direction && direction.x > 0.2);
  }

  public isFiring(): boolean {
    if (this.pressedKeys.has("Space")) {
      return true;
    }

    if (this.mobileControls?.isFirePressed()) {
      return true;
    }

    return this.touchFireFramesRemaining > 0;
  }

  /**
   * Returns true for exactly one frame when fire transitions from released to pressed.
   * Use this for tap-to-fire semantics.
   */
  public wasFireJustPressed(): boolean {
    return this.fireJustPressed;
  }

  /**
   * Returns true while fire input is actively held (not edge-detected).
   */
  private isFireCurrentlyHeld(): boolean {
    if (this.pressedKeys.has("Space")) {
      return true;
    }
    if (this.mobileControls?.isFirePressed()) {
      return true;
    }
    return false;
  }

  public getTouchDirection(): THREE.Vector2 | null {
    const direction =
      this.mobileControls?.getJoystickDirection() ?? this.touchDirection;
    return direction ? direction.clone() : null;
  }

  public update(): void {
    // Detect fire button press edge (released → pressed)
    const fireCurrentlyPressed = this.isFireCurrentlyHeld();
    this.fireJustPressed = fireCurrentlyPressed && !this.wasFirePressed;
    this.wasFirePressed = fireCurrentlyPressed;

    if (this.touchFireFramesRemaining > 0) {
      this.touchFireFramesRemaining -= 1;
    }
  }

  public dispose(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("touchstart", this.onTouchStart);
    window.removeEventListener("touchmove", this.onTouchMove);
    window.removeEventListener("touchend", this.onTouchEnd);
    window.removeEventListener("touchcancel", this.onTouchEnd);
    this.pressedKeys.clear();
  }
}

const inputManager = new InputManager();
export default inputManager;
