export type FormatCategory =
	| "image"
	| "audio"
	| "video"
	| "data"
	| "text"
	| "document";

export type EngineId =
	| "image"
	| "media"
	| "data"
	| "text"
	| "document"
	| "zoom";

export interface FormatDefinition {
	id: string;
	label: string;
	category: FormatCategory;
	extensions: readonly string[];
	mimeTypes: readonly string[];
	canInput: boolean;
	canOutput: boolean;
}

export interface ConversionPath {
	id: string;
	sourceId: string;
	targetId: string;
	engine: EngineId;
	fidelity: "lossless" | "lossy" | "structural";
	note?: string;
}

const define = (
	format: Omit<FormatDefinition, "canInput" | "canOutput"> &
		Partial<Pick<FormatDefinition, "canInput" | "canOutput">>,
): FormatDefinition => ({ canInput: true, canOutput: true, ...format });

export const formats: readonly FormatDefinition[] = [
	define({
		id: "heic",
		label: "HEIC / HEIF",
		category: "image",
		extensions: [".heic", ".heif"],
		mimeTypes: [
			"image/heic",
			"image/heif",
			"image/heic-sequence",
			"image/heif-sequence",
		],
		canOutput: false,
	}),
	define({
		id: "jpeg",
		label: "JPEG",
		category: "image",
		extensions: [".jpg", ".jpeg", ".jpe"],
		mimeTypes: ["image/jpeg"],
	}),
	define({
		id: "png",
		label: "PNG",
		category: "image",
		extensions: [".png"],
		mimeTypes: ["image/png"],
	}),
	define({
		id: "webp",
		label: "WebP",
		category: "image",
		extensions: [".webp"],
		mimeTypes: ["image/webp"],
	}),
	define({
		id: "avif",
		label: "AVIF",
		category: "image",
		extensions: [".avif"],
		mimeTypes: ["image/avif"],
		canOutput: false,
	}),
	define({
		id: "gif",
		label: "GIF",
		category: "image",
		extensions: [".gif"],
		mimeTypes: ["image/gif"],
	}),
	define({
		id: "bmp",
		label: "BMP",
		category: "image",
		extensions: [".bmp"],
		mimeTypes: ["image/bmp", "image/x-ms-bmp"],
		canOutput: false,
	}),
	define({
		id: "mp3",
		label: "MP3",
		category: "audio",
		extensions: [".mp3"],
		mimeTypes: ["audio/mpeg"],
	}),
	define({
		id: "wav",
		label: "WAV",
		category: "audio",
		extensions: [".wav"],
		mimeTypes: ["audio/wav", "audio/x-wav"],
	}),
	define({
		id: "flac",
		label: "FLAC",
		category: "audio",
		extensions: [".flac"],
		mimeTypes: ["audio/flac"],
	}),
	define({
		id: "aac",
		label: "AAC",
		category: "audio",
		extensions: [".aac"],
		mimeTypes: ["audio/aac"],
		canOutput: false,
	}),
	define({
		id: "m4a",
		label: "M4A",
		category: "audio",
		extensions: [".m4a"],
		mimeTypes: ["audio/mp4", "audio/x-m4a"],
	}),
	define({
		id: "ogg",
		label: "Ogg Vorbis",
		category: "audio",
		extensions: [".ogg", ".oga"],
		mimeTypes: ["audio/ogg"],
	}),
	define({
		id: "opus",
		label: "Opus",
		category: "audio",
		extensions: [".opus"],
		mimeTypes: ["audio/opus"],
	}),
	define({
		id: "mp4",
		label: "MP4",
		category: "video",
		extensions: [".mp4", ".m4v"],
		mimeTypes: ["video/mp4"],
	}),
	define({
		id: "mov",
		label: "QuickTime MOV",
		category: "video",
		extensions: [".mov", ".qt"],
		mimeTypes: ["video/quicktime"],
		canOutput: false,
	}),
	define({
		id: "webm",
		label: "WebM",
		category: "video",
		extensions: [".webm"],
		mimeTypes: ["video/webm"],
	}),
	define({
		id: "mkv",
		label: "Matroska MKV",
		category: "video",
		extensions: [".mkv"],
		mimeTypes: ["video/x-matroska"],
		canOutput: false,
	}),
	define({
		id: "avi",
		label: "AVI",
		category: "video",
		extensions: [".avi"],
		mimeTypes: ["video/x-msvideo"],
		canOutput: false,
	}),
	define({
		id: "mpeg",
		label: "MPEG",
		category: "video",
		extensions: [".mpeg", ".mpg"],
		mimeTypes: ["video/mpeg"],
		canOutput: false,
	}),
	define({
		id: "zoom",
		label: "Unconverted Zoom recording",
		category: "video",
		extensions: [".zoom"],
		mimeTypes: ["application/octet-stream"],
		canOutput: false,
	}),
	define({
		id: "json",
		label: "JSON",
		category: "data",
		extensions: [".json"],
		mimeTypes: ["application/json", "text/json"],
	}),
	define({
		id: "yaml",
		label: "YAML",
		category: "data",
		extensions: [".yaml", ".yml"],
		mimeTypes: ["application/yaml", "text/yaml", "text/x-yaml"],
	}),
	define({
		id: "csv",
		label: "CSV",
		category: "data",
		extensions: [".csv"],
		mimeTypes: ["text/csv"],
	}),
	define({
		id: "xml",
		label: "XML",
		category: "data",
		extensions: [".xml"],
		mimeTypes: ["application/xml", "text/xml"],
	}),
	define({
		id: "txt",
		label: "Plain text",
		category: "text",
		extensions: [".txt"],
		mimeTypes: ["text/plain"],
	}),
	define({
		id: "md",
		label: "Markdown",
		category: "text",
		extensions: [".md", ".markdown"],
		mimeTypes: ["text/markdown", "text/x-markdown"],
	}),
	define({
		id: "html",
		label: "HTML",
		category: "text",
		extensions: [".html", ".htm"],
		mimeTypes: ["text/html"],
	}),
	define({
		id: "pdf",
		label: "PDF",
		category: "document",
		extensions: [".pdf"],
		mimeTypes: ["application/pdf"],
	}),
	define({
		id: "docx",
		label: "Word DOCX",
		category: "document",
		extensions: [".docx"],
		mimeTypes: [
			"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		],
		canOutput: false,
	}),
];

export const formatsById = new Map(
	formats.map((format) => [format.id, format]),
);

const outputIds = {
	image: ["jpeg", "png", "webp", "pdf"],
	audio: ["mp3", "wav", "flac", "m4a", "ogg", "opus"],
	video: ["mp4", "webm", "gif", "mp3", "wav", "m4a", "ogg", "opus"],
	data: ["json", "yaml", "csv", "xml"],
	text: ["txt", "md", "html"],
} as const;

function path(
	sourceId: string,
	targetId: string,
	engine: EngineId,
	fidelity: ConversionPath["fidelity"],
	note?: string,
): ConversionPath {
	return {
		id: `${sourceId}-to-${targetId}`,
		sourceId,
		targetId,
		engine,
		fidelity,
		note,
	};
}

const imageSources = ["heic", "jpeg", "png", "webp", "avif", "gif", "bmp"];
const audioSources = ["mp3", "wav", "flac", "aac", "m4a", "ogg", "opus"];
const videoSources = ["mp4", "mov", "webm", "mkv", "avi", "mpeg"];
const dataSources = ["json", "yaml", "csv", "xml"];
const textSources = ["txt", "md", "html"];

export const conversionPaths: readonly ConversionPath[] = [
	...imageSources.flatMap((sourceId) =>
		outputIds.image
			.filter((targetId) => targetId !== sourceId)
			.map((targetId) =>
				path(
					sourceId,
					targetId,
					"image",
					targetId === "jpeg" || targetId === "webp" ? "lossy" : "structural",
					sourceId === "gif"
						? "Animated GIFs are converted from their first frame."
						: undefined,
				),
			),
	),
	...audioSources.flatMap((sourceId) =>
		outputIds.audio
			.filter((targetId) => targetId !== sourceId)
			.map((targetId) =>
				path(
					sourceId,
					targetId,
					"media",
					targetId === "wav" || targetId === "flac" ? "structural" : "lossy",
				),
			),
	),
	...videoSources.flatMap((sourceId) =>
		outputIds.video
			.filter((targetId) => targetId !== sourceId)
			.map((targetId) =>
				path(
					sourceId,
					targetId,
					"media",
					"lossy",
					["mp3", "wav", "m4a", "ogg", "opus"].includes(targetId)
						? "The audio track will be extracted from this video."
						: undefined,
				),
			),
	),
	...dataSources.flatMap((sourceId) =>
		outputIds.data
			.filter((targetId) => targetId !== sourceId)
			.map((targetId) =>
				path(
					sourceId,
					targetId,
					"data",
					"structural",
					targetId === "csv"
						? "CSV works best with a list of similarly shaped records."
						: undefined,
				),
			),
	),
	...textSources.flatMap((sourceId) =>
		outputIds.text
			.filter((targetId) => targetId !== sourceId)
			.map((targetId) => path(sourceId, targetId, "text", "structural")),
	),
	path(
		"docx",
		"html",
		"document",
		"structural",
		"Complex Word layouts may be simplified.",
	),
	path(
		"docx",
		"txt",
		"document",
		"structural",
		"Complex Word layouts may be simplified.",
	),
	path(
		"docx",
		"md",
		"document",
		"structural",
		"Complex Word layouts may be simplified.",
	),
	path(
		"pdf",
		"txt",
		"document",
		"structural",
		"Scanned PDFs need OCR and may not contain extractable text.",
	),
	path(
		"zoom",
		"mp4",
		"zoom",
		"lossy",
		"Recovers camera and screen tracks into one gallery MP4 with the original audio.",
	),
	path(
		"zoom",
		"m4a",
		"zoom",
		"lossy",
		"Recovers only the recording's audio track.",
	),
	path(
		"zoom",
		"wav",
		"zoom",
		"structural",
		"Recovers the original 16-bit PCM audio into a standard WAV file.",
	),
];

const pathsBySource = new Map<string, ConversionPath[]>();
for (const conversionPath of conversionPaths) {
	const current = pathsBySource.get(conversionPath.sourceId) ?? [];
	current.push(conversionPath);
	pathsBySource.set(conversionPath.sourceId, current);
}

const recommendedTargets: Record<string, string> = {
	heic: "jpeg",
	jpeg: "webp",
	png: "webp",
	webp: "png",
	avif: "jpeg",
	gif: "webp",
	bmp: "png",
	mp3: "wav",
	wav: "mp3",
	flac: "mp3",
	aac: "mp3",
	m4a: "mp3",
	ogg: "mp3",
	opus: "mp3",
	mp4: "webm",
	mov: "mp4",
	webm: "mp4",
	mkv: "mp4",
	avi: "mp4",
	mpeg: "mp4",
	zoom: "mp4",
	json: "yaml",
	yaml: "json",
	csv: "json",
	xml: "json",
	txt: "html",
	md: "html",
	html: "md",
	docx: "html",
	pdf: "txt",
};

export function extensionOf(name: string): string {
	const dot = name.lastIndexOf(".");
	return dot === -1 ? "" : name.slice(dot).toLowerCase();
}

export function detectFormat(file: {
	name: string;
	type: string;
}): FormatDefinition | null {
	const extension = extensionOf(file.name);
	const byExtension = formats.find(
		(format) => format.canInput && format.extensions.includes(extension),
	);
	if (byExtension) return byExtension;
	const mime = file.type.toLowerCase();
	if (!mime || mime === "application/octet-stream") return null;
	return (
		formats.find(
			(format) => format.canInput && format.mimeTypes.includes(mime),
		) ?? null
	);
}

export function getCompatiblePaths(
	sourceId: string,
): readonly ConversionPath[] {
	return pathsBySource.get(sourceId) ?? [];
}

export function getCompatibleTargets(sourceId: string): FormatDefinition[] {
	return getCompatiblePaths(sourceId)
		.map((item) => formatsById.get(item.targetId))
		.filter((item): item is FormatDefinition => Boolean(item));
}

export function getConversionPath(
	sourceId: string,
	targetId: string,
): ConversionPath | null {
	return (
		getCompatiblePaths(sourceId).find((item) => item.targetId === targetId) ??
		null
	);
}

export function getRecommendedTarget(sourceId: string): FormatDefinition {
	const targetId =
		recommendedTargets[sourceId] ?? getCompatiblePaths(sourceId)[0]?.targetId;
	const target = targetId ? formatsById.get(targetId) : undefined;
	if (!target) throw new Error(`No compatible output for ${sourceId}`);
	return target;
}

export function universalAcceptAttribute(): string {
	return [
		...new Set(
			formats
				.filter((format) => format.canInput)
				.flatMap((format) => [...format.mimeTypes, ...format.extensions]),
		),
	].join(",");
}

export function outputFileName(
	inputName: string,
	source: FormatDefinition,
	target: FormatDefinition,
): string {
	if (
		source.id === "zoom" &&
		/^double_click_to_convert_0?1\.zoom$/i.test(inputName)
	)
		return `recovered-recording${target.extensions[0]}`;
	const extension = extensionOf(inputName);
	const base = source.extensions.includes(extension)
		? inputName.slice(0, inputName.length - extension.length)
		: inputName;
	return `${base || "converted"}${target.extensions[0]}`;
}

export function uniqueFileNames(names: readonly string[]): string[] {
	const seen = new Map<string, number>();
	return names.map((name) => {
		const count = seen.get(name) ?? 0;
		seen.set(name, count + 1);
		if (count === 0) return name;
		const extension = extensionOf(name);
		const base = extension
			? name.slice(0, name.length - extension.length)
			: name;
		return `${base} (${count + 1})${extension}`;
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

export function sizeChangePercent(
	inputBytes: number,
	outputBytes: number,
): number | null {
	if (inputBytes <= 0) return null;
	return Math.round(((outputBytes - inputBytes) / inputBytes) * 100);
}

export const categoryLabels: Record<FormatCategory, string> = {
	image: "Images",
	audio: "Audio",
	video: "Video",
	data: "Data",
	text: "Text & markup",
	document: "Documents",
};
