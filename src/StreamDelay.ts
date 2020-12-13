export type DelayResetter = () => void;
export type DelayHandler<T> = (delay: number) => (resetDelay: DelayResetter) => T;
export type SetTimeoutType<T> = (fn: () => void, ms: number) => T;
export type ClearTimeoutType<T> = (timer: T) => void;

export class StreamDelay<T = NodeJS.Timeout> {
	private isWaiting = false;

	private timer: T | null = null;

	private delay = 0;

	private setTimeout: SetTimeoutType<T>;

	private clearTimeout: ClearTimeoutType<T>;

	private constructor(
		timeoutFn: SetTimeoutType<T>,
		clearTimeoutFn: ClearTimeoutType<T>,
	) {
		this.setTimeout = timeoutFn;
		this.clearTimeout = clearTimeoutFn;
	}

	public static createStreamDelayWithFns<T>(
		timeoutFn: SetTimeoutType<T>,
		clearTimeoutFn: ClearTimeoutType<T>,
	): StreamDelay<T> {
		return new StreamDelay(timeoutFn, clearTimeoutFn);
	}

	public static createStreamDelay(): StreamDelay<NodeJS.Timeout> {
		return new StreamDelay(setTimeout, clearTimeout);
	}

	private incDelay(f: (x: number) => number): void {
		this.delay = f(this.delay);
	}

	private resetDelay(): void {
		this.delay = 0;
	}

	private clearTimer(): void {
		if (this.timer !== null) {
			this.clearTimeout(this.timer);
			this.timer = null;
		}
	}

	private incDelayNetworkError(): void {
		this.incDelay((x) => Math.min(x + 250, 16000));
	}

	private incDelayHTTPError(): void {
		this.incDelay((x) => Math.max(
			5000,
			Math.min(x * 2, 320000),
		));
	}

	private incDelayTooManyRequests(): void {
		this.incDelay((x) => Math.max(60000, x * 2));
	}

	private waitForDelay<T>(runBeforeDelay: DelayHandler<T>): Promise<T> {
		this.isWaiting = true;
		const untilDate = new Date(Date.now() + this.delay);
		console.log(`Waiting until ${untilDate.toISOString()}`);
		const runAfterDelay = runBeforeDelay(this.delay);
		return new Promise((resolve) => {
			this.timer = this.setTimeout(() => {
				this.isWaiting = false;
				resolve(runAfterDelay(this.resetDelay.bind(this)));
			}, this.delay);
		});
	}

	private async waitAndInc<T>(f: DelayHandler<T>, incFn: () => void): Promise<T> {
		const x = await this.waitForDelay(f);
		incFn();
		return x;
	}

	public async waitAfterTooManyRequests<T>(f: DelayHandler<T>): Promise<T> {
		return this.waitAndInc(f, this.incDelayTooManyRequests.bind(this));
	}

	public async waitAfterNetworkError<T>(f: DelayHandler<T>): Promise<T> {
		return this.waitAndInc(f, this.incDelayNetworkError.bind(this));
	}

	public async waitAfterHTTPError<T>(f: DelayHandler<T>): Promise<T> {
		return this.waitAndInc(f, this.incDelayHTTPError.bind(this));
	}

	public ifWaiting(f: (delay: number) => void): void {
		if (this.isWaiting) {
			f(this.delay);
		}
	}

	public reset(): void {
		this.resetDelay();
		this.clearTimer();
	}
}
