type Poolable = { active: boolean };

export default class ObjectPool<T extends Poolable> {
  private pool: T[] = [];
  private active: T[] = [];
  private activeCount = 0;
  private capacity: number;

  constructor(factory: () => T, capacity: number);
  constructor(instances: T[]);
  constructor(arg1: (() => T) | T[], capacity?: number) {
    if (Array.isArray(arg1)) {
      this.pool = arg1;
      this.capacity = arg1.length;
      for (const instance of this.pool) {
        instance.active = false;
      }
    } else {
      this.capacity = capacity ?? 0;
      for (let index = 0; index < this.capacity; index += 1) {
        const instance = arg1();
        instance.active = false;
        this.pool.push(instance);
      }
    }
  }

  public acquire(): T | null {
    for (const instance of this.pool) {
      if (!instance.active) {
        instance.active = true;
        this.active.push(instance);
        this.activeCount = this.active.length;
        return instance;
      }
    }
    return null;
  }

  public release(obj: T): void {
    if (!obj.active) {
      return;
    }
    obj.active = false;
    const activeIndex = this.active.indexOf(obj);
    if (activeIndex !== -1) {
      const lastIndex = this.active.length - 1;
      if (activeIndex !== lastIndex) {
        this.active[activeIndex] = this.active[lastIndex];
      }
      this.active.pop();
    }
    this.activeCount = this.active.length;
  }

  public getActive(): ReadonlyArray<T> {
    // Returned array is owned by the pool; treat it as read-only.
    return this.active;
  }

  public reset(): void {
    for (const instance of this.pool) {
      instance.active = false;
    }
    this.active.length = 0;
    this.activeCount = 0;
  }

  public getCapacity(): number {
    return this.capacity;
  }

  public getActiveCount(): number {
    return this.activeCount;
  }
}
