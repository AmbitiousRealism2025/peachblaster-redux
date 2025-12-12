import * as THREE from "three";
import "./MobileControls.css";

export default class MobileControls {
  private container: HTMLDivElement;
  private joystickArea: HTMLDivElement;
  private joystickKnob: HTMLDivElement;
  private fireButton: HTMLDivElement;

  private joystickDirection: THREE.Vector2 | null = null;
  private joystickCenter: THREE.Vector2 | null = null;
  private firePressed = false;

  constructor(containerId = "mobile-controls") {
    const existing = document.getElementById(containerId);
    if (existing instanceof HTMLDivElement) {
      this.container = existing;
    } else {
      this.container = document.createElement("div");
      this.container.id = containerId;
      this.container.className = "mobile-controls";
      document.body.appendChild(this.container);
    }

    this.joystickArea = document.createElement("div");
    this.joystickArea.className = "joystick-area";

    this.joystickKnob = document.createElement("div");
    this.joystickKnob.className = "joystick-knob";
    this.joystickArea.appendChild(this.joystickKnob);

    this.fireButton = document.createElement("div");
    this.fireButton.className = "fire-button";

    this.container.appendChild(this.joystickArea);
    this.container.appendChild(this.fireButton);

    this.attachTouchHandlers();

    const isTouchDevice =
      "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (isTouchDevice) {
      this.show();
    } else {
      this.hide();
    }
  }

  private attachTouchHandlers(): void {
    this.joystickArea.addEventListener(
      "touchstart",
      event => {
        event.preventDefault();
        event.stopPropagation();
        const touch = event.touches[0];
        const rect = this.joystickArea.getBoundingClientRect();
        this.joystickCenter = new THREE.Vector2(
          rect.left + rect.width / 2,
          rect.top + rect.height / 2
        );
        this.updateJoystickFromTouch(touch.clientX, touch.clientY);
      },
      { passive: false }
    );

    this.joystickArea.addEventListener(
      "touchmove",
      event => {
        event.preventDefault();
        event.stopPropagation();
        const touch = event.touches[0];
        this.updateJoystickFromTouch(touch.clientX, touch.clientY);
      },
      { passive: false }
    );

    const resetJoystick = (event: TouchEvent): void => {
      event.preventDefault();
      event.stopPropagation();
      this.joystickDirection = null;
      this.joystickCenter = null;
      this.joystickKnob.style.transform = "translate(0px, 0px)";
    };

    this.joystickArea.addEventListener("touchend", resetJoystick, {
      passive: false
    });
    this.joystickArea.addEventListener("touchcancel", resetJoystick, {
      passive: false
    });

    this.fireButton.addEventListener(
      "touchstart",
      event => {
        event.preventDefault();
        event.stopPropagation();
        this.firePressed = true;
        this.fireButton.classList.add("pressed");
      },
      { passive: false }
    );

    const releaseFire = (event: TouchEvent): void => {
      event.preventDefault();
      event.stopPropagation();
      this.firePressed = false;
      this.fireButton.classList.remove("pressed");
    };

    this.fireButton.addEventListener("touchend", releaseFire, {
      passive: false
    });
    this.fireButton.addEventListener("touchcancel", releaseFire, {
      passive: false
    });
  }

  private updateJoystickFromTouch(x: number, y: number): void {
    if (!this.joystickCenter) {
      return;
    }

    const delta = new THREE.Vector2(x, y).sub(this.joystickCenter);
    const radius = this.joystickArea.clientWidth / 2;
    const clamped = delta.clone();
    if (clamped.length() > radius) {
      clamped.setLength(radius);
    }

    const deadzone = radius * 0.15;
    if (clamped.length() <= deadzone) {
      this.joystickDirection = null;
    } else {
      this.joystickDirection = clamped.clone().normalize();
    }

    this.joystickKnob.style.transform = `translate(${clamped.x}px, ${clamped.y}px)`;
  }

  public getJoystickDirection(): THREE.Vector2 | null {
    return this.joystickDirection ? this.joystickDirection.clone() : null;
  }

  public isFirePressed(): boolean {
    return this.firePressed;
  }

  public show(): void {
    this.container.hidden = false;
  }

  public hide(): void {
    this.container.hidden = true;
  }
}

