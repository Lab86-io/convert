/**
 * Format registry for lab86 convert.
 *
 * Each converter pairs a source format with a target format. The app is
 * intentionally structured so more pairs (e.g. WebP → PNG) can be added
 * later by registering another `Converter` and its conversion routine.
 */

export interface SourceFormat {
	id: string;
	label: string;
	/** Lowercase extensions including the leading dot. */
	extensions: readonly string[];
	/** MIME types browsers may report for this format. */
	mimeTypes: readonly string[];
}

export interface TargetFormat {
	id: string;
	label: string;
	extension: string;
	mimeType: string;
	/** Whether a quality setting applies. */
	lossy: boolean;
}

export interface Converter {
	id: string;
	source: SourceFormat;
	target: TargetFormat;
}

export const heicSource: SourceFormat = {
	id: "heic",
	label: "HEIC / HEIF",
	extensions: [".heic", ".heif"],
	mimeTypes: [
		"image/heic",
		"image/heif",
		"image/heic-sequence",
		"image/heif-sequence",
	],
};

export const jpegTarget: TargetFormat = {
	id: "jpeg",
	label: "JPEG",
	extension: ".jpg",
	mimeType: "image/jpeg",
	lossy: true,
};

export const heicToJpeg: Converter = {
	id: "heic-to-jpeg",
	source: heicSource,
	target: jpegTarget,
};

/** Value for an `<input accept>` attribute covering MIME types and extensions. */
export function acceptAttribute(source: SourceFormat): string {
	return [...source.mimeTypes, ...source.extensions].join(",");
}

function extensionOf(name: string): string {
	const dot = name.lastIndexOf(".");
	return dot === -1 ? "" : name.slice(dot).toLowerCase();
}

/**
 * Whether a file belongs to the source format. Some browsers hand over an
 * empty or generic MIME type for HEIC files, so the extension is checked too.
 */
export function isAcceptedFile(
	file: { name: string; type: string },
	source: SourceFormat,
): boolean {
	if (source.mimeTypes.includes(file.type.toLowerCase())) return true;
	return source.extensions.includes(extensionOf(file.name));
}

export interface SplitFiles {
	accepted: File[];
	rejected: File[];
}

export function splitAcceptedFiles(
	files: Iterable<File>,
	source: SourceFormat,
): SplitFiles {
	const accepted: File[] = [];
	const rejected: File[] = [];
	for (const file of files) {
		(isAcceptedFile(file, source) ? accepted : rejected).push(file);
	}
	return { accepted, rejected };
}

/** `IMG_0123.HEIC` → `IMG_0123.jpg`; unknown extensions keep their base name. */
export function outputFileName(
	inputName: string,
	source: SourceFormat,
	target: TargetFormat,
): string {
	const ext = extensionOf(inputName);
	const base = source.extensions.includes(ext)
		? inputName.slice(0, inputName.length - ext.length)
		: inputName;
	return `${base || "converted"}${target.extension}`;
}

/** Deduplicates names by inserting ` (n)` before the extension. */
export function uniqueFileNames(names: readonly string[]): string[] {
	const seen = new Map<string, number>();
	return names.map((name) => {
		const count = seen.get(name) ?? 0;
		seen.set(name, count + 1);
		if (count === 0) return name;
		const ext = extensionOf(name);
		const base = ext ? name.slice(0, name.length - ext.length) : name;
		return `${base} (${count + 1})${ext}`;
	});
}

export function formatBytes(bytes: number): string {
	if (!Number.isFinite(bytes) || bytes < 0) return "—";
	if (bytes < 1024) return `${bytes} B`;
	const kb = bytes / 1024;
	if (kb < 1024) return `${kb >= 100 ? Math.round(kb) : kb.toFixed(1)} KB`;
	const mb = kb / 1024;
	if (mb < 1024) return `${mb >= 100 ? Math.round(mb) : mb.toFixed(1)} MB`;
	return `${(mb / 1024).toFixed(2)} GB`;
}

/** Percentage size change, negative when the output is smaller. */
export function sizeChangePercent(
	inputBytes: number,
	outputBytes: number,
): number | null {
	if (inputBytes <= 0) return null;
	return Math.round(((outputBytes - inputBytes) / inputBytes) * 100);
}
