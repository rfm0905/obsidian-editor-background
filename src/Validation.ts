import { normalizePath, requestUrl } from 'obsidian';

// What Electron Supports
export const IMAGE_EXT = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']);

// Result sum type for validation
export type URLResult = {
	location: string | null;
	error: string | null;
};

const OK = (loc: string): URLResult => ({ location: loc, error: null });
const ERR = (message: string): URLResult => ({
	location: null,
	error: message,
});

export const resolvePath = async (path: string): Promise<URLResult> => {
	const filePath = normalizePath(path.trim() || '');

	// check extension
	const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
	if (!IMAGE_EXT.has(ext)) {
		const supported = Array.from(IMAGE_EXT)
			.map((e) => `.${e}`)
			.join(', ');

		return ERR(
			`Unsupported image type .${ext}\n Supported types ${supported}`,
		);
	}

	let MIMEType: string;
	switch (ext) {
		case 'png':
			MIMEType = 'image/png';
			break;
		case 'jpg':
		case 'jpeg':
			MIMEType = 'image/jpeg';
			break;
		case 'gif':
			MIMEType = 'image/gif';
			break;
		case 'webp':
			MIMEType = 'image/webp';
			break;
		case 'svg':
			MIMEType = 'image/svg+xml';
			break;
		default:
			MIMEType = 'application/octet-stream';
	}

	try {
		const data = await app.vault.adapter.readBinary(filePath);
		const blob = new Blob([data], { type: MIMEType });
		const url = URL.createObjectURL(blob);

		return OK(url);
	} catch (e) {
		return ERR(
			`Failed to read file: ${filePath} (${e?.message ?? String(e)})`,
		);
	}
};

// Validate and read remote file
export const resolveURL = async (link: string): Promise<URLResult> => {
	try {
		new URL(link);
	} catch {
		return ERR(`Invalid URL ${link}`);
	}

	let response;
	try {
		response = await requestUrl({
			url: link,
			method: 'GET',
			headers: { Range: 'bytes=0-2047' },
		});
	} catch (e) {
		return ERR(`Failed to fetch URL: ${e?.message ?? String(e)}`);
	}

	// get MIME content type
	const contentType =
		response.headers?.['content-type'] ??
		response.headers?.['Content-Type'];

	// validate image content-type
	if (!contentType || !contentType.toLowerCase().startsWith('image/')) {
		return ERR(`URL is not an Image (Content-Type: ${contentType ?? 'unknown'})`)
	}

	return OK(link);
};
