export default class WaveCounter {
  private container!: HTMLDivElement;
  private enabled = true;

  constructor() {
    const overlay = document.getElementById("ui-overlay");
    if (!overlay) {
      console.error(
        "UI overlay container (#ui-overlay) not found. WaveCounter disabled.",
      );
      this.enabled = false;
      return;
    }

    this.container = document.createElement("div");
    this.container.id = "wave-counter";
    this.container.style.display = "none";
    overlay.appendChild(this.container);
  }

  public update(current: number, total: number): void {
    if (!this.enabled) return;
    this.container.textContent = `Wave ${current} / ${total}`;
  }

  public show(): void {
    if (!this.enabled) return;
    this.container.style.display = "block";
  }

  public hide(): void {
    if (!this.enabled) return;
    this.container.style.display = "none";
  }

  public dispose(): void {
    if (!this.enabled) return;
    this.container.remove();
  }
}
