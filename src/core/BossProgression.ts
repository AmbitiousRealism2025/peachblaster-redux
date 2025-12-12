import type ChapterManager from "./ChapterManager";

export default class BossProgression {
  private chapterHasBoss = false;
  private bossSpawned = false;
  private bossDefeated = false;

  public startChapter(chapterManager: ChapterManager): void {
    const chapter = chapterManager.getCurrentChapter();
    this.chapterHasBoss = chapter.hasBoss;
    this.bossSpawned = false;
    this.bossDefeated = false;
  }

  public shouldSpawnBoss(chapterManager: ChapterManager): boolean {
    const chapter = chapterManager.getCurrentChapter();

    if (
      !this.chapterHasBoss ||
      this.bossSpawned ||
      this.bossDefeated
    ) {
      return false;
    }

    if (chapterManager.getCurrentWave() >= chapter.waveCount) {
      this.bossSpawned = true;
      return true;
    }

    return false;
  }

  public onBossDefeated(chapterManager: ChapterManager): void {
    // NOTE: `onBossDefeated()` previously advanced chapters directly via
    // `chapterManager.advanceToNextChapter()`. That only stayed safe while the
    // campaign had a boss on the final chapter only; enabling bosses on earlier
    // chapters would risk double-advancing/skipping chapters because
    // `CHAPTER_TRANSITION` also advances. Chapter advancement is owned by
    // `CHAPTER_TRANSITION` in `src/main.ts`.
    this.bossDefeated = true;
  }

  public hasBossSpawned(): boolean {
    return this.bossSpawned;
  }

  public isBossDefeated(): boolean {
    return this.bossDefeated;
  }
}
