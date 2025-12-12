import { PeachSize } from "../entities/Peach";
import {
  SCORE_PEACH_LARGE,
  SCORE_PEACH_MEDIUM,
  SCORE_PEACH_SMALL
} from "../config/tuning";

type ScoreChangedCallback = (score: number) => void;
type ScoreEvent = "scoreChanged";

export default class ScoreManager {
  private score = 0;
  private peachesDestroyedTotal = 0;
  private peachesDestroyedThisChapter = 0;
  private scoreChangedCallbacks: ScoreChangedCallback[] = [];

  public getScore(): number {
    return this.score;
  }

  public getPeachesDestroyedTotal(): number {
    return this.peachesDestroyedTotal;
  }

  public getPeachesDestroyedThisChapter(): number {
    return this.peachesDestroyedThisChapter;
  }

  public addPeachDestroyed(size: PeachSize): void {
    this.peachesDestroyedTotal += 1;
    this.peachesDestroyedThisChapter += 1;
    this.score += this.getScoreForSize(size);
    this.emitScoreChanged();
  }

  public addScore(amount: number): void {
    this.score += amount;
    this.emitScoreChanged();
  }

  public resetRun(): void {
    this.score = 0;
    this.peachesDestroyedTotal = 0;
    this.peachesDestroyedThisChapter = 0;
    this.emitScoreChanged();
  }

  public resetChapter(): void {
    this.peachesDestroyedThisChapter = 0;
  }

  public subscribe(event: "scoreChanged", callback: ScoreChangedCallback): void;
  public subscribe(event: ScoreEvent, callback: ScoreChangedCallback): void {
    if (event === "scoreChanged") {
      this.scoreChangedCallbacks.push(callback);
    }
  }

  public unsubscribe(event: "scoreChanged", callback: ScoreChangedCallback): void;
  public unsubscribe(event: ScoreEvent, callback: ScoreChangedCallback): void {
    if (event === "scoreChanged") {
      this.scoreChangedCallbacks = this.scoreChangedCallbacks.filter(
        existing => existing !== callback
      );
    }
  }

  private getScoreForSize(size: PeachSize): number {
    switch (size) {
      case PeachSize.LARGE:
        return SCORE_PEACH_LARGE;
      case PeachSize.MEDIUM:
        return SCORE_PEACH_MEDIUM;
      case PeachSize.SMALL:
        return SCORE_PEACH_SMALL;
      default:
        return SCORE_PEACH_LARGE;
    }
  }

  private emitScoreChanged(): void {
    for (const callback of this.scoreChangedCallbacks) {
      callback(this.score);
    }
  }
}
