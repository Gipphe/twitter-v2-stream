import anyTest, { TestInterface } from 'ava';
import timers, { InstalledClock } from '@sinonjs/fake-timers';
import {ClearTimeoutType, SetTimeoutType, StreamDelay} from '../src/StreamDelay';

const test = anyTest as TestInterface<{clock: InstalledClock}>;

test('Does not start without call', t => {
	const clock = timers.createClock();
	StreamDelay.createStreamDelayWithFns(
		clock.setTimeout as SetTimeoutType<number>,
		clock.clearTimeout as ClearTimeoutType<number>,
	);
	t.deepEqual(clock.countTimers(), 0);
});

test('Does not wait on first waitAfterNetworkError call', t => {
	const clock = timers.createClock();
	const sd = StreamDelay.createStreamDelayWithFns<number>(
		clock.setTimeout.bind(clock) as SetTimeoutType<number>,
		clock.clearTimeout.bind(clock) as ClearTimeoutType<number>,
	);
	const p = sd.waitAfterNetworkError((delay: number) => {
		return () => {
			t.deepEqual(delay, 0);
			t.deepEqual(clock.now, 0);
		};
	});
	clock.tick(10);
	return p;
});

test.todo('Waits 5 seconds on first waitAfterHTTPError call')

test.todo('Waits 60 seconds on first waitAfterTooManyRequests call')
