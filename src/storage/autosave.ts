// A single serial writer prevents an older asynchronous save from winning a race.
export class Autosave<T> {
  private timer: ReturnType<typeof setTimeout> | undefined;
  private pending: T | undefined;
  private revision = 0;
  private chain: Promise<void> = Promise.resolve();
  constructor(
    private write: (value: T) => Promise<void>,
    private onError: (error: unknown) => void,
    private delay = 600,
  ) {}
  schedule(value: T) {
    this.revision += 1;
    this.pending = value;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      void this.flush().catch(this.onError);
    }, this.delay);
  }
  flush(): Promise<void> {
    clearTimeout(this.timer);
    if (this.pending === undefined) {
      return this.chain;
    }
    const value = this.pending;
    const revision = this.revision;
    this.pending = undefined;
    this.chain = this.chain
      .catch(() => {})
      .then(() => this.write(value))
      .catch(error => {
        if (this.pending === undefined && revision === this.revision) {
          this.pending = value;
        }
        throw error;
      });
    return this.chain;
  }
}
