export default class ScoreDisplay {
  private container!: HTMLDivElement;
  private enabled = true;

  constructor() {
    const overlay = document.getElementById("ui-overlay");
    if (!overlay) {
      console.error(
        "UI overlay container (#ui-overlay) not found. ScoreDisplay disabled.",
      );
      this.enabled = false;
      return;
    }

    this.container = document.createElement("div");
    this.container.id = "score-display";
    overlay.appendChild(this.container);
  }

  public update(score: number): void {
    if (!this.enabled) return;
    this.container.textContent = `Score: ${score}`;
  }

  public dispose(): void {
    if (!this.enabled) return;
    this.container.remove();
  }
}
