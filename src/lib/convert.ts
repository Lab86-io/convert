import type { Converter } from "./formats";

/**
 * Converts a source file to the converter's target format, entirely in the
 * browser. Codec code is imported dynamically so it never runs during SSR
 * and stays out of the initial bundle.
 */
export async function convertFile(
	file: Blob,
	converter: Converter,
	/** Quality from 1–100; only used for lossy targets. */
	quality: number,
): Promise<Blob> {
	switch (converter.id) {
		case "heic-to-jpeg": {
			const { heicTo } = await import("heic-to");
			return heicTo({
				blob: file,
				type: "image/jpeg",
				quality: clampQuality(quality) / 100,
			});
		}
		default:
			throw new Error(`Unknown converter: ${converter.id}`);
	}
}

export function clampQuality(quality: number): number {
	if (!Number.isFinite(quality)) return 90;
	return Math.min(100, Math.max(1, Math.round(quality)));
}

/** Zips named blobs and returns the archive; used for "Download all". */
export async function zipBlobs(
	entries: ReadonlyArray<{ name: string; blob: Blob }>,
): Promise<Blob> {
	const { downloadZip } = await import("client-zip");
	return downloadZip(
		entries.map(({ name, blob }) => ({ name, input: blob })),
	).blob();
}
