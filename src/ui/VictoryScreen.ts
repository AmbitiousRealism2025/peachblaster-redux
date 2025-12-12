type VictoryStats = {
  score: number;
  peachesDestroyed: number;
  timeSeconds: number;
};

type VictoryScreenCallbacks = {
  onPlayAgain: () => void;
  onMainMenu: () => void;
};

export default class VictoryScreen {
  private container!: HTMLDivElement;
  private statsElement!: HTMLDivElement;
  private playAgainButton!: HTMLButtonElement;
  private menuButton!: HTMLButtonElement;

  private readonly callbacks: VictoryScreenCallbacks;
  private enabled = true;

  private readonly onPlayAgainClick = (): void => {
    this.callbacks.onPlayAgain();
  };

  private readonly onMenuClick = (): void => {
    this.callbacks.onMainMenu();
  };

  constructor(callbacks: VictoryScreenCallbacks) {
    this.callbacks = callbacks;

    const overlay = document.getElementById("ui-overlay");
    if (!overlay) {
      console.error(
        "UI overlay container (#ui-overlay) not found. VictoryScreen disabled.",
      );
      this.enabled = false;
      return;
    }

    this.container = document.createElement("div");
    this.container.id = "victory-screen";
    this.container.style.display = "none";

    const title = document.createElement("div");
    title.className = "victory-title";
    title.textContent = "VICTORY!";

    const subtitle = document.createElement("div");
    subtitle.className = "victory-subtitle";
    subtitle.textContent = "Campaign Complete";

    this.statsElement = document.createElement("div");
    this.statsElement.className = "victory-stats";

    this.playAgainButton = document.createElement("button");
    this.playAgainButton.className = "victory-button";
    this.playAgainButton.textContent = "Play Again";
    this.playAgainButton.addEventListener("click", this.onPlayAgainClick);

    this.menuButton = document.createElement("button");
    this.menuButton.className = "victory-button";
    this.menuButton.textContent = "Main Menu";
    this.menuButton.addEventListener("click", this.onMenuClick);

    this.container.appendChild(title);
    this.container.appendChild(subtitle);
    this.container.appendChild(this.statsElement);
    this.container.appendChild(this.playAgainButton);
    this.container.appendChild(this.menuButton);
    overlay.appendChild(this.container);
  }

  public show(stats: VictoryStats): void {
    if (!this.enabled) return;
    this.statsElement.innerHTML = "";

    const score = document.createElement("div");
    score.textContent = `Final Score: ${stats.score}`;

    const peaches = document.createElement("div");
    peaches.textContent = `Peaches Destroyed: ${stats.peachesDestroyed}`;

    const timeRow = document.createElement("div");
    timeRow.textContent = `Time: ${this.formatTime(stats.timeSeconds)}`;

    this.statsElement.appendChild(score);
    this.statsElement.appendChild(peaches);
    this.statsElement.appendChild(timeRow);

    this.container.style.display = "flex";
    this.playAgainButton.focus();
  }

  public hide(): void {
    if (!this.enabled) return;
    this.container.style.display = "none";
  }

  public dispose(): void {
    if (!this.enabled) return;
    this.playAgainButton.removeEventListener("click", this.onPlayAgainClick);
    this.menuButton.removeEventListener("click", this.onMenuClick);
    this.container.remove();
  }

  private formatTime(timeSeconds: number): string {
    const clampedSeconds = Math.max(0, timeSeconds);
    const minutes = Math.floor(clampedSeconds / 60);
    const seconds = Math.floor(clampedSeconds % 60)
      .toString()
      .padStart(2, "0");
    return `${minutes}:${seconds}`;
  }
}
