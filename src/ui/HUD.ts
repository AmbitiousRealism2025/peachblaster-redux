import BossHealthBar from "./BossHealthBar";
import LivesDisplay from "./LivesDisplay";
import MobileControls from "./MobileControls";
import ScoreDisplay from "./ScoreDisplay";
import WaveCounter from "./WaveCounter";

export default class HUD {
  private livesDisplay!: LivesDisplay;
  private scoreDisplay!: ScoreDisplay;
  private waveCounter!: WaveCounter;
  private bossHealthBar!: BossHealthBar;
  private mobileControls: MobileControls;
  private enabled = true;

  constructor(mobileControls: MobileControls) {
    this.mobileControls = mobileControls;

    try {
      this.livesDisplay = new LivesDisplay();
      this.scoreDisplay = new ScoreDisplay();
      this.waveCounter = new WaveCounter();
      this.bossHealthBar = new BossHealthBar();
    } catch (error) {
      console.error("HUD initialization failed:", error);
      this.enabled = false;
    }

    this.hideGameplayHUD();

    if (this.enabled && !this.isHudAvailable()) {
      this.enabled = false;
    }
  }

  public showGameplayHUD(): void {
    if (!this.enabled) return;
    this.setElementHiddenById("lives-display", false);
    this.setElementHiddenById("score-display", false);
    this.waveCounter.show();
  }

  public hideGameplayHUD(): void {
    if (!this.enabled) return;
    this.setElementHiddenById("lives-display", true);
    this.setElementHiddenById("score-display", true);
    this.waveCounter.hide();
    this.hideBossUI();
  }

  public showBossUI(): void {
    if (!this.enabled) return;
    this.waveCounter.hide();
    this.bossHealthBar.show();
  }

  public hideBossUI(): void {
    if (!this.enabled) return;
    this.bossHealthBar.hide();
  }

  public updateLives(lives: number): void {
    if (!this.enabled) return;
    this.livesDisplay.update(lives);
  }

  public updateScore(score: number): void {
    if (!this.enabled) return;
    this.scoreDisplay.update(score);
  }

  public updateWave(current: number, total: number): void {
    if (!this.enabled) return;
    this.waveCounter.update(current, total);
  }

  public updateBossHealth(current: number, max: number): void {
    if (!this.enabled) return;
    this.bossHealthBar.updateHealth(current, max);
  }

  public dispose(): void {
    if (!this.enabled) return;
    this.livesDisplay.dispose();
    this.scoreDisplay.dispose();
    this.waveCounter.dispose();
    this.bossHealthBar.dispose();
  }

  private setElementHiddenById(elementId: string, hidden: boolean): void {
    const element = document.getElementById(elementId);
    if (element instanceof HTMLElement) {
      element.hidden = hidden;
    }
  }

  private isHudAvailable(): boolean {
    const overlay = document.getElementById("ui-overlay");
    if (!overlay) {
      return false;
    }

    const requiredElementIds = [
      "lives-display",
      "score-display",
      "wave-counter",
      "boss-health-bar"
    ];

    return requiredElementIds.every(elementId => {
      return document.getElementById(elementId) instanceof HTMLElement;
    });
  }
}
