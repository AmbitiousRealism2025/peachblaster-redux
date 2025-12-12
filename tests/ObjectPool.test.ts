import ObjectPool from "@/systems/ObjectPool";

type MockPoolable = {
  active: boolean;
  id: number;
};

describe("ObjectPool", () => {
  it("initializes from a factory and capacity", () => {
    let nextId = 0;
    const pool = new ObjectPool<MockPoolable>(
      () => ({ active: true, id: nextId++ }),
      3
    );

    expect(pool.getCapacity()).toBe(3);
    expect(pool.getActiveCount()).toBe(0);
    expect(pool.getActive()).toHaveLength(0);
  });

  it("initializes from an instances array and deactivates them", () => {
    const instances: MockPoolable[] = [
      { active: true, id: 1 },
      { active: true, id: 2 },
      { active: true, id: 3 }
    ];
    const pool = new ObjectPool(instances);

    expect(pool.getCapacity()).toBe(3);
    expect(instances.every(instance => instance.active === false)).toBe(true);
    expect(pool.getActiveCount()).toBe(0);
  });

  it("acquires inactive instances and marks them active", () => {
    const pool = new ObjectPool<MockPoolable>(
      () => ({ active: false, id: 1 }),
      2
    );

    const a = pool.acquire();
    const b = pool.acquire();

    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect(a?.active).toBe(true);
    expect(b?.active).toBe(true);
    expect(pool.getActiveCount()).toBe(2);
    expect(pool.getActive()).toHaveLength(2);
  });

  it("returns null when the pool is exhausted", () => {
    const pool = new ObjectPool<MockPoolable>(
      () => ({ active: false, id: 0 }),
      1
    );

    expect(pool.acquire()).not.toBeNull();
    expect(pool.acquire()).toBeNull();
  });

  it("releases instances and removes them from the active list", () => {
    const pool = new ObjectPool<MockPoolable>(
      () => ({ active: false, id: 0 }),
      3
    );

    const first = pool.acquire()!;
    const middle = pool.acquire()!;
    const last = pool.acquire()!;

    expect(pool.getActiveCount()).toBe(3);

    pool.release(middle);

    expect(middle.active).toBe(false);
    expect(pool.getActiveCount()).toBe(2);
    expect(pool.getActive().includes(middle)).toBe(false);

    pool.release(first);
    pool.release(last);
    expect(pool.getActiveCount()).toBe(0);
  });

  it("handles double-release gracefully", () => {
    const pool = new ObjectPool<MockPoolable>(
      () => ({ active: false, id: 0 }),
      1
    );

    const instance = pool.acquire()!;
    pool.release(instance);

    expect(() => pool.release(instance)).not.toThrow();
    expect(pool.getActiveCount()).toBe(0);
  });

  it("resets all instances and clears active tracking", () => {
    const pool = new ObjectPool<MockPoolable>(
      () => ({ active: false, id: 0 }),
      2
    );
    const a = pool.acquire()!;
    pool.acquire();

    expect(pool.getActiveCount()).toBe(2);

    pool.reset();

    expect(a.active).toBe(false);
    expect(pool.getActiveCount()).toBe(0);
    expect(pool.getActive()).toHaveLength(0);
  });
});
