import type { FormatDefinition } from "../formats";
import {
	getFfmpeg,
	MAX_BROWSER_MEDIA_BYTES,
	type ProgressCallback,
} from "./ffmpeg";

const ZOOM_PACKET_HEADER = 0x2c05f158;
const ZOOM_PACKET_TRAILER = 0x84ad52e2;
const ZOOM_FILE_HEADER_BYTES = 96;
const ZOOM_SAMPLE_HEADER_BYTES = 48;
const MAX_PACKET_COUNT = 2_000_000;
const MAX_VIDEO_TRACKS = 16;

const MEDIA_AUDIO = 4;
const MEDIA_CAMERA = 0x10;
const MEDIA_SCREEN = 0x20;

type ExtractMode = "none" | "audio" | "all";

export interface ZoomAudioSummary {
	sampleRate: number;
	packetCount: number;
	bytes: number;
	encoding: "pcm-s16le" | "unknown";
	firstTimestamp: number;
	lastTimestamp: number;
}

export interface ZoomVideoTrackSummary {
	id: number;
	kind: "camera" | "screen";
	width: number;
	height: number;
	packetCount: number;
	decodablePacketCount: number;
	bytes: number;
	frameRate: number;
	firstTimestamp: number;
	firstDecodableTimestamp: number;
	lastTimestamp: number;
}

export interface ZoomRecordingSummary {
	versionInfo: number;
	packetCount: number;
	durationMs: number;
	audio: ZoomAudioSummary | null;
	videoTracks: ZoomVideoTrackSummary[];
}

interface MutableTrack {
	id: number;
	kind: "camera" | "screen";
	width: number;
	height: number;
	packetCount: number;
	bytes: number;
	firstTimestamp: number;
	lastTimestamp: number;
	firstIdrIndex: number | null;
	firstIdrTimestamp: number | null;
	parts: Uint8Array[];
}

interface ParsedZoomRecording {
	summary: ZoomRecordingSummary;
	audioData?: Uint8Array;
	videoTracks: Array<
		ZoomVideoTrackSummary & {
			data: Uint8Array;
		}
	>;
}

export class ZoomRecoveryError extends Error {
	constructor(
		message: string,
		readonly code:
			| "TOO_LARGE"
			| "CONTROL_FILE"
			| "INVALID_FILE"
			| "CORRUPT_FILE"
			| "UNSUPPORTED_MEDIA",
	) {
		super(message);
		this.name = "ZoomRecoveryError";
	}
}

function align4(value: number): number {
	return Math.ceil(value / 4) * 4;
}

function timestampNumber(value: bigint): number {
	const number = Number(value);
	return Number.isSafeInteger(number) ? number : 0;
}

function hasAnnexBNalu(data: Uint8Array, wantedType: number): boolean {
	for (let index = 0; index + 4 < data.length; index += 1) {
		if (data[index] !== 0 || data[index + 1] !== 0) continue;
		let payload = -1;
		if (data[index + 2] === 1) payload = index + 3;
		else if (data[index + 2] === 0 && data[index + 3] === 1)
			payload = index + 4;
		if (payload >= 0 && (data[payload] & 0x1f) === wantedType) return true;
	}
	return false;
}

function parameterSets(parts: readonly Uint8Array[]): Uint8Array[] {
	const found = new Map<string, Uint8Array>();
	for (const part of parts) {
		const starts: Array<{ index: number; length: number }> = [];
		for (let index = 0; index + 4 < part.length; index += 1) {
			if (part[index] !== 0 || part[index + 1] !== 0) continue;
			if (part[index + 2] === 1) starts.push({ index, length: 3 });
			else if (part[index + 2] === 0 && part[index + 3] === 1)
				starts.push({ index, length: 4 });
		}
		for (let index = 0; index < starts.length; index += 1) {
			const start = starts[index];
			const type = part[start.index + start.length] & 0x1f;
			if (type !== 7 && type !== 8) continue;
			const end = starts[index + 1]?.index ?? part.length;
			const bytes = part.slice(start.index, end);
			const key = Array.from(bytes).join(",");
			if (!found.has(key)) found.set(key, bytes);
		}
	}
	return [...found.values()];
}

function concatenate(
	parts: readonly Uint8Array[],
	prefix: readonly Uint8Array[] = [],
) {
	const size = [...prefix, ...parts].reduce(
		(sum, part) => sum + part.length,
		0,
	);
	const output = new Uint8Array(size);
	let offset = 0;
	for (const part of [...prefix, ...parts]) {
		output.set(part, offset);
		offset += part.length;
	}
	return output;
}

function invalidFile(message: string): never {
	throw new ZoomRecoveryError(message, "INVALID_FILE");
}

export function decodeZoomRecording(
	input: ArrayBuffer | Uint8Array,
	extractMode: ExtractMode = "none",
): ParsedZoomRecording {
	const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
	if (bytes.byteLength < 8)
		return invalidFile("This file is too small to be a Zoom recording.");
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const uint32 = (offset: number) => view.getUint32(offset, true);
	const int32 = (offset: number) => view.getInt32(offset, true);
	const int64 = (offset: number) => view.getBigInt64(offset, true);

	if (uint32(0) !== ZOOM_PACKET_HEADER)
		return invalidFile(
			"This file does not contain a recognized Zoom recording header.",
		);
	if (uint32(4) !== ZOOM_PACKET_TRAILER) {
		if (uint32(4) === 64)
			throw new ZoomRecoveryError(
				"This is Zoom's small _02 control file. Add the larger _01.zoom media file to recover the recording.",
				"CONTROL_FILE",
			);
		return invalidFile(
			"This Zoom file uses an unsupported control-file layout.",
		);
	}
	if (bytes.byteLength < ZOOM_FILE_HEADER_BYTES)
		throw new ZoomRecoveryError(
			"The Zoom recording header is truncated.",
			"CORRUPT_FILE",
		);

	const versionInfo = uint32(32);
	const dataOffset = uint32(36);
	if (dataOffset < ZOOM_FILE_HEADER_BYTES || dataOffset > bytes.byteLength)
		throw new ZoomRecoveryError(
			"The Zoom recording has an invalid media offset.",
			"CORRUPT_FILE",
		);

	const tracks = new Map<string, MutableTrack>();
	const audioParts: Uint8Array[] = [];
	let audioBytes = 0;
	let audioPackets = 0;
	let pcmMatches = 0;
	let firstAudioTimestamp = Number.POSITIVE_INFINITY;
	let lastAudioTimestamp = 0;
	const sampleRates = new Map<number, number>();
	let packetCount = 0;
	let position = dataOffset;
	let firstMediaTimestamp = Number.POSITIVE_INFINITY;
	let lastMediaTimestamp = 0;

	while (position < bytes.byteLength) {
		if (packetCount >= MAX_PACKET_COUNT)
			throw new ZoomRecoveryError(
				"This Zoom recording contains too many packets to process safely.",
				"CORRUPT_FILE",
			);
		if (bytes.byteLength - position < ZOOM_SAMPLE_HEADER_BYTES + 8)
			throw new ZoomRecoveryError(
				"The final Zoom media packet is truncated.",
				"CORRUPT_FILE",
			);
		if (uint32(position) !== ZOOM_PACKET_HEADER)
			throw new ZoomRecoveryError(
				`The Zoom packet at byte ${position} has an invalid header.`,
				"CORRUPT_FILE",
			);

		const type = int32(position + 4);
		const timestamp = timestampNumber(int64(position + 12));
		const packetDuration = timestampNumber(int64(position + 20));
		const dataSize = int32(position + 36);
		const propertySize = int32(position + 40);
		if (dataSize < 0 || propertySize < 0)
			throw new ZoomRecoveryError(
				"A Zoom packet declares a negative size.",
				"CORRUPT_FILE",
			);

		const propertyOffset = position + 4 + ZOOM_SAMPLE_HEADER_BYTES;
		const dataStart = propertyOffset + align4(propertySize);
		const trailerOffset = dataStart + align4(dataSize);
		if (trailerOffset + 4 > bytes.byteLength)
			throw new ZoomRecoveryError(
				"A Zoom media packet extends past the end of the file.",
				"CORRUPT_FILE",
			);
		if (uint32(trailerOffset) !== ZOOM_PACKET_TRAILER)
			throw new ZoomRecoveryError(
				`The Zoom packet at byte ${position} has an invalid trailer.`,
				"CORRUPT_FILE",
			);

		packetCount += 1;
		if (
			dataSize > 0 &&
			timestamp > 0 &&
			[MEDIA_AUDIO, MEDIA_CAMERA, MEDIA_SCREEN].includes(type)
		) {
			firstMediaTimestamp = Math.min(firstMediaTimestamp, timestamp);
			lastMediaTimestamp = Math.max(lastMediaTimestamp, timestamp);
		}

		if (type === MEDIA_AUDIO && dataSize > 0) {
			const declaredRate = propertySize >= 4 ? int32(propertyOffset) : 0;
			const sampleRate =
				declaredRate >= 8_000 && declaredRate <= 192_000
					? declaredRate
					: 32_000;
			sampleRates.set(sampleRate, (sampleRates.get(sampleRate) ?? 0) + 1);
			audioPackets += 1;
			audioBytes += dataSize;
			firstAudioTimestamp = Math.min(firstAudioTimestamp, timestamp);
			lastAudioTimestamp = Math.max(lastAudioTimestamp, timestamp);
			if (
				packetDuration > 0 &&
				packetDuration <= 1_000 &&
				Math.abs(dataSize - (sampleRate * packetDuration * 2) / 1_000) <= 4
			)
				pcmMatches += 1;
			if (extractMode === "audio" || extractMode === "all")
				audioParts.push(bytes.subarray(dataStart, dataStart + dataSize));
		}

		if ((type === MEDIA_CAMERA || type === MEDIA_SCREEN) && dataSize > 0) {
			const id = propertySize >= 4 ? int32(propertyOffset) : type;
			const key = `${type}:${id}`;
			let track = tracks.get(key);
			if (!track) {
				track = {
					id,
					kind: type === MEDIA_SCREEN ? "screen" : "camera",
					width: 0,
					height: 0,
					packetCount: 0,
					bytes: 0,
					firstTimestamp: timestamp,
					lastTimestamp: timestamp,
					firstIdrIndex: null,
					firstIdrTimestamp: null,
					parts: [],
				};
				tracks.set(key, track);
			}
			if (propertySize >= 16) {
				const width = int32(propertyOffset + 8);
				const height = int32(propertyOffset + 12);
				if (width > 0 && width <= 8192 && height > 0 && height <= 8192) {
					track.width = width;
					track.height = height;
				}
			}
			const data = bytes.subarray(dataStart, dataStart + dataSize);
			if (track.firstIdrIndex === null && hasAnnexBNalu(data, 5)) {
				track.firstIdrIndex = track.packetCount;
				track.firstIdrTimestamp = timestamp;
			}
			track.packetCount += 1;
			track.bytes += dataSize;
			track.firstTimestamp = Math.min(track.firstTimestamp, timestamp);
			track.lastTimestamp = Math.max(track.lastTimestamp, timestamp);
			if (extractMode === "all") track.parts.push(data);
		}

		position = trailerOffset + 4;
	}

	if (packetCount === 0)
		throw new ZoomRecoveryError(
			"This Zoom recording does not contain media packets.",
			"UNSUPPORTED_MEDIA",
		);

	const sampleRate =
		[...sampleRates.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 32_000;
	const audioEncoding =
		audioPackets > 0 && pcmMatches / audioPackets >= 0.9
			? "pcm-s16le"
			: "unknown";
	const videoSummaries: ZoomVideoTrackSummary[] = [...tracks.values()].map(
		(track) => {
			const firstDecodableTimestamp =
				track.firstIdrTimestamp ?? track.firstTimestamp;
			const decodablePacketCount = Math.max(
				0,
				track.packetCount - (track.firstIdrIndex ?? 0),
			);
			const duration = Math.max(
				1,
				track.lastTimestamp - firstDecodableTimestamp,
			);
			const measuredRate = (decodablePacketCount * 1_000) / duration;
			return {
				id: track.id,
				kind: track.kind,
				width: track.width,
				height: track.height,
				packetCount: track.packetCount,
				decodablePacketCount,
				bytes: track.bytes,
				frameRate: Math.min(
					60,
					Math.max(1, Math.round(measuredRate * 100) / 100),
				),
				firstTimestamp: track.firstTimestamp,
				firstDecodableTimestamp,
				lastTimestamp: track.lastTimestamp,
			};
		},
	);

	const summary: ZoomRecordingSummary = {
		versionInfo,
		packetCount,
		durationMs:
			Number.isFinite(firstMediaTimestamp) &&
			lastMediaTimestamp >= firstMediaTimestamp
				? lastMediaTimestamp - firstMediaTimestamp
				: 0,
		audio:
			audioPackets > 0
				? {
						sampleRate,
						packetCount: audioPackets,
						bytes: audioBytes,
						encoding: audioEncoding,
						firstTimestamp: Number.isFinite(firstAudioTimestamp)
							? firstAudioTimestamp
							: 0,
						lastTimestamp: lastAudioTimestamp,
					}
				: null,
		videoTracks: videoSummaries,
	};

	const extractedTracks = videoSummaries.map((summaryTrack) => {
		const source = tracks.get(
			`${summaryTrack.kind === "screen" ? MEDIA_SCREEN : MEDIA_CAMERA}:${summaryTrack.id}`,
		);
		if (!source || extractMode !== "all")
			return { ...summaryTrack, data: new Uint8Array() };
		const start = source.firstIdrIndex ?? 0;
		const recoverableParts = source.parts.slice(start);
		return {
			...summaryTrack,
			data: concatenate(recoverableParts, parameterSets(source.parts)),
		};
	});

	return {
		summary,
		audioData:
			extractMode === "audio" || extractMode === "all"
				? concatenate(audioParts)
				: undefined,
		videoTracks: extractedTracks,
	};
}

async function readZoomRecording(file: File, mode: ExtractMode) {
	if (file.size > MAX_BROWSER_MEDIA_BYTES)
		throw new ZoomRecoveryError(
			"Browser Zoom recovery is limited to 500 MB. Keep the original files and use the Zoom desktop app for larger recordings.",
			"TOO_LARGE",
		);
	return decodeZoomRecording(await file.arrayBuffer(), mode);
}

export async function inspectZoomRecording(
	file: File,
): Promise<ZoomRecordingSummary> {
	return (await readZoomRecording(file, "none")).summary;
}

function evenFloor(value: number): number {
	return Math.max(2, Math.floor(value / 2) * 2);
}

function gridFilter(
	tracks: readonly ZoomVideoTrackSummary[],
	globalStart: number,
): { filter: string; outputLabel: string } {
	const columns = tracks.length <= 1 ? 1 : Math.ceil(Math.sqrt(tracks.length));
	const rows = Math.ceil(tracks.length / columns);
	const cellWidth = evenFloor(1280 / columns);
	const cellHeight = evenFloor(720 / rows);
	const filters = tracks.map((track, index) => {
		const offset =
			Math.max(0, track.firstDecodableTimestamp - globalStart) / 1_000;
		return `[${index}:v]setpts=N/(${track.frameRate.toFixed(2)}*TB)+${offset.toFixed(3)}/TB,scale=${cellWidth}:${cellHeight}:force_original_aspect_ratio=decrease,pad=${cellWidth}:${cellHeight}:(ow-iw)/2:(oh-ih)/2:black[v${index}]`;
	});
	if (tracks.length === 1) return { filter: filters[0], outputLabel: "v0" };
	const inputs = tracks.map((_, index) => `[v${index}]`).join("");
	const layout = tracks
		.map(
			(_, index) =>
				`${(index % columns) * cellWidth}_${Math.floor(index / columns) * cellHeight}`,
		)
		.join("|");
	filters.push(
		`${inputs}xstack=inputs=${tracks.length}:layout=${layout}:fill=black[vout]`,
	);
	return { filter: filters.join(";"), outputLabel: "vout" };
}

export async function convertZoomRecording(
	file: File,
	target: FormatDefinition,
	quality: number,
	onProgress?: ProgressCallback,
): Promise<Blob> {
	const wantsVideo = target.id === "mp4";
	if (!wantsVideo && target.id !== "m4a" && target.id !== "wav")
		throw new ZoomRecoveryError(
			`Zoom recovery cannot create ${target.label}.`,
			"UNSUPPORTED_MEDIA",
		);

	onProgress?.(0.02);
	const recording = await readZoomRecording(file, wantsVideo ? "all" : "audio");
	onProgress?.(0.2);
	if (wantsVideo && recording.videoTracks.length === 0)
		throw new ZoomRecoveryError(
			"No recoverable H.264 video tracks were found. Choose M4A or WAV if this was an audio-only recording.",
			"UNSUPPORTED_MEDIA",
		);
	if (recording.videoTracks.length > MAX_VIDEO_TRACKS)
		throw new ZoomRecoveryError(
			`This recording has ${recording.videoTracks.length} video tracks; browser recovery supports up to ${MAX_VIDEO_TRACKS}.`,
			"UNSUPPORTED_MEDIA",
		);
	if (!wantsVideo && !recording.audioData?.length)
		throw new ZoomRecoveryError(
			"No recoverable audio track was found in this Zoom recording.",
			"UNSUPPORTED_MEDIA",
		);
	if (recording.summary.audio?.encoding === "unknown")
		throw new ZoomRecoveryError(
			"This recording uses an audio encoding that this browser recovery path does not yet understand.",
			"UNSUPPORTED_MEDIA",
		);

	const ffmpeg = await getFfmpeg((progress) =>
		onProgress?.(0.2 + progress * 0.12),
	);
	const token = crypto.randomUUID().replaceAll("-", "");
	const createdFiles: string[] = [];
	const inputArgs: string[] = [];
	const videoTracks = recording.videoTracks.filter(
		(track) => track.data.length > 0,
	);
	try {
		if (wantsVideo) {
			for (let index = 0; index < videoTracks.length; index += 1) {
				const name = `zoom-${token}-video-${index}.h264`;
				await ffmpeg.writeFile(name, videoTracks[index].data);
				createdFiles.push(name);
				inputArgs.push(
					"-fflags",
					"+genpts",
					"-framerate",
					videoTracks[index].frameRate.toFixed(2),
					"-i",
					name,
				);
				onProgress?.(
					0.32 + ((index + 1) / Math.max(1, videoTracks.length)) * 0.1,
				);
			}
		}

		let audioInputIndex: number | null = null;
		if (recording.audioData?.length && recording.summary.audio) {
			const name = `zoom-${token}-audio.pcm`;
			await ffmpeg.writeFile(name, recording.audioData);
			createdFiles.push(name);
			audioInputIndex = wantsVideo ? videoTracks.length : 0;
			inputArgs.push(
				"-f",
				"s16le",
				"-ar",
				String(recording.summary.audio.sampleRate),
				"-ac",
				"1",
				"-i",
				name,
			);
		}

		const outputName = `zoom-${token}${target.extensions[0]}`;
		createdFiles.push(outputName);
		const normalized = Math.min(100, Math.max(1, quality));
		const crf = Math.round(34 - (normalized / 100) * 14);
		const audioBitrate = Math.round(96 + (normalized / 100) * 160);
		const outputArgs: string[] = [];
		if (wantsVideo) {
			const mediaStarts = [
				...videoTracks.map((track) => track.firstDecodableTimestamp),
				...(recording.summary.audio
					? [recording.summary.audio.firstTimestamp]
					: []),
			].filter((timestamp) => timestamp > 0);
			const globalStart = mediaStarts.length ? Math.min(...mediaStarts) : 0;
			const { filter, outputLabel } = gridFilter(videoTracks, globalStart);
			outputArgs.push("-filter_complex", filter, "-map", `[${outputLabel}]`);
			if (audioInputIndex !== null)
				outputArgs.push("-map", `${audioInputIndex}:a:0`);
			outputArgs.push(
				"-r",
				"30",
				"-c:v",
				"libx264",
				"-preset",
				"ultrafast",
				"-crf",
				String(crf),
				"-pix_fmt",
				"yuv420p",
			);
			if (audioInputIndex !== null)
				outputArgs.push("-c:a", "aac", "-b:a", `${audioBitrate}k`, "-shortest");
			else outputArgs.push("-an");
			outputArgs.push("-movflags", "+faststart");
		} else {
			outputArgs.push("-map", "0:a:0", "-vn");
			if (target.id === "wav") outputArgs.push("-c:a", "pcm_s16le");
			else
				outputArgs.push(
					"-c:a",
					"aac",
					"-b:a",
					`${audioBitrate}k`,
					"-movflags",
					"+faststart",
				);
		}

		const progressHandler = ({ progress }: { progress: number }) =>
			onProgress?.(0.44 + Math.max(0, Math.min(1, progress)) * 0.54);
		ffmpeg.on("progress", progressHandler);
		try {
			const exitCode = await ffmpeg.exec(
				[...inputArgs, ...outputArgs, outputName],
				30 * 60 * 1_000,
			);
			if (exitCode !== 0)
				throw new ZoomRecoveryError(
					"FFmpeg could not assemble the recovered Zoom streams. The source may be incomplete or use a newer codec.",
					"UNSUPPORTED_MEDIA",
				);
		} finally {
			ffmpeg.off("progress", progressHandler);
		}
		const data = await ffmpeg.readFile(outputName);
		if (typeof data === "string")
			throw new ZoomRecoveryError(
				"FFmpeg returned an unexpected recovery result.",
				"UNSUPPORTED_MEDIA",
			);
		onProgress?.(1);
		return new Blob([new Uint8Array(data)], { type: target.mimeTypes[0] });
	} finally {
		await Promise.allSettled(
			createdFiles.map((name) => ffmpeg.deleteFile(name)),
		);
	}
}
