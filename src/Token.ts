import fetch, {Response} from 'node-fetch';
import { authEndpoint, ResolvedConfig } from './Config';
import { basicAuth } from './Util';

interface TokenResponse {
	access_token: string;
}

const isTokenResponse = (x: unknown): x is TokenResponse =>
	typeof x === 'object'
	&& x !== null
	&& typeof (x as TokenResponse).access_token === 'string';

const isError = (x: unknown): x is Error =>
	x instanceof Error;

const parseResult = async (x: Response): Promise<string> => {
	let res: unknown;
	try {
		res = await x.json();
	} catch (e) {
		if (isError(e)) {
			throw e;
		}
		throw new Error(`Unknown error when parsing response as JSON: ${e}`);
	}
	if (isTokenResponse(res)) {
		return res.access_token
	}
	throw new Error(`Received invalid token response from API: ${res}`);
};

export const fetchToken = async (client: string, secret: string, c: ResolvedConfig): Promise<string> => {
	const url = authEndpoint(c);
	const x = await fetch(url, {
		headers: {
			Authorization: `Basic ${basicAuth(client, secret)}`,
			'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
		},
		body: 'grant_type=client_credentials',
	});
	if (x.ok) {
		return parseResult(x);
	}
	let res: string | Error | undefined;
	try {
		res = await x.text();
	} catch (e: unknown) {
		if (e instanceof Error) {
			res = e;
		}
	}
	const msg = res ? res : x.statusText;
	throw new Error(`Unable to fetch API token: ${x.status} - ${msg}`);
};
