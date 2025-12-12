import { beforeEach, vi } from "vitest";

const localStorageStore = new Map<string, string>();

function createStubElement(id: string): HTMLElement {
  const element = document.createElement("div");
  element.id = id;
  return element;
}

class MockAudioContext {
  public readonly destination = {};

  createGain() {
    return {
      gain: { value: 1 },
      connect: vi.fn(),
    };
  }

  createOscillator() {
    return {
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      frequency: { value: 0 },
      type: "sine",
    };
  }
}

function installGlobalMocks() {
  vi.spyOn(document, "getElementById").mockImplementation((id: string) => {
    return createStubElement(id);
  });

  Object.defineProperty(globalThis, "localStorage", {
    value: {
      getItem: (key: string) => localStorageStore.get(key) ?? null,
      setItem: (key: string, value: string) => {
        localStorageStore.set(key, value);
      },
      removeItem: (key: string) => {
        localStorageStore.delete(key);
      },
      clear: () => {
        localStorageStore.clear();
      },
      key: (index: number) => Array.from(localStorageStore.keys())[index] ?? null,
      get length() {
        return localStorageStore.size;
      },
    },
    configurable: true,
  });

  Object.defineProperty(globalThis, "AudioContext", {
    value: MockAudioContext,
    configurable: true,
    writable: true,
  });

  const rafTimeouts = new Map<number, ReturnType<typeof setTimeout>>();
  let rafIdCounter = 1;

  Object.defineProperty(globalThis, "requestAnimationFrame", {
    value: (callback: FrameRequestCallback) => {
      const id = rafIdCounter++;
      const handle = setTimeout(() => callback(performance.now()), 0);
      rafTimeouts.set(id, handle);
      return id;
    },
    configurable: true,
    writable: true,
  });

  Object.defineProperty(globalThis, "cancelAnimationFrame", {
    value: (id: number) => {
      const handle = rafTimeouts.get(id);
      if (handle) clearTimeout(handle);
      rafTimeouts.delete(id);
    },
    configurable: true,
    writable: true,
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
  localStorageStore.clear();
  installGlobalMocks();
});

