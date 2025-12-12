import {
  SFX_BOSS_HIT_BASE_FREQUENCY,
  SFX_BOSS_HIT_DURATION,
  SFX_BOSS_HIT_VOLUME,
  SFX_BULLET_DURATION,
  SFX_BULLET_FIRE_VOLUME,
  SFX_BULLET_FREQUENCY,
  SFX_MASTER_VOLUME,
  SFX_PEACH_SPLIT_DURATION,
  SFX_PEACH_SPLIT_FILTER_FREQUENCY,
  SFX_PEACH_SPLIT_VOLUME,
  SFX_SHIP_DAMAGE_DURATION,
  SFX_SHIP_DAMAGE_FREQUENCY,
  SFX_SHIP_DAMAGE_VOLUME,
  SFX_THRUST_FILTER_CUTOFF,
  SFX_THRUST_VOLUME
} from "../config/tuning";

type PlaySoundConfig = {
  type: OscillatorType;
  frequency: number;
  duration: number;
  volume: number;
  filterFrequency?: number;
};

export default class SFXManager {
  private static instance: SFXManager | null = null;

  public static getInstance(): SFXManager {
    if (!SFXManager.instance) {
      SFXManager.instance = new SFXManager();
    }
    return SFXManager.instance;
  }

  private audioContext: AudioContext | null = null;
  private masterGainNode: GainNode | null = null;

  private isMutedFlag = false;
  private volume = SFX_MASTER_VOLUME;

  private thrustSource: AudioBufferSourceNode | null = null;
  private thrustGain: GainNode | null = null;
  private isThrustPlaying = false;

  private userGestureResumeHandler: (() => void) | null = null;

  private constructor() {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ??
        false);

    if (prefersReducedMotion) {
      // Accessibility: reduce default SFX volume when the user prefers reduced motion.
      this.volume = this.clamp01(this.volume * 0.5);
    }
  }

  /**
   * Sets the master SFX volume (0.0–1.0).
   * Phase 9 UI will call this for a settings slider.
   */
  public setVolume(volume: number): void {
    this.volume = this.clamp01(volume);
    this.updateMasterGain();
  }

  public getVolume(): number {
    return this.volume;
  }

  /**
   * Mutes/unmutes all SFX.
   * Phase 9 UI will call this for a settings toggle.
   */
  public setMuted(muted: boolean): void {
    this.isMutedFlag = muted;
    this.updateMasterGain();
  }

  public isMuted(): boolean {
    return this.isMutedFlag;
  }

  public playThrust(): void {
    const audioContext = this.ensureAudioContext();
    if (!audioContext || !this.masterGainNode) {
      return;
    }
    if (this.isThrustPlaying) {
      return;
    }

    const noiseBuffer = this.createWhiteNoise(1.0);
    if (!noiseBuffer) {
      return;
    }

    const source = audioContext.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;

    const filter = audioContext.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = SFX_THRUST_FILTER_CUTOFF;

    const gain = audioContext.createGain();
    gain.gain.value = 0;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGainNode);

    const now = audioContext.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(SFX_THRUST_VOLUME, now + 0.02);

    source.onended = () => {
      try {
        source.disconnect();
        filter.disconnect();
        gain.disconnect();
      } catch {
        // no-op
      }
    };

    source.start(now);

    this.thrustSource = source;
    this.thrustGain = gain;
    this.isThrustPlaying = true;
  }

  public stopThrust(): void {
    if (!this.isThrustPlaying) {
      return;
    }

    const audioContext = this.audioContext;
    const source = this.thrustSource;
    const gain = this.thrustGain;

    this.isThrustPlaying = false;
    this.thrustSource = null;
    this.thrustGain = null;

    if (!audioContext || !source || !gain) {
      return;
    }

    const now = audioContext.currentTime;
    const stopTime = now + 0.03;

    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(0, stopTime);

    try {
      source.stop(stopTime);
    } catch {
      // no-op
    }
  }

  public playBulletFire(): void {
    this.playSound({
      type: "sine",
      frequency: SFX_BULLET_FREQUENCY,
      duration: SFX_BULLET_DURATION,
      volume: SFX_BULLET_FIRE_VOLUME
    });
  }

  public playPeachSplit(): void {
    const audioContext = this.ensureAudioContext();
    if (!audioContext || !this.masterGainNode) {
      return;
    }

    const durationSeconds = SFX_PEACH_SPLIT_DURATION;
    const noiseBuffer = this.createWhiteNoise(durationSeconds);
    if (!noiseBuffer) {
      return;
    }

    const source = audioContext.createBufferSource();
    source.buffer = noiseBuffer;

    const filter = audioContext.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = SFX_PEACH_SPLIT_FILTER_FREQUENCY;
    filter.Q.value = 2.0;

    const gain = audioContext.createGain();
    const now = audioContext.currentTime;
    const attackSeconds = 0.005;
    const peak = Math.max(0.0001, SFX_PEACH_SPLIT_VOLUME);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peak, now + attackSeconds);
    gain.gain.exponentialRampToValueAtTime(
      peak * 0.01,
      now + durationSeconds
    );

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGainNode);

    source.onended = () => {
      try {
        source.disconnect();
        filter.disconnect();
        gain.disconnect();
      } catch {
        // no-op
      }
    };

    source.start(now);
    source.stop(now + durationSeconds);
  }

  public playShipDamage(): void {
    const audioContext = this.ensureAudioContext();
    if (!audioContext || !this.masterGainNode) {
      return;
    }

    const durationSeconds = SFX_SHIP_DAMAGE_DURATION;
    const now = audioContext.currentTime;

    const oscillator = audioContext.createOscillator();
    oscillator.type = "sawtooth";
    oscillator.frequency.value = SFX_SHIP_DAMAGE_FREQUENCY;

    const gain = audioContext.createGain();
    const attackSeconds = 0.005;
    const peak = Math.max(0.0001, SFX_SHIP_DAMAGE_VOLUME);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peak, now + attackSeconds);
    gain.gain.linearRampToValueAtTime(0, now + durationSeconds);

    oscillator.connect(gain);
    gain.connect(this.masterGainNode);

    oscillator.onended = () => {
      try {
        oscillator.disconnect();
        gain.disconnect();
      } catch {
        // no-op
      }
    };

    oscillator.start(now);
    oscillator.stop(now + durationSeconds);
  }

  public playBossHit(): void {
    const audioContext = this.ensureAudioContext();
    if (!audioContext || !this.masterGainNode) {
      return;
    }

    const durationSeconds = SFX_BOSS_HIT_DURATION;
    const now = audioContext.currentTime;

    const sine = audioContext.createOscillator();
    sine.type = "sine";
    sine.frequency.value = SFX_BOSS_HIT_BASE_FREQUENCY;

    const sineGain = audioContext.createGain();
    sineGain.gain.value = 0.7;

    const noiseBuffer = this.createWhiteNoise(durationSeconds);
    if (!noiseBuffer) {
      return;
    }

    const noise = audioContext.createBufferSource();
    noise.buffer = noiseBuffer;

    const noiseGain = audioContext.createGain();
    noiseGain.gain.value = 0.3;

    const mergedGain = audioContext.createGain();
    const attackSeconds = 0.005;
    const peak = Math.max(0.0001, SFX_BOSS_HIT_VOLUME);

    mergedGain.gain.setValueAtTime(0.0001, now);
    mergedGain.gain.linearRampToValueAtTime(peak, now + attackSeconds);
    mergedGain.gain.exponentialRampToValueAtTime(
      peak * 0.01,
      now + durationSeconds
    );

    sine.connect(sineGain);
    sineGain.connect(mergedGain);

    noise.connect(noiseGain);
    noiseGain.connect(mergedGain);

    mergedGain.connect(this.masterGainNode);

    let cleanedUp = false;
    const cleanup = () => {
      if (cleanedUp) {
        return;
      }
      cleanedUp = true;
      try {
        sine.disconnect();
        sineGain.disconnect();
        noise.disconnect();
        noiseGain.disconnect();
        mergedGain.disconnect();
      } catch {
        // no-op
      }
    };

    sine.onended = cleanup;
    noise.onended = cleanup;

    sine.start(now);
    sine.stop(now + durationSeconds);

    noise.start(now);
    noise.stop(now + durationSeconds);
  }

  private ensureAudioContext(): AudioContext | null {
    if (this.audioContext && this.masterGainNode) {
      this.resumeAudioContextIfNeeded();
      return this.audioContext;
    }

    if (typeof window === "undefined") {
      return null;
    }

    const AudioContextConstructor =
      window.AudioContext ??
      (window as unknown as {
        webkitAudioContext?: typeof AudioContext;
      }).webkitAudioContext;

    if (!AudioContextConstructor) {
      if (import.meta.env.DEV) {
        console.warn("WebAudio not supported: AudioContext missing.");
      }
      return null;
    }

    try {
      this.audioContext = new AudioContextConstructor();
      this.masterGainNode = this.audioContext.createGain();
      this.masterGainNode.connect(this.audioContext.destination);
      this.updateMasterGain();
      this.resumeAudioContextIfNeeded();
      return this.audioContext;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn("Failed to create AudioContext:", error);
      }
      this.audioContext = null;
      this.masterGainNode = null;
      return null;
    }
  }

  private resumeAudioContextIfNeeded(): void {
    const audioContext = this.audioContext;
    if (!audioContext) {
      return;
    }

    if (audioContext.state !== "suspended") {
      return;
    }

    this.bindUserGestureResume();
    void audioContext.resume().catch(error => {
      if (import.meta.env.DEV) {
        console.warn("AudioContext resume failed:", error);
      }
    });

    if (import.meta.env.DEV) {
      setTimeout(() => {
        if (this.audioContext?.state === "suspended") {
          console.warn(
            "AudioContext still suspended (waiting for user gesture)."
          );
        }
      }, 100);
    }
  }

  private bindUserGestureResume(): void {
    if (this.userGestureResumeHandler || typeof window === "undefined") {
      return;
    }

    this.userGestureResumeHandler = () => {
      const audioContext = this.audioContext;
      if (!audioContext) {
        return;
      }

      void audioContext
        .resume()
        .then(() => {
          if (audioContext.state === "running") {
            this.unbindUserGestureResume();
          }
        })
        .catch(() => {
          // Keep listeners for future gestures.
        });
    };

    window.addEventListener("pointerdown", this.userGestureResumeHandler);
    window.addEventListener("keydown", this.userGestureResumeHandler);
    window.addEventListener("touchstart", this.userGestureResumeHandler);
  }

  private unbindUserGestureResume(): void {
    if (!this.userGestureResumeHandler || typeof window === "undefined") {
      return;
    }

    window.removeEventListener("pointerdown", this.userGestureResumeHandler);
    window.removeEventListener("keydown", this.userGestureResumeHandler);
    window.removeEventListener("touchstart", this.userGestureResumeHandler);
    this.userGestureResumeHandler = null;
  }

  private createWhiteNoise(durationSeconds: number): AudioBuffer | null {
    const audioContext = this.audioContext;
    if (!audioContext) {
      return null;
    }

    const sampleRate = audioContext.sampleRate;
    const frameCount = Math.max(1, Math.floor(sampleRate * durationSeconds));
    const buffer = audioContext.createBuffer(1, frameCount, sampleRate);
    const channelData = buffer.getChannelData(0);

    for (let i = 0; i < channelData.length; i += 1) {
      channelData[i] = Math.random() * 2 - 1;
    }

    return buffer;
  }

  private playSound(config: PlaySoundConfig): void {
    const audioContext = this.ensureAudioContext();
    if (!audioContext || !this.masterGainNode) {
      return;
    }

    const oscillator = audioContext.createOscillator();
    oscillator.type = config.type;
    oscillator.frequency.value = config.frequency;

    let sourceNode: AudioNode = oscillator;
    let filter: BiquadFilterNode | null = null;

    if (typeof config.filterFrequency === "number") {
      filter = audioContext.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = config.filterFrequency;
      sourceNode.connect(filter);
      sourceNode = filter;
    }

    const gain = audioContext.createGain();
    const now = audioContext.currentTime;
    const attackSeconds = Math.min(0.01, config.duration * 0.5);
    const peak = Math.max(0.0001, config.volume);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peak, now + attackSeconds);
    gain.gain.linearRampToValueAtTime(0, now + config.duration);

    sourceNode.connect(gain);
    gain.connect(this.masterGainNode);

    oscillator.onended = () => {
      try {
        oscillator.disconnect();
        filter?.disconnect();
        gain.disconnect();
      } catch {
        // no-op
      }
    };

    oscillator.start(now);
    oscillator.stop(now + config.duration);
  }

  private updateMasterGain(): void {
    if (!this.masterGainNode) {
      return;
    }

    this.masterGainNode.gain.value = this.isMutedFlag ? 0 : this.volume;
  }

  private clamp01(value: number): number {
    if (!Number.isFinite(value)) {
      return 0;
    }
    return Math.min(1, Math.max(0, value));
  }
}
