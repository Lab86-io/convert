export type ProgressCallback = (progress: number) => void;

export const MAX_BROWSER_MEDIA_BYTES = 500 * 1024 * 1024;

let ffmpegPromise: Promise<import("@ffmpeg/ffmpeg").FFmpeg> | null = null;

export async function getFfmpeg(onProgress?: ProgressCallback) {
	if (!ffmpegPromise) {
		const pending = (async () => {
			onProgress?.(0.02);
			const { FFmpeg } = await import("@ffmpeg/ffmpeg");
			const ffmpeg = new FFmpeg();
			await ffmpeg.load({
				coreURL: "/ffmpeg/ffmpeg-core.js",
				wasmURL: "/ffmpeg/ffmpeg-core.wasm",
			});
			return ffmpeg;
		})();
		ffmpegPromise = pending.catch((error) => {
			ffmpegPromise = null;
			throw error;
		});
	}
	return ffmpegPromise;
}
