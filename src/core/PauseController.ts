import GameLoop from "./GameLoop";
import time from "./Time";

export type PauseController = {
  pause: () => void;
  resume: () => void;
  isPaused: () => boolean;
};

export function createPauseController(
  gameLoop: GameLoop,
  timeSource: typeof time = time
): PauseController {
  return {
    pause: () => {
      gameLoop.pause();
      timeSource.setPaused(true);
    },
    resume: () => {
      gameLoop.resume();
      timeSource.setPaused(false);
    },
    isPaused: () => gameLoop.isPaused()
  };
}

