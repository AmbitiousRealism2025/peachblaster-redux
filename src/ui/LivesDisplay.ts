export default class LivesDisplay {
  private container: HTMLDivElement;

  constructor() {
    const overlay = document.getElementById("ui-overlay");
    if (!overlay) {
      throw new Error("UI overlay container (#ui-overlay) not found.");
    }

    this.container = document.createElement("div");
    this.container.id = "lives-display";
    overlay.appendChild(this.container);
  }

  public update(lives: number): void {
    this.container.innerHTML = "";

    for (let index = 0; index < lives; index += 1) {
      const icon = document.createElement("div");
      icon.className = "life-icon";
      icon.textContent = "▲";
      this.container.appendChild(icon);
    }
  }

  public dispose(): void {
    this.container.remove();
  }
}

