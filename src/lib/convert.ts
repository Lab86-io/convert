import { convertData } from "./engines/data";
import { convertDocument } from "./engines/document";
import { convertImage } from "./engines/image";
import { convertMedia } from "./engines/media";
import { convertText } from "./engines/text";
import type { ConversionPath, FormatDefinition } from "./formats";

export interface ConvertOptions {
	quality: number;
	onProgress?: (progress: number) => void;
}

export async function convertFile(
	file: File,
	source: FormatDefinition,
	target: FormatDefinition,
	path: ConversionPath,
	options: ConvertOptions,
): Promise<Blob> {
	options.onProgress?.(0.01);
	let result: Blob;
	switch (path.engine) {
		case "image":
			result = await convertImage(
				file,
				source,
				target,
				clampQuality(options.quality),
			);
			break;
		case "media":
			result = await convertMedia(
				file,
				target,
				clampQuality(options.quality),
				options.onProgress,
			);
			break;
		case "data":
			result = await convertData(file, source, target);
			break;
		case "text":
			result = await convertText(file, source, target);
			break;
		case "document":
			result = await convertDocument(file, source, target);
			break;
		default:
			throw new Error(`Unknown conversion engine: ${String(path.engine)}`);
	}
	options.onProgress?.(1);
	return result;
}

export function clampQuality(quality: number): number {
	if (!Number.isFinite(quality)) return 90;
	return Math.min(100, Math.max(1, Math.round(quality)));
}

export async function zipBlobs(
	entries: ReadonlyArray<{ name: string; blob: Blob }>,
): Promise<Blob> {
	const { downloadZip } = await import("client-zip");
	return downloadZip(
		entries.map(({ name, blob }) => ({ name, input: blob })),
	).blob();
}
