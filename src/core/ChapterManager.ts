import { chapters, ChapterConfig } from "../config/chapters";
import { PeachSize } from "../entities/Peach";
import { WaveConfig } from "../systems/SpawnSystem";
import {
  WAVE_BASE_PEACH_COUNT,
  WAVE_BASE_SPAWN_INTERVAL,
  WAVE_COUNT_INCREMENT_PER_WAVE
} from "../config/tuning";

export default class ChapterManager {
  private currentChapterIndex = 0;
  private currentWaveIndex = -1;
  private chapterComplete = false;

  public getCurrentChapter(): ChapterConfig {
    return chapters[this.currentChapterIndex];
  }

  public getCurrentWave(): number {
    return this.currentWaveIndex + 1;
  }

  public getTotalWaves(): number {
    return this.getCurrentChapter().waveCount;
  }

  public isLastChapter(): boolean {
    return this.currentChapterIndex >= chapters.length - 1;
  }

  public startChapter(chapterIndex: number): void {
    this.currentChapterIndex = Math.min(
      Math.max(0, chapterIndex),
      chapters.length - 1
    );
    this.currentWaveIndex = -1;
    this.chapterComplete = false;
  }

  public startNextWave(): WaveConfig {
    const chapter = this.getCurrentChapter();
    const nextWaveIndex = this.currentWaveIndex + 1;
    this.currentWaveIndex = Math.min(nextWaveIndex, chapter.waveCount - 1);
    this.chapterComplete = false;
    return this.generateWaveConfig(this.currentWaveIndex + 1);
  }

  public completeWave(): void {
    const chapter = this.getCurrentChapter();
    if (this.currentWaveIndex >= chapter.waveCount - 1) {
      this.chapterComplete = true;
    }
  }

  public isChapterComplete(): boolean {
    return this.chapterComplete;
  }

  public advanceToNextChapter(): boolean {
    if (this.currentChapterIndex >= chapters.length - 1) {
      return false;
    }

    this.startChapter(this.currentChapterIndex + 1);
    return true;
  }

  private generateWaveConfig(waveNumber: number): WaveConfig {
    const count =
      WAVE_BASE_PEACH_COUNT +
      (waveNumber - 1) * WAVE_COUNT_INCREMENT_PER_WAVE;

    const interval = Math.max(
      0.6,
      WAVE_BASE_SPAWN_INTERVAL - (waveNumber - 1) * 0.15
    );

    const sizes = this.getSizesForWave(waveNumber);
    const pattern = this.getPatternForWave(waveNumber);

    return {
      count,
      sizes,
      interval,
      pattern
    };
  }

  private getSizesForWave(waveNumber: number): PeachSize[] {
    if (waveNumber <= 2) {
      return [PeachSize.LARGE];
    }

    if (waveNumber <= 4) {
      return [PeachSize.LARGE, PeachSize.MEDIUM];
    }

    return [PeachSize.LARGE, PeachSize.MEDIUM, PeachSize.SMALL];
  }

  private getPatternForWave(
    waveNumber: number
  ): "edge" | "ring" | "line" | "scattered" {
    const patterns: Array<"edge" | "ring" | "line" | "scattered"> = [
      "edge",
      "ring",
      "edge",
      "line",
      "scattered"
    ];

    return patterns[(waveNumber - 1) % patterns.length];
  }
}
