import { describe, expect, it } from "vitest";
import {
	decodeZoomRecording,
	inspectZoomRecording,
	type ZoomRecoveryError,
} from "./zoom";

const HEADER = 0x2c05f158;
const TRAILER = 0x84ad52e2;

function align4(value: number) {
	return Math.ceil(value / 4) * 4;
}

function packet(
	type: number,
	timestamp: number,
	duration: number,
	property: Uint8Array,
	data: Uint8Array,
) {
	const output = new Uint8Array(
		4 + 48 + align4(property.length) + align4(data.length) + 4,
	);
	const view = new DataView(output.buffer);
	view.setUint32(0, HEADER, true);
	view.setInt32(4, type, true);
	view.setBigInt64(12, BigInt(timestamp), true);
	view.setBigInt64(20, BigInt(duration), true);
	view.setInt32(36, data.length, true);
	view.setInt32(40, property.length, true);
	output.set(property, 52);
	output.set(data, 52 + align4(property.length));
	view.setUint32(output.length - 4, TRAILER, true);
	return output;
}

function audioProperty(rate = 32_000) {
	const output = new Uint8Array(24);
	new DataView(output.buffer).setInt32(0, rate, true);
	return output;
}

function videoProperty(id = 41, width = 640, height = 360) {
	const output = new Uint8Array(24);
	const view = new DataView(output.buffer);
	view.setInt32(0, id, true);
	view.setInt32(8, width, true);
	view.setInt32(12, height, true);
	return output;
}

function recording() {
	const audio = packet(4, 1_000, 10, audioProperty(), new Uint8Array(640));
	const video = packet(
		0x10,
		1_020,
		-1,
		videoProperty(),
		new Uint8Array([
			0, 0, 0, 1, 0x67, 0x64, 0, 0x1e, 0, 0, 0, 1, 0x68, 0xee, 0x3c, 0x80, 0, 0,
			0, 1, 0x65, 0x88, 0x84,
		]),
	);
	const continuation = packet(
		0x10,
		1_060,
		-1,
		videoProperty(),
		new Uint8Array([0, 0, 0, 1, 0x41, 0x9a]),
	);
	const output = new Uint8Array(
		1_024 + audio.length + video.length + continuation.length,
	);
	const view = new DataView(output.buffer);
	view.setUint32(0, HEADER, true);
	view.setUint32(4, TRAILER, true);
	view.setUint32(32, 902_657, true);
	view.setUint32(36, 1_024, true);
	output.set(audio, 1_024);
	output.set(video, 1_024 + audio.length);
	output.set(continuation, 1_024 + audio.length + video.length);
	return output;
}

describe("Zoom recording recovery", () => {
	it("inspects framed PCM and H.264 tracks", async () => {
		const file = new File([recording()], "double_click_to_convert_01.zoom");
		const summary = await inspectZoomRecording(file);
		expect(summary.packetCount).toBe(3);
		expect(summary.audio).toMatchObject({
			sampleRate: 32_000,
			packetCount: 1,
			encoding: "pcm-s16le",
		});
		expect(summary.videoTracks[0]).toMatchObject({
			id: 41,
			kind: "camera",
			width: 640,
			height: 360,
			packetCount: 2,
			decodablePacketCount: 2,
		});
	});

	it("extracts recoverable video from its first IDR and prefixes parameter sets", () => {
		const decoded = decodeZoomRecording(recording(), "all");
		expect(decoded.audioData).toHaveLength(640);
		expect(decoded.videoTracks[0].data.slice(0, 5)).toEqual(
			new Uint8Array([0, 0, 0, 1, 0x67]),
		);
		expect(decoded.videoTracks[0].data).toContain(0x65);
	});

	it("identifies the small _02 control file", () => {
		const control = new Uint8Array(72);
		const view = new DataView(control.buffer);
		view.setUint32(0, HEADER, true);
		view.setUint32(4, 64, true);
		expect(() => decodeZoomRecording(control)).toThrowError(
			expect.objectContaining<Partial<ZoomRecoveryError>>({
				code: "CONTROL_FILE",
			}),
		);
	});

	it("rejects truncated packets instead of scanning past the file", () => {
		const damaged = recording().slice(0, -3);
		expect(() => decodeZoomRecording(damaged)).toThrow(
			/extends past|truncated/i,
		);
	});
});
