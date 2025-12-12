import { STARTING_LIVES } from "../config/tuning";

type LivesChangedCallback = (lives: number) => void;
type GameOverCallback = () => void;
type LivesEvent = "livesChanged" | "gameOver";

export default class LivesManager {
  private lives: number;
  private startingLives: number;
  private livesChangedCallbacks: LivesChangedCallback[] = [];
  private gameOverCallbacks: GameOverCallback[] = [];

  constructor(startingLives: number = STARTING_LIVES) {
    this.startingLives = startingLives;
    this.lives = startingLives;
  }

  public getLives(): number {
    return this.lives;
  }

  public loseLife(): void {
    this.lives = Math.max(0, this.lives - 1);
    this.emitLivesChanged();
    if (this.lives <= 0) {
      this.emitGameOver();
    }
  }

  public addLife(): void {
    this.lives += 1;
    this.emitLivesChanged();
  }

  public reset(): void {
    this.lives = this.startingLives;
    this.emitLivesChanged();
  }

  public subscribe(event: "livesChanged", callback: LivesChangedCallback): void;
  public subscribe(event: "gameOver", callback: GameOverCallback): void;
  public subscribe(event: LivesEvent, callback: LivesChangedCallback | GameOverCallback): void {
    if (event === "livesChanged") {
      this.livesChangedCallbacks.push(callback as LivesChangedCallback);
      return;
    }

    this.gameOverCallbacks.push(callback as GameOverCallback);
  }

  public unsubscribe(event: "livesChanged", callback: LivesChangedCallback): void;
  public unsubscribe(event: "gameOver", callback: GameOverCallback): void;
  public unsubscribe(event: LivesEvent, callback: LivesChangedCallback | GameOverCallback): void {
    if (event === "livesChanged") {
      this.livesChangedCallbacks = this.livesChangedCallbacks.filter(
        existing => existing !== callback
      );
      return;
    }

    this.gameOverCallbacks = this.gameOverCallbacks.filter(
      existing => existing !== callback
    );
  }

  private emitLivesChanged(): void {
    for (const callback of this.livesChangedCallbacks) {
      callback(this.lives);
    }
  }

  private emitGameOver(): void {
    for (const callback of this.gameOverCallbacks) {
      callback();
    }
  }
}

