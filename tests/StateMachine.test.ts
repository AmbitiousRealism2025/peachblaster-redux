import StateMachine, { GameState } from "@/core/StateMachine";

describe("StateMachine", () => {
  it("initializes with the provided state", () => {
    const machine = new StateMachine(GameState.LOADING);
    expect(machine.getCurrentState()).toBe(GameState.LOADING);
    expect(machine.getPreviousState()).toBeNull();
  });

  it("allows valid transitions", () => {
    const machine = new StateMachine(GameState.LOADING);
    machine.transitionTo(GameState.MENU);
    expect(machine.getCurrentState()).toBe(GameState.MENU);

    const playing = new StateMachine(GameState.PLAYING);
    playing.transitionTo(GameState.PAUSED);
    expect(playing.getCurrentState()).toBe(GameState.PAUSED);
  });

  it("throws on invalid transitions", () => {
    const machine = new StateMachine(GameState.MENU);
    expect(() => machine.transitionTo(GameState.GAME_OVER)).toThrow(
      "Invalid state transition"
    );
  });

  it("fires exit/enter hooks in order with correct arguments", () => {
    const calls: string[] = [];
    const machine = new StateMachine(GameState.LOADING);

    machine.register(GameState.LOADING, {
      exit: nextState => calls.push(`exit:LOADING->${nextState}`)
    });
    machine.register(GameState.MENU, {
      enter: previousState => calls.push(`enter:MENU<-` + previousState)
    });
    machine.onChange((newState, previousState) => {
      calls.push(`listener:${previousState}->${newState}`);
    });

    machine.transitionTo(GameState.MENU);

    expect(calls).toEqual([
      `exit:LOADING->${GameState.MENU}`,
      `enter:MENU<-${GameState.LOADING}`,
      `listener:${GameState.LOADING}->${GameState.MENU}`
    ]);
  });

  it("calls the current state's update hook", () => {
    const machine = new StateMachine(GameState.PLAYING);
    const update = vi.fn();
    machine.register(GameState.PLAYING, { update });

    machine.update(0.016);
    expect(update).toHaveBeenCalledWith(0.016);
  });

  it("notifies listeners and supports unsubscribe", () => {
    const machine = new StateMachine(GameState.LOADING);
    const listener = vi.fn();

    const unsubscribe = machine.onChange(listener);
    machine.transitionTo(GameState.MENU);

    expect(listener).toHaveBeenCalledWith(GameState.MENU, GameState.LOADING);

    unsubscribe();
    machine.transitionTo(GameState.PLAYING);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("extends allowed transitions by merging targets", () => {
    const machine = new StateMachine(GameState.MENU);
    machine.extendAllowedTransitions({
      [GameState.MENU]: [GameState.GAME_OVER]
    });

    machine.transitionTo(GameState.GAME_OVER);
    expect(machine.getCurrentState()).toBe(GameState.GAME_OVER);
  });
});

