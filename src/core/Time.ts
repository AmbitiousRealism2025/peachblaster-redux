class Time {
  private deltaSeconds = 0;
  private elapsedSeconds = 0;
  private paused = false;
  private timeScale = 1.0;
  private hitPauseTimer = 0;

  public update(deltaSeconds: number): void {
    if (this.paused) {
      this.deltaSeconds = 0;
      return;
    }

    if (this.hitPauseTimer > 0) {
      this.hitPauseTimer = Math.max(0, this.hitPauseTimer - deltaSeconds);
      this.timeScale = this.hitPauseTimer > 0 ? 0 : 1.0;
    } else {
      this.timeScale = 1.0;
    }

    const scaledDelta = deltaSeconds * this.timeScale;
    this.deltaSeconds = scaledDelta;
    this.elapsedSeconds += scaledDelta;
  }

  public getDeltaTime(): number {
    return this.deltaSeconds;
  }

  public getElapsedTime(): number {
    return this.elapsedSeconds;
  }

  public isPaused(): boolean {
    return this.paused;
  }

  public setPaused(paused: boolean): void {
    // Controls Time's internal counters only; use PauseController to pause both loop and time together.
    this.paused = paused;
  }

  public getTimeScale(): number {
    return this.timeScale;
  }

  public setTimeScale(scale: number): void {
    this.timeScale = Math.max(0, scale);
  }

  public triggerHitPause(duration: number): void {
    this.hitPauseTimer = duration;
    this.timeScale = 0;
  }

  public reset(): void {
    this.deltaSeconds = 0;
    this.elapsedSeconds = 0;
  }
}

const time = new Time();
export default time;
