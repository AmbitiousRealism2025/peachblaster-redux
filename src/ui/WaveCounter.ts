export default class WaveCounter {
  private container: HTMLDivElement;

  constructor() {
    const overlay = document.getElementById("ui-overlay");
    if (!overlay) {
      throw new Error("UI overlay container (#ui-overlay) not found.");
    }

    this.container = document.createElement("div");
    this.container.id = "wave-counter";
    this.container.style.display = "none";
    overlay.appendChild(this.container);
  }

  public update(current: number, total: number): void {
    this.container.textContent = `Wave ${current} / ${total}`;
  }

  public show(): void {
    this.container.style.display = "block";
  }

  public hide(): void {
    this.container.style.display = "none";
  }

  public dispose(): void {
    this.container.remove();
  }
}

