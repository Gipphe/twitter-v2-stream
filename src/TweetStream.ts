import { Writable } from 'stream';
import fetch, { RequestInit, Response } from 'node-fetch';
import AbortController from 'abort-controller';
import * as queryString from 'query-string';
import { StreamDelay } from './StreamDelay';
import { TweetListeners } from './TweetListeners';
import { Heartbeat, isKeepAliveToken } from './Heartbeat';
import { Config, resolveConfig, ResolvedConfig, streamEndpoint } from './Config';
import { fetchToken } from './Token';
import { ParsedQuery } from 'query-string';

export type ChunkConsumer = (data: string) => void;

interface TooManyRequestsResponse extends Response {
	status: 429;
}

const isTooManyRequestsResponse = (x: Response): x is TooManyRequestsResponse =>
	x.status === 429;

export class TweetStream {
	private listeners: TweetListeners = new TweetListeners();

	private streamDelay: StreamDelay = new StreamDelay();

	private hasInitialized = false;

	private config: ResolvedConfig;

	private token: string;

	private constructor(token: string, config: ResolvedConfig) {
		this.config = config;
		this.token = token;
	}

	private logTooManyRequests(_: TooManyRequestsResponse): void {
		this.config.logger('429: TooManyRequests');
	}

	private logHTTPError(e: Response): void {
		this.config.logger(`HTTP Error: ${e.status}`);
	}

	private logUnknown(e: unknown): void {
		this.config.logger(`Unknown error: ${e}`);
	}

	private fetchWithAuth(url: string, conf: RequestInit | undefined): Promise<Response> {
		return fetch(url, {
			headers: {
				Authorization: `Bearer ${this.token}`,
				...conf?.headers,
			},
			...conf,
		});
	}

	public static createWithToken(token: string, config: Config): TweetStream {
		return new TweetStream(token, resolveConfig(config));
	}

	public static async createWithCredentials(client: string, secret: string, config: Config): Promise<TweetStream> {
		const c = resolveConfig(config);
		const token = await fetchToken(client, secret, c);
		return new TweetStream(token, c);
	}

	private createWritableDelegator(heartbeat: Heartbeat): NodeJS.WritableStream {
		return new Writable({
			decodeStrings: false,
			write: (
				data: string,
				_enc?: unknown,
				cb?: (err?: Error | null) => void,
			): boolean => {
				if (isKeepAliveToken(data)) {
					heartbeat.stayinAlive();
					return true;
				}

				this.listeners.sendTweet(data);

				if (cb) {
					cb();
				}
				return true;
			},
		});
	}

	private async streamTweets(): Promise<void> {
		const controller = new AbortController();
		const heartbeat = new Heartbeat(controller);
		const endpoint = streamEndpoint(this.config);
		const url = queryString.stringifyUrl({
			url: endpoint,
			// query-string seems to be rather poorly typed, given its API defined on NPM. From
			// what I can tell, StreamOptions should conform to the kind of object expected by
			// query-string.
			query: this.config.streamOptions as ParsedQuery<string>,
		});
		heartbeat.start();
		const x = await this.fetchWithAuth(url, {
			method: 'GET',
			signal: controller.signal,
		});
		if (x.ok) {
			x.body
				.pipe(this.createWritableDelegator(heartbeat))
				.addListener('close', () => {
					heartbeat.end();
				});
		} else {
			heartbeat.end();
			throw x;
		}
	}

	private async tryStream(): Promise<void> {
		this.config.logger('Attempting stream...');
		try {
			await this.streamTweets();
			this.config.logger('Stream ended');
			this.streamDelay.reset();
		} catch (e: unknown) {
			if (e instanceof Response && isTooManyRequestsResponse(e)) {
				this.logTooManyRequests(e);
				this.streamDelay.waitAfterTooManyRequests((delay) => {
					const until = new Date(Date.now() + delay);
					this.listeners.sendWaiting(until);
					return () => this.tryStream();
				});
			} else if (e instanceof Response) {
				this.logHTTPError(e);
				this.streamDelay.waitAfterHTTPError((delay) => {
					this.listeners.sendWaiting(delay);
					return () => this.tryStream();
				});
			} else {
				this.logUnknown(e);
				this.streamDelay.waitAfterNetworkError((delay) => {
					this.listeners.sendWaiting(delay);
					return () => this.tryStream();
				});
			}
			return;
		}
		this.tryStream();
	}

	public registerListener = (f: ChunkConsumer): string => {
		const id = this.listeners.register(f);
		if (!this.hasInitialized) {
			this.config.logger('Starting stream fetch');
			this.hasInitialized = true;
			this.tryStream();
		}
		this.streamDelay.ifWaiting((delay) => this.listeners.sendWaiting(delay));
		return id;
	}

	public unregisterListener = (id: string): void => {
		this.listeners.unregister(id);
	}
}
