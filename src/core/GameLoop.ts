export type UpdateCallback = (fixedDeltaSeconds: number) => void;
export type RenderCallback = (alpha: number) => void;

export default class GameLoop {
  private readonly fixedTimeStepSeconds = 1 / 60;
  private readonly maxAccumulatedSeconds = 0.25;

  private updateCallbacks: UpdateCallback[] = [];
  private renderCallbacks: RenderCallback[] = [];

  private lastTimestampMs: number | null = null;
  private accumulatorSeconds = 0;
  private rafId: number | null = null;

  private running = false;
  private paused = false;

  private frameCount = 0;
  private elapsedSeconds = 0;

  public onUpdate(callback: UpdateCallback): void {
    this.updateCallbacks.push(callback);
  }

  public onRender(callback: RenderCallback): void {
    this.renderCallbacks.push(callback);
  }

  public start(): void {
    if (this.running) {
      return;
    }
    this.running = true;
    this.paused = false;
    this.lastTimestampMs = null;
    this.accumulatorSeconds = 0;
    this.rafId = requestAnimationFrame(this.loop);
  }

  public stop(): void {
    if (!this.running) {
      return;
    }
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
    }
    this.rafId = null;
    this.lastTimestampMs = null;
    this.accumulatorSeconds = 0;
  }

  public pause(): void {
    // Pauses fixed-step simulation updates; coordinate with Time via PauseController for full game pause.
    this.paused = true;
  }

  public resume(): void {
    // Resumes fixed-step simulation updates; coordinate with Time via PauseController for full game resume.
    this.paused = false;
  }

  public isPaused(): boolean {
    return this.paused;
  }

  public getElapsedSeconds(): number {
    return this.elapsedSeconds;
  }

  public getFrameCount(): number {
    return this.frameCount;
  }

  private loop = (timestampMs: number): void => {
    if (!this.running) {
      return;
    }

    if (this.lastTimestampMs === null) {
      this.lastTimestampMs = timestampMs;
    }

    const deltaMs = timestampMs - this.lastTimestampMs;
    this.lastTimestampMs = timestampMs;

    const deltaSeconds = Math.min(deltaMs / 1000, this.maxAccumulatedSeconds);

    if (!this.paused) {
      this.accumulatorSeconds = Math.min(
        this.accumulatorSeconds + deltaSeconds,
        this.maxAccumulatedSeconds
      );

      while (this.accumulatorSeconds >= this.fixedTimeStepSeconds) {
        for (const callback of this.updateCallbacks) {
          callback(this.fixedTimeStepSeconds);
        }
        this.elapsedSeconds += this.fixedTimeStepSeconds;
        this.accumulatorSeconds -= this.fixedTimeStepSeconds;
      }
    }

    const alpha = this.accumulatorSeconds / this.fixedTimeStepSeconds;
    for (const callback of this.renderCallbacks) {
      callback(alpha);
    }

    this.frameCount += 1;
    this.rafId = requestAnimationFrame(this.loop);
  };
}
