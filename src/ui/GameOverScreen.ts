type GameOverStats = {
  score: number;
  peachesDestroyed: number;
  wavesCleared: number;
};

type GameOverScreenCallbacks = {
  onRetry: () => void;
  onMainMenu: () => void;
};

export default class GameOverScreen {
  private container!: HTMLDivElement;
  private statsElement!: HTMLDivElement;
  private retryButton!: HTMLButtonElement;
  private menuButton!: HTMLButtonElement;

  private readonly callbacks: GameOverScreenCallbacks;
  private enabled = true;

  private readonly onRetryClick = (): void => {
    this.callbacks.onRetry();
  };

  private readonly onMenuClick = (): void => {
    this.callbacks.onMainMenu();
  };

  constructor(callbacks: GameOverScreenCallbacks) {
    this.callbacks = callbacks;

    const overlay = document.getElementById("ui-overlay");
    if (!overlay) {
      console.error(
        "UI overlay container (#ui-overlay) not found. GameOverScreen disabled.",
      );
      this.enabled = false;
      return;
    }

    this.container = document.createElement("div");
    this.container.id = "game-over-screen";
    this.container.style.display = "none";

    const title = document.createElement("div");
    title.className = "game-over-title";
    title.textContent = "GAME OVER";

    this.statsElement = document.createElement("div");
    this.statsElement.className = "game-over-stats";

    this.retryButton = document.createElement("button");
    this.retryButton.className = "game-over-button";
    this.retryButton.textContent = "Retry";
    this.retryButton.addEventListener("click", this.onRetryClick);

    this.menuButton = document.createElement("button");
    this.menuButton.className = "game-over-button";
    this.menuButton.textContent = "Main Menu";
    this.menuButton.addEventListener("click", this.onMenuClick);

    this.container.appendChild(title);
    this.container.appendChild(this.statsElement);
    this.container.appendChild(this.retryButton);
    this.container.appendChild(this.menuButton);
    overlay.appendChild(this.container);
  }

  public show(stats: GameOverStats): void {
    if (!this.enabled) return;
    this.statsElement.innerHTML = "";

    const score = document.createElement("div");
    score.textContent = `Final Score: ${stats.score}`;

    const peaches = document.createElement("div");
    peaches.textContent = `Peaches Destroyed: ${stats.peachesDestroyed}`;

    const waves = document.createElement("div");
    waves.textContent = `Waves Cleared: ${stats.wavesCleared}`;

    this.statsElement.appendChild(score);
    this.statsElement.appendChild(peaches);
    this.statsElement.appendChild(waves);

    this.container.style.display = "flex";
    this.retryButton.focus();
  }

  public hide(): void {
    if (!this.enabled) return;
    this.container.style.display = "none";
  }

  public dispose(): void {
    if (!this.enabled) return;
    this.retryButton.removeEventListener("click", this.onRetryClick);
    this.menuButton.removeEventListener("click", this.onMenuClick);
    this.container.remove();
  }
}
