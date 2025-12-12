import LivesManager from "../core/LivesManager";
import { STARTING_LIVES } from "../config/tuning";

type RewardStats = {
  wavesCleared: number;
  peachesDestroyed: number;
};

type ChapterRewardResult = {
  lifeRestored: boolean;
};

export default class RewardScreen {
  private container: HTMLDivElement;
  private statsElement: HTMLDivElement;
  private continueButton: HTMLButtonElement;
  private resolveContinue: (() => void) | null = null;
  private livesManager: LivesManager | null = null;

  constructor() {
    const overlay = document.getElementById("ui-overlay");
    if (!overlay) {
      throw new Error("UI overlay container (#ui-overlay) not found.");
    }

    this.container = document.createElement("div");
    this.container.id = "reward-screen";
    this.container.style.display = "none";

    const title = document.createElement("div");
    title.className = "reward-screen-title";
    title.textContent = "Chapter Complete!";

    this.statsElement = document.createElement("div");
    this.statsElement.className = "reward-screen-stats";

    this.continueButton = document.createElement("button");
    this.continueButton.className = "reward-screen-button";
    this.continueButton.textContent = "Continue";
    this.continueButton.addEventListener("click", () => {
      this.hide();
      this.resolveContinue?.();
      this.resolveContinue = null;
    });

    this.container.appendChild(title);
    this.container.appendChild(this.statsElement);
    this.container.appendChild(this.continueButton);
    overlay.appendChild(this.container);
  }

  public setLivesManager(livesManager: LivesManager): void {
    this.livesManager = livesManager;
  }

  public applyChapterReward(): ChapterRewardResult {
    if (!this.livesManager) {
      return { lifeRestored: false };
    }

    const lifeRestored =
      this.livesManager.getLives() < STARTING_LIVES;

    if (lifeRestored) {
      this.livesManager.addLife();
    }

    return { lifeRestored };
  }

  public show(
    stats: RewardStats,
    reward?: ChapterRewardResult
  ): Promise<void> {
    this.statsElement.innerHTML = "";

    const waves = document.createElement("div");
    waves.textContent = `Waves Cleared: ${stats.wavesCleared}`;

    const peaches = document.createElement("div");
    peaches.textContent = `Peaches Destroyed: ${stats.peachesDestroyed}`;

    this.statsElement.appendChild(waves);
    this.statsElement.appendChild(peaches);

    if (reward?.lifeRestored) {
      const lifeRestore = document.createElement("div");
      lifeRestore.textContent = "Life Restored +1";
      lifeRestore.className = "reward-screen-life-restore";
      this.statsElement.appendChild(lifeRestore);
    }

    this.container.style.display = "flex";

    return new Promise(resolve => {
      this.resolveContinue = resolve;
    });
  }

  public hide(): void {
    this.container.style.display = "none";
  }

  public dispose(): void {
    this.container.remove();
  }
}
