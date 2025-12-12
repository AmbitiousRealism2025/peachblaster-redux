import ChapterManager from "@/core/ChapterManager";
import { chapters } from "@/config/chapters";
import { PeachSize } from "@/entities/Peach";
import {
  WAVE_BASE_PEACH_COUNT,
  WAVE_BASE_SPAWN_INTERVAL,
  WAVE_COUNT_INCREMENT_PER_WAVE,
  WAVE_MIN_SPAWN_INTERVAL,
  WAVE_SPAWN_INTERVAL_REDUCTION_PER_WAVE
} from "@/config/tuning";

describe("ChapterManager", () => {
  it("initializes at the first chapter with wave 0 (pre-start)", () => {
    const manager = new ChapterManager();

    expect(manager.getCurrentChapter()).toBe(chapters[0]);
    expect(manager.getCurrentWave()).toBe(0);
    expect(manager.isChapterComplete()).toBe(false);
  });

  it("startChapter selects a chapter, resets wave, and clears completion", () => {
    const manager = new ChapterManager();

    const totalWaves = manager.getTotalWaves();
    for (let waveIndex = 0; waveIndex < totalWaves; waveIndex += 1) {
      manager.startNextWave();
    }
    manager.completeWave();
    expect(manager.isChapterComplete()).toBe(true);

    const targetChapterIndex = chapters.length > 1 ? chapters.length - 1 : 0;
    manager.startChapter(targetChapterIndex);

    expect(manager.getCurrentChapter()).toBe(chapters[targetChapterIndex]);
    expect(manager.getCurrentWave()).toBe(0);
    expect(manager.isChapterComplete()).toBe(false);
  });

  it("startNextWave increments wave and returns generated WaveConfig", () => {
    const manager = new ChapterManager();

    const wave1 = manager.startNextWave();
    expect(manager.getCurrentWave()).toBe(1);
    expect(wave1.count).toBe(WAVE_BASE_PEACH_COUNT);
    expect(wave1.interval).toBe(WAVE_BASE_SPAWN_INTERVAL);
    expect(wave1.sizes).toEqual([PeachSize.LARGE]);
    expect(wave1.pattern).toBe("edge");

    const wave2 = manager.startNextWave();
    expect(manager.getCurrentWave()).toBe(2);
    expect(wave2.count).toBe(WAVE_BASE_PEACH_COUNT + WAVE_COUNT_INCREMENT_PER_WAVE);
    expect(wave2.interval).toBe(
      Math.max(
        WAVE_MIN_SPAWN_INTERVAL,
        WAVE_BASE_SPAWN_INTERVAL - WAVE_SPAWN_INTERVAL_REDUCTION_PER_WAVE
      )
    );
    expect(wave2.sizes).toEqual([PeachSize.LARGE]);
    expect(wave2.pattern).toBe("ring");
  });

  it("completeWave marks chapter complete only after the last wave", () => {
    const manager = new ChapterManager();
    const totalWaves = manager.getTotalWaves();

    manager.startNextWave();
    manager.completeWave();
    expect(manager.isChapterComplete()).toBe(false);

    for (let waveIndex = 1; waveIndex < totalWaves; waveIndex += 1) {
      manager.startNextWave();
    }

    manager.completeWave();
    expect(manager.isChapterComplete()).toBe(true);
  });

  it("advanceToNextChapter increments chapter, resets wave, and returns false at last chapter", () => {
    const manager = new ChapterManager();
    if (chapters.length > 1) {
      const initialChapter = manager.getCurrentChapter();
      expect(manager.advanceToNextChapter()).toBe(true);
      expect(manager.getCurrentChapter()).not.toBe(initialChapter);
      expect(manager.getCurrentWave()).toBe(0);
    } else {
      expect(manager.advanceToNextChapter()).toBe(false);
    }

    manager.startChapter(chapters.length - 1);
    expect(manager.advanceToNextChapter()).toBe(false);
  });

  it("progresses size tiers and patterns across consecutive waves", () => {
    const manager = new ChapterManager();

    const maxWaveCount = Math.max(...chapters.map((chapter) => chapter.waveCount));
    const chapterIndex = chapters.findIndex(
      (chapter) => chapter.waveCount === maxWaveCount
    );
    manager.startChapter(chapterIndex);

    const waveSampleCount = Math.min(manager.getTotalWaves(), 5);
    const sampledWaves = Array.from({ length: waveSampleCount }, () =>
      manager.startNextWave()
    );

    expect(sampledWaves[0]?.sizes).toEqual([PeachSize.LARGE]);

    if (waveSampleCount >= 3) {
      expect(
        sampledWaves.some((wave) => wave.sizes.includes(PeachSize.MEDIUM))
      ).toBe(true);
    }

    if (waveSampleCount >= 5) {
      expect(
        sampledWaves.some((wave) => wave.sizes.includes(PeachSize.SMALL))
      ).toBe(true);
    }

    if (waveSampleCount >= 2) {
      const distinctPatterns = new Set(sampledWaves.map((wave) => wave.pattern));
      expect(distinctPatterns.size).toBeGreaterThan(1);
    }
  });
});
