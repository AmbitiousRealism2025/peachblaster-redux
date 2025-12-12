import BossHealthBar from "./BossHealthBar";
import LivesDisplay from "./LivesDisplay";
import MobileControls from "./MobileControls";
import ScoreDisplay from "./ScoreDisplay";
import WaveCounter from "./WaveCounter";

export default class HUD {
  private livesDisplay: LivesDisplay;
  private scoreDisplay: ScoreDisplay;
  private waveCounter: WaveCounter;
  private bossHealthBar: BossHealthBar;
  private mobileControls: MobileControls;

  constructor(mobileControls: MobileControls) {
    this.livesDisplay = new LivesDisplay();
    this.scoreDisplay = new ScoreDisplay();
    this.waveCounter = new WaveCounter();
    this.bossHealthBar = new BossHealthBar();
    this.mobileControls = mobileControls;

    this.hideGameplayHUD();
  }

  public showGameplayHUD(): void {
    this.setElementHiddenById("lives-display", false);
    this.setElementHiddenById("score-display", false);
    this.waveCounter.show();
  }

  public hideGameplayHUD(): void {
    this.setElementHiddenById("lives-display", true);
    this.setElementHiddenById("score-display", true);
    this.waveCounter.hide();
    this.hideBossUI();
  }

  public showBossUI(): void {
    this.waveCounter.hide();
    this.bossHealthBar.show();
  }

  public hideBossUI(): void {
    this.bossHealthBar.hide();
  }

  public updateLives(lives: number): void {
    this.livesDisplay.update(lives);
  }

  public updateScore(score: number): void {
    this.scoreDisplay.update(score);
  }

  public updateWave(current: number, total: number): void {
    this.waveCounter.update(current, total);
  }

  public updateBossHealth(current: number, max: number): void {
    this.bossHealthBar.updateHealth(current, max);
  }

  public dispose(): void {
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
}
