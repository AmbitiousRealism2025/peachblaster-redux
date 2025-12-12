export type DebugStats = {
  stateLabel: string;
  elapsedSeconds: number;
  frameMs: number;
};

export default class DebugOverlay {
  private container: HTMLDivElement;
  private visible = true;
  private lastFpsSampleMs = performance.now();
  private framesSinceSample = 0;
  private fps = 0;

  constructor(containerId = "debug-overlay") {
    const element = document.getElementById(containerId);
    if (element instanceof HTMLDivElement) {
      this.container = element;
    } else {
      this.container = document.createElement("div");
      this.container.id = containerId;
      document.body.appendChild(this.container);
    }

    this.setVisible(true);
  }

  public attachToggleShortcut(): void {
    window.addEventListener("keydown", event => {
      if (event.code !== "F1") {
        return;
      }
      event.preventDefault();
      this.setVisible(!this.visible);
    });
  }

  public setVisible(visible: boolean): void {
    this.visible = visible;
    this.container.hidden = !visible;
  }

  public update(stats: DebugStats): void {
    this.framesSinceSample += 1;
    const nowMs = performance.now();
    const sampleDurationMs = nowMs - this.lastFpsSampleMs;

    if (sampleDurationMs >= 500) {
      this.fps = (this.framesSinceSample / sampleDurationMs) * 1000;
      this.framesSinceSample = 0;
      this.lastFpsSampleMs = nowMs;
    }

    this.container.innerHTML = [
      `FPS: ${this.fps.toFixed(0)}`,
      `State: ${stats.stateLabel}`,
      `Elapsed: ${stats.elapsedSeconds.toFixed(1)}s`,
      `Frame: ${stats.frameMs.toFixed(2)}ms`
    ].join("<br/>");
  }
}

