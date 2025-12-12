export default class BossHealthBar {
  private container!: HTMLDivElement;
  private fill!: HTMLDivElement;
  private enabled = true;

  constructor() {
    const overlay = document.getElementById("ui-overlay");
    if (!overlay) {
      console.error(
        "UI overlay container (#ui-overlay) not found. BossHealthBar disabled.",
      );
      this.enabled = false;
      return;
    }

    this.container = document.createElement("div");
    this.container.id = "boss-health-bar";
    this.container.className = "boss-health-bar";

    this.fill = document.createElement("div");
    this.fill.className = "health-fill";

    this.container.appendChild(this.fill);
    overlay.appendChild(this.container);

    this.hide();
  }

  public show(): void {
    if (!this.enabled) return;
    this.container.style.display = "block";
  }

  public hide(): void {
    if (!this.enabled) return;
    this.container.style.display = "none";
  }

  public updateHealth(current: number, max: number): void {
    if (!this.enabled) return;
    const clampedMax = Math.max(1, max);
    const percent = Math.max(0, Math.min(1, current / clampedMax));
    this.fill.style.width = `${percent * 100}%`;
  }

  public dispose(): void {
    if (!this.enabled) return;
    this.container.remove();
  }
}
