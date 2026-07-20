import type { FormatDefinition } from "../formats";

type ProgressCallback = (progress: number) => void;

let ffmpegPromise: Promise<import("@ffmpeg/ffmpeg").FFmpeg> | null = null;

async function getFfmpeg(onProgress?: ProgressCallback) {
	if (!ffmpegPromise) {
		ffmpegPromise = (async () => {
			onProgress?.(0.02);
			const { FFmpeg } = await import("@ffmpeg/ffmpeg");
			const ffmpeg = new FFmpeg();
			await ffmpeg.load({
				coreURL: "/ffmpeg/ffmpeg-core.js",
				wasmURL: "/ffmpeg/ffmpeg-core.wasm",
			});
			return ffmpeg;
		})();
	}
	return ffmpegPromise;
}

function mediaArgs(target: FormatDefinition, quality: number): string[] {
	const normalized = Math.min(100, Math.max(1, quality));
	const audioBitrate = Math.round(96 + (normalized / 100) * 160);
	const crf = Math.round(36 - (normalized / 100) * 18);

	switch (target.id) {
		case "mp3":
			return ["-vn", "-c:a", "libmp3lame", "-b:a", `${audioBitrate}k`];
		case "wav":
			return ["-vn", "-c:a", "pcm_s16le"];
		case "flac":
			return ["-vn", "-c:a", "flac"];
		case "m4a":
			return ["-vn", "-c:a", "aac", "-b:a", `${audioBitrate}k`];
		case "ogg":
			return [
				"-vn",
				"-c:a",
				"libvorbis",
				"-q:a",
				`${Math.max(2, Math.round(normalized / 10))}`,
			];
		case "opus":
			return ["-vn", "-c:a", "libopus", "-b:a", `${audioBitrate}k`];
		case "mp4":
			return [
				"-c:v",
				"libx264",
				"-preset",
				"ultrafast",
				"-crf",
				`${crf}`,
				"-c:a",
				"aac",
				"-movflags",
				"+faststart",
			];
		case "webm":
			return [
				"-c:v",
				"libvpx-vp9",
				"-crf",
				`${Math.min(45, crf + 8)}`,
				"-b:v",
				"0",
				"-c:a",
				"libopus",
			];
		case "gif":
			return [
				"-vf",
				"fps=12,scale='min(960,iw)':-2:flags=lanczos",
				"-loop",
				"0",
			];
		default:
			throw new Error(`Unsupported media output: ${target.label}`);
	}
}

export async function convertMedia(
	file: File,
	target: FormatDefinition,
	quality: number,
	onProgress?: ProgressCallback,
): Promise<Blob> {
	if (file.size > 500 * 1024 * 1024)
		throw new Error("Browser media conversion is limited to 500 MB per file.");
	const ffmpeg = await getFfmpeg(onProgress);
	const token = crypto.randomUUID().replaceAll("-", "");
	const sourceExtension = file.name.includes(".")
		? file.name.slice(file.name.lastIndexOf("."))
		: ".bin";
	const inputName = `input-${token}${sourceExtension}`;
	const outputName = `output-${token}${target.extensions[0]}`;
	const progressHandler = ({ progress }: { progress: number }) =>
		onProgress?.(Math.max(0.08, Math.min(0.98, progress)));
	ffmpeg.on("progress", progressHandler);
	try {
		await ffmpeg.writeFile(inputName, new Uint8Array(await file.arrayBuffer()));
		const exitCode = await ffmpeg.exec(
			["-i", inputName, ...mediaArgs(target, quality), outputName],
			10 * 60 * 1000,
		);
		if (exitCode !== 0)
			throw new Error(
				"FFmpeg could not convert this file with the selected output.",
			);
		const data = await ffmpeg.readFile(outputName);
		if (typeof data === "string")
			throw new Error("FFmpeg returned an unexpected text result.");
		onProgress?.(1);
		return new Blob([new Uint8Array(data)], { type: target.mimeTypes[0] });
	} finally {
		ffmpeg.off("progress", progressHandler);
		await Promise.allSettled([
			ffmpeg.deleteFile(inputName),
			ffmpeg.deleteFile(outputName),
		]);
	}
}
