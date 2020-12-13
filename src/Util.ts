export const basicAuth = (client: string, secret: string): string =>
	Buffer.from(`${client}:${secret}`).toString('base64')
