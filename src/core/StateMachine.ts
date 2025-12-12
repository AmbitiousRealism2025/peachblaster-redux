export enum GameState {
  LOADING = "LOADING",
  MENU = "MENU",
  PLAYING = "PLAYING",
  PAUSED = "PAUSED",
  CHAPTER_TRANSITION = "CHAPTER_TRANSITION",
  GAME_OVER = "GAME_OVER",
  VICTORY = "VICTORY"
}

export type StateLifecycle = {
  enter?: (previousState: GameState | null) => void;
  exit?: (nextState: GameState) => void;
  update?: (fixedDeltaSeconds: number) => void;
};

export type StateChangeListener = (
  newState: GameState,
  previousState: GameState | null
) => void;

export type AllowedTransitions = Partial<Record<GameState, GameState[]>>;

const defaultAllowedTransitions: Record<GameState, GameState[]> = {
  [GameState.LOADING]: [GameState.MENU],
  [GameState.MENU]: [GameState.PLAYING],
  [GameState.PLAYING]: [
    GameState.PAUSED,
    GameState.CHAPTER_TRANSITION,
    GameState.GAME_OVER,
    GameState.VICTORY
  ],
  [GameState.PAUSED]: [GameState.PLAYING, GameState.MENU],
  [GameState.CHAPTER_TRANSITION]: [
    GameState.PLAYING,
    GameState.GAME_OVER,
    GameState.VICTORY
  ],
  [GameState.GAME_OVER]: [GameState.MENU],
  [GameState.VICTORY]: [GameState.MENU]
};

export default class StateMachine {
  private currentState: GameState;
  private previousState: GameState | null = null;
  private lifecycles = new Map<GameState, StateLifecycle>();
  private listeners: StateChangeListener[] = [];
  private allowedTransitions: Record<GameState, GameState[]>;

  constructor(
    initialState: GameState,
    allowedTransitions: AllowedTransitions = {}
  ) {
    this.currentState = initialState;
    this.allowedTransitions = StateMachine.mergeTransitions(
      defaultAllowedTransitions,
      allowedTransitions
    );
  }

  public register(state: GameState, lifecycle: StateLifecycle): void {
    this.lifecycles.set(state, lifecycle);
  }

  public onChange(listener: StateChangeListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(existing => existing !== listener);
    };
  }

  public transitionTo(newState: GameState): void {
    if (newState === this.currentState) {
      return;
    }
    if (!this.isValidTransition(this.currentState, newState)) {
      throw new Error(
        `Invalid state transition ${this.currentState} -> ${newState}`
      );
    }

    const currentLifecycle = this.lifecycles.get(this.currentState);
    currentLifecycle?.exit?.(newState);

    this.previousState = this.currentState;
    this.currentState = newState;

    const nextLifecycle = this.lifecycles.get(newState);
    nextLifecycle?.enter?.(this.previousState);

    for (const listener of this.listeners) {
      listener(newState, this.previousState);
    }
  }

  public update(fixedDeltaSeconds: number): void {
    const lifecycle = this.lifecycles.get(this.currentState);
    lifecycle?.update?.(fixedDeltaSeconds);
  }

  public getCurrentState(): GameState {
    return this.currentState;
  }

  public getPreviousState(): GameState | null {
    return this.previousState;
  }

  public extendAllowedTransitions(transitions: AllowedTransitions): void {
    this.allowedTransitions = StateMachine.mergeTransitions(
      this.allowedTransitions,
      transitions
    );
  }

  public setAllowedTransitions(
    transitions: Record<GameState, GameState[]>
  ): void {
    this.allowedTransitions = { ...transitions };
  }

  private isValidTransition(from: GameState, to: GameState): boolean {
    const allowedForState = this.allowedTransitions[from] ?? [];
    return allowedForState.includes(to);
  }

  private static mergeTransitions(
    baseTransitions: Record<GameState, GameState[]>,
    extensionTransitions: AllowedTransitions
  ): Record<GameState, GameState[]> {
    const mergedTransitions: Record<GameState, GameState[]> = {
      ...baseTransitions
    };

    for (const [fromState, toStates] of Object.entries(
      extensionTransitions
    ) as [GameState, GameState[]][]) {
      if (!toStates) {
        continue;
      }
      const existingTargets = mergedTransitions[fromState] ?? [];
      const combinedTargets = new Set([...existingTargets, ...toStates]);
      mergedTransitions[fromState] = Array.from(combinedTargets);
    }

    return mergedTransitions;
  }
}
