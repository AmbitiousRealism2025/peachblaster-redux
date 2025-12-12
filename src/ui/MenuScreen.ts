import SFXManager from "../audio/SFXManager";

type QualityPreset = "low" | "medium" | "high";

type MenuScreenCallbacks = {
  onPlay: () => void;
  onResume: () => void;
  onQuitToMenu: () => void;
  onQualityChange?: (quality: QualityPreset) => void;
};

type MenuView = "title" | "settings" | "pause";

const STORAGE_VOLUME = "peachblaster_volume";
const STORAGE_MUTED = "peachblaster_muted";
const STORAGE_QUALITY = "peachblaster_quality";

export default class MenuScreen {
  private container!: HTMLDivElement;
  private titleView!: HTMLDivElement;
  private settingsView!: HTMLDivElement;
  private pauseView!: HTMLDivElement;

  private playButton!: HTMLButtonElement;
  private titleSettingsButton!: HTMLButtonElement;
  private resumeButton!: HTMLButtonElement;
  private pauseSettingsButton!: HTMLButtonElement;
  private quitButton!: HTMLButtonElement;

  private volumeSlider!: HTMLInputElement;
  private volumeValue!: HTMLSpanElement;
  private muteCheckbox!: HTMLInputElement;
  private qualitySelect!: HTMLSelectElement;

  private backButton!: HTMLButtonElement;
  private settingsReturnView: Exclude<MenuView, "settings"> = "title";
  private enabled = true;

  private readonly callbacks: MenuScreenCallbacks;

  private readonly onPlayClick = (): void => {
    this.callbacks.onPlay();
  };

  private readonly onSettingsFromTitleClick = (): void => {
    this.settingsReturnView = "title";
    this.showSettings();
  };

  private readonly onSettingsFromPauseClick = (): void => {
    this.settingsReturnView = "pause";
    this.showSettings();
  };

  private readonly onResumeClick = (): void => {
    this.callbacks.onResume();
  };

  private readonly onQuitClick = (): void => {
    this.callbacks.onQuitToMenu();
  };

  private readonly onBackClick = (): void => {
    if (this.settingsReturnView === "pause") {
      this.showPause();
    } else {
      this.showTitle();
    }
  };

  private readonly onVolumeInput = (): void => {
    const value = this.readSliderPercent();
    this.setVolumePercentLabel(value);
    SFXManager.getInstance().setVolume(value / 100);
    this.saveSettings();
  };

  private readonly onMuteChange = (): void => {
    SFXManager.getInstance().setMuted(this.muteCheckbox.checked);
    this.saveSettings();
  };

  private readonly onQualityChange = (): void => {
    const qualityPreset = this.getSelectedQualityPreset();
    this.saveSettings();
    if (this.callbacks.onQualityChange) {
      this.callbacks.onQualityChange(qualityPreset);
    }
  };

  constructor(callbacks: MenuScreenCallbacks) {
    this.callbacks = callbacks;

    const overlay = document.getElementById("ui-overlay");
    if (!overlay) {
      console.error(
        "UI overlay container (#ui-overlay) not found. MenuScreen disabled.",
      );
      this.enabled = false;
      return;
    }

    this.container = document.createElement("div");
    this.container.id = "menu-screen";
    this.container.style.display = "none";

    this.titleView = document.createElement("div");
    this.titleView.id = "menu-title";

    this.settingsView = document.createElement("div");
    this.settingsView.id = "menu-settings";

    this.pauseView = document.createElement("div");
    this.pauseView.id = "menu-pause";

    this.buildTitleView();
    this.buildSettingsView();
    this.buildPauseView();

    this.container.appendChild(this.titleView);
    this.container.appendChild(this.settingsView);
    this.container.appendChild(this.pauseView);
    overlay.appendChild(this.container);

    this.setView("title");
    this.hide();
  }

  public showTitle(): void {
    if (!this.enabled) return;
    this.container.style.display = "flex";
    this.setView("title");
    this.playButton?.focus();
  }

  public showPause(): void {
    if (!this.enabled) return;
    this.container.style.display = "flex";
    this.setView("pause");
    this.resumeButton?.focus();
  }

  public hide(): void {
    if (!this.enabled) return;
    this.container.style.display = "none";
  }

  public loadSettings(): void {
    if (!this.enabled) return;
    const sfx = SFXManager.getInstance();

    const storedVolume = this.readStoredNumber(STORAGE_VOLUME);
    const volume01 = storedVolume ?? sfx.getVolume();
    const volumePercent = Math.round(this.clamp01(volume01) * 100);
    this.volumeSlider.value = String(volumePercent);
    this.setVolumePercentLabel(volumePercent);
    sfx.setVolume(volumePercent / 100);

    const storedMuted = this.readStoredBoolean(STORAGE_MUTED);
    const muted = storedMuted ?? sfx.isMuted();
    this.muteCheckbox.checked = muted;
    sfx.setMuted(muted);

    const storedQuality = this.readStoredString(STORAGE_QUALITY);
    this.qualitySelect.value = this.validateQualityPreset(storedQuality);
  }

  public saveSettings(): void {
    if (!this.enabled) return;
    try {
      const volume = this.readSliderPercent() / 100;
      const qualityPreset = this.getSelectedQualityPreset();
      localStorage.setItem(STORAGE_VOLUME, String(volume));
      localStorage.setItem(
        STORAGE_MUTED,
        this.muteCheckbox.checked ? "true" : "false"
      );
      localStorage.setItem(STORAGE_QUALITY, qualityPreset);
    } catch {
      // no-op (localStorage may be unavailable)
    }
  }

  public dispose(): void {
    if (!this.enabled) return;
    this.playButton.removeEventListener("click", this.onPlayClick);
    this.titleSettingsButton.removeEventListener(
      "click",
      this.onSettingsFromTitleClick
    );
    this.resumeButton.removeEventListener("click", this.onResumeClick);
    this.pauseSettingsButton.removeEventListener(
      "click",
      this.onSettingsFromPauseClick
    );
    this.quitButton.removeEventListener("click", this.onQuitClick);
    this.volumeSlider.removeEventListener("input", this.onVolumeInput);
    this.muteCheckbox.removeEventListener("change", this.onMuteChange);
    this.qualitySelect.removeEventListener("change", this.onQualityChange);
    this.backButton.removeEventListener("click", this.onBackClick);
    this.container.remove();
  }

  public refreshQualitySelection(): void {
    if (!this.enabled) return;
    const storedQuality = this.readStoredString(STORAGE_QUALITY);
    this.qualitySelect.value = this.validateQualityPreset(storedQuality);
  }

  private buildTitleView(): void {
    const title = document.createElement("div");
    title.className = "menu-title";
    title.textContent = "PEACH BLASTER";

    const subtitle = document.createElement("div");
    subtitle.className = "menu-subtitle";
    subtitle.textContent = "Fruit Chaos in the Cosmos";

    this.playButton = document.createElement("button");
    this.playButton.className = "menu-button";
    this.playButton.textContent = "Play";
    this.playButton.addEventListener("click", this.onPlayClick);

    this.titleSettingsButton = document.createElement("button");
    this.titleSettingsButton.className =
      "menu-button menu-button-secondary";
    this.titleSettingsButton.textContent = "Settings";
    this.titleSettingsButton.addEventListener(
      "click",
      this.onSettingsFromTitleClick
    );

    const buttonRow = document.createElement("div");
    buttonRow.className = "menu-button-row";
    buttonRow.appendChild(this.playButton);
    buttonRow.appendChild(this.titleSettingsButton);

    this.titleView.appendChild(title);
    this.titleView.appendChild(subtitle);
    this.titleView.appendChild(buttonRow);
  }

  private buildPauseView(): void {
    const title = document.createElement("div");
    title.className = "menu-title";
    title.textContent = "PAUSED";

    this.resumeButton = document.createElement("button");
    this.resumeButton.className = "menu-button";
    this.resumeButton.textContent = "Resume";
    this.resumeButton.addEventListener("click", this.onResumeClick);

    this.pauseSettingsButton = document.createElement("button");
    this.pauseSettingsButton.className =
      "menu-button menu-button-secondary";
    this.pauseSettingsButton.textContent = "Settings";
    this.pauseSettingsButton.addEventListener(
      "click",
      this.onSettingsFromPauseClick
    );

    this.quitButton = document.createElement("button");
    this.quitButton.className = "menu-button menu-button-danger";
    this.quitButton.textContent = "Quit to Menu";
    this.quitButton.addEventListener("click", this.onQuitClick);

    const buttonRow = document.createElement("div");
    buttonRow.className = "menu-button-row";
    buttonRow.appendChild(this.resumeButton);
    buttonRow.appendChild(this.pauseSettingsButton);
    buttonRow.appendChild(this.quitButton);

    this.pauseView.appendChild(title);
    this.pauseView.appendChild(buttonRow);
  }

  private buildSettingsView(): void {
    const panel = document.createElement("div");
    panel.className = "settings-panel";

    const title = document.createElement("div");
    title.className = "settings-title";
    title.textContent = "Settings";

    const volumeRow = document.createElement("div");
    volumeRow.className = "settings-row";

    const volumeLabel = document.createElement("label");
    volumeLabel.className = "settings-label";
    volumeLabel.textContent = "SFX Volume";

    this.volumeValue = document.createElement("span");
    this.volumeValue.className = "settings-value";

    const volumeHeader = document.createElement("div");
    volumeHeader.className = "settings-row-header";
    volumeHeader.appendChild(volumeLabel);
    volumeHeader.appendChild(this.volumeValue);

    this.volumeSlider = document.createElement("input");
    this.volumeSlider.className = "slider";
    this.volumeSlider.type = "range";
    this.volumeSlider.min = "0";
    this.volumeSlider.max = "100";
    this.volumeSlider.step = "1";
    this.volumeSlider.addEventListener("input", this.onVolumeInput);

    volumeRow.appendChild(volumeHeader);
    volumeRow.appendChild(this.volumeSlider);

    const muteRow = document.createElement("div");
    muteRow.className = "settings-row";

    const muteLabel = document.createElement("label");
    muteLabel.className = "checkbox-label";

    this.muteCheckbox = document.createElement("input");
    this.muteCheckbox.type = "checkbox";
    this.muteCheckbox.addEventListener("change", this.onMuteChange);

    const muteText = document.createElement("span");
    muteText.textContent = "Mute SFX";

    muteLabel.appendChild(this.muteCheckbox);
    muteLabel.appendChild(muteText);
    muteRow.appendChild(muteLabel);

    const qualityRow = document.createElement("div");
    qualityRow.className = "settings-row";

    const qualityLabel = document.createElement("label");
    qualityLabel.className = "settings-label";
    qualityLabel.textContent = "Quality Preset";

    this.qualitySelect = document.createElement("select");
    this.qualitySelect.className = "settings-select";
    this.qualitySelect.addEventListener("change", this.onQualityChange);

    const qualityOptions: Array<{ label: string; value: string }> = [
      { label: "Low", value: "low" },
      { label: "Medium", value: "medium" },
      { label: "High", value: "high" }
    ];
    for (const option of qualityOptions) {
      const element = document.createElement("option");
      element.value = option.value;
      element.textContent = option.label;
      this.qualitySelect.appendChild(element);
    }

    const qualityField = document.createElement("div");
    qualityField.className = "settings-field";
    qualityField.appendChild(qualityLabel);
    qualityField.appendChild(this.qualitySelect);
    qualityRow.appendChild(qualityField);

    const controls = document.createElement("div");
    controls.className = "settings-controls";
    controls.textContent =
      "Controls: Keyboard (WASD / Arrows + Space). Touch (Joystick + Fire).";

    this.backButton = document.createElement("button");
    this.backButton.className = "menu-button";
    this.backButton.textContent = "Back";
    this.backButton.addEventListener("click", this.onBackClick);

    panel.appendChild(title);
    panel.appendChild(volumeRow);
    panel.appendChild(muteRow);
    panel.appendChild(qualityRow);
    panel.appendChild(controls);
    panel.appendChild(this.backButton);

    this.settingsView.appendChild(panel);
  }

  private showSettings(): void {
    this.loadSettings();
    this.container.style.display = "flex";
    this.setView("settings");
  }

  private setView(view: MenuView): void {
    this.titleView.style.display = view === "title" ? "flex" : "none";
    this.pauseView.style.display = view === "pause" ? "flex" : "none";
    this.settingsView.style.display = view === "settings" ? "flex" : "none";
  }

  private setVolumePercentLabel(value: number): void {
    this.volumeValue.textContent = `${Math.round(value)}%`;
  }

  private readSliderPercent(): number {
    const parsed = Number(this.volumeSlider.value);
    if (!Number.isFinite(parsed)) {
      return 100;
    }
    return Math.max(0, Math.min(100, parsed));
  }

  private readStoredNumber(key: string): number | null {
    try {
      const value = localStorage.getItem(key);
      if (!value) {
        return null;
      }
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  private readStoredBoolean(key: string): boolean | null {
    try {
      const value = localStorage.getItem(key);
      if (value === null) {
        return null;
      }
      if (value === "true") {
        return true;
      }
      if (value === "false") {
        return false;
      }
      return null;
    } catch {
      return null;
    }
  }

  private readStoredString(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private clamp01(value: number): number {
    return Math.max(0, Math.min(1, value));
  }

  private getSelectedQualityPreset(): QualityPreset {
    const qualityPreset = this.qualitySelect.value;
    return this.validateQualityPreset(qualityPreset);
  }

  private validateQualityPreset(value: string | null): QualityPreset {
    return value === "low" || value === "medium" || value === "high"
      ? value
      : "medium";
  }
}
