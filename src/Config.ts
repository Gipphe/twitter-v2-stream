import { StreamOptions } from "./StreamOptions";

const trimSlash = (x: string): string => {
	if (x.endsWith('/')) {
		return x.slice(0, -1);
	}
	return x;
}

export interface Config {
	apiBaseUrl?: string;
	streamOptions?: StreamOptions;
	logger?: (msg: string) => void;
}

export const isConfig = (x: unknown): x is Config => {
	if (typeof x === 'object' && x !== null) {
		return false;
	}
	const y = x as Config;

	return typeof y.apiBaseUrl === 'string'
		&& (  typeof y.logger === 'function'
		   || typeof y.logger === 'undefined'
		   );
};

export interface ResolvedConfig {
	apiBaseUrl: string;
	streamOptions: StreamOptions;
	logger: (msg: string) => void;
}

export const resolveConfig = (c: Config): ResolvedConfig => ({
	apiBaseUrl: trimSlash(c.apiBaseUrl || 'https://api.twitter.com'),
	streamOptions: c.streamOptions || {},
	logger: c.logger || (() => {}),
});

export const streamEndpoint = (c: ResolvedConfig): string =>
	`${c.apiBaseUrl}/2/tweets/search/stream`;

export const ruleEndpoint = (c: ResolvedConfig): string =>
	`${c.apiBaseUrl}/2/tweets/search/stream/rules`;

export const authEndpoint = (c: ResolvedConfig): string =>
	`${c.apiBaseUrl}/oauth2/token`;
