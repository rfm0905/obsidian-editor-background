import { normalizePath, TFile } from 'obsidian';
import { requestUrl } from 'obsidian';

// What Electron Supports
export const IMAGE_EXT = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']);

// Result sum type for validation
export type URLResult = {
	imageURL: string | null;
	error: string | null;
};
const ok = (url: string): URLResult => ({ imageURL: url, error: null });
const err = (error: string): URLResult => ({ imageURL: null, error });

export const resolvePath = (path: string): URLResult => {
	const filePath = normalizePath(path.trim() || '');
	const file = app.vault.getAbstractFileByPath(filePath);
	if (!(file instanceof TFile)) {
		return err(`${filePath} not found in vault`);
	}
	const ext = file.extension.toLowerCase();
	if (!IMAGE_EXT.has(ext)) {
		// get list of extensions as string
		const supported = Array.from(IMAGE_EXT)
			.map((e) => `.${e}`)
			.join(', ');

		return err(
			`Unsupported image type .${ext}\n Supported types ${supported}`,
		);
	}
	const rp = app.vault.getResourcePath(file);

	return ok(rp);
};

// Validate and read remote file
export const resolveURL = async (link: string): Promise<URLResult> => {
	try {
		new URL(link);
	} catch {
		return err(`Invalid URL ${link}`);
	}

	let response;
	try {
		response = await requestUrl({
			url: link,
			method: 'GET',
			headers: { Range: 'bytes=0-2047' },
		});
	} catch (e) {
		return err(`Failed to fetch URL: ${e?.message ?? String(e)}`);
	}

	const contentType = (response.headers?.['content-type'] ??
		response.headers?.['Content-Type'] ??
		'') as string;

	if (!contentType.toLowerCase().startsWith('image/')) {
		return {
			imageURL: null,
			error: `URL does not return image (Content-Type: ${contentType || 'unknown'}).`,
		};
	}

	return ok(link);
};
