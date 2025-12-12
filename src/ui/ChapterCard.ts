import { ChapterConfig } from "../config/chapters";
import { CHAPTER_CARD_DISPLAY_DURATION_SECONDS } from "../config/tuning";

export default class ChapterCard {
  private container!: HTMLDivElement;
  private titleElement!: HTMLDivElement;
  private subtitleElement!: HTMLDivElement;
  private hintElement!: HTMLDivElement;
  private hideTimer: number | null = null;
  private enabled = true;

  constructor() {
    const overlay = document.getElementById("ui-overlay");
    if (!overlay) {
      console.error(
        "UI overlay container (#ui-overlay) not found. ChapterCard disabled.",
      );
      this.enabled = false;
      return;
    }

    this.container = document.createElement("div");
    this.container.id = "chapter-card";
    this.container.style.display = "none";

    this.titleElement = document.createElement("div");
    this.titleElement.className = "chapter-card-title";

    this.subtitleElement = document.createElement("div");
    this.subtitleElement.className = "chapter-card-subtitle";

    this.hintElement = document.createElement("div");
    this.hintElement.className = "chapter-card-hint";

    this.container.appendChild(this.titleElement);
    this.container.appendChild(this.subtitleElement);
    this.container.appendChild(this.hintElement);
    overlay.appendChild(this.container);
  }

  public show(chapter: ChapterConfig): Promise<void> {
    if (!this.enabled) return Promise.resolve();
    this.titleElement.textContent = chapter.name;
    this.subtitleElement.textContent = chapter.subtitle;
    this.hintElement.textContent = `${chapter.waveCount} Waves`;

    this.container.style.display = "flex";

    this.container.classList.remove("chapter-card-animate");
    void this.container.offsetWidth;
    this.container.classList.add("chapter-card-animate");

    if (this.hideTimer !== null) {
      window.clearTimeout(this.hideTimer);
    }

    return new Promise(resolve => {
      this.hideTimer = window.setTimeout(() => {
        this.hide();
        resolve();
      }, CHAPTER_CARD_DISPLAY_DURATION_SECONDS * 1000);
    });
  }

  public hide(): void {
    if (!this.enabled) return;
    if (this.hideTimer !== null) {
      window.clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
    this.container.classList.remove("chapter-card-animate");
    this.container.style.display = "none";
  }

  public dispose(): void {
    if (!this.enabled) return;
    if (this.hideTimer !== null) {
      window.clearTimeout(this.hideTimer);
    }
    this.container.remove();
  }
}
