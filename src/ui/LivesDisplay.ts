export default class LivesDisplay {
  private container!: HTMLDivElement;
  private enabled = true;

  constructor() {
    const overlay = document.getElementById("ui-overlay");
    if (!overlay) {
      console.error(
        "UI overlay container (#ui-overlay) not found. LivesDisplay disabled.",
      );
      this.enabled = false;
      return;
    }

    this.container = document.createElement("div");
    this.container.id = "lives-display";
    overlay.appendChild(this.container);
  }

  public update(lives: number): void {
    if (!this.enabled) return;
    this.container.innerHTML = "";

    for (let index = 0; index < lives; index += 1) {
      const icon = document.createElement("div");
      icon.className = "life-icon";
      icon.textContent = "▲";
      this.container.appendChild(icon);
    }
  }

  public dispose(): void {
    if (!this.enabled) return;
    this.container.remove();
  }
}
