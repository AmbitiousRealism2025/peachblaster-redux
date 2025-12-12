export default class ScoreDisplay {
  private container: HTMLDivElement;

  constructor() {
    const overlay = document.getElementById("ui-overlay");
    if (!overlay) {
      throw new Error("UI overlay container (#ui-overlay) not found.");
    }

    this.container = document.createElement("div");
    this.container.id = "score-display";
    overlay.appendChild(this.container);
  }

  public update(score: number): void {
    this.container.textContent = `Score: ${score}`;
  }

  public dispose(): void {
    this.container.remove();
  }
}

