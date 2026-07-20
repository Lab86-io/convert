import { describe, expect, it } from "vitest";
import {
	detectFormat,
	formatBytes,
	formatsById,
	getCompatibleTargets,
	getConversionPath,
	getRecommendedTarget,
	outputFileName,
	sizeChangePercent,
	uniqueFileNames,
	universalAcceptAttribute,
} from "./formats";

describe("format detection", () => {
	it("detects by extension before unreliable mime metadata", () => {
		expect(
			detectFormat({ name: "IMG_0042.HEIC", type: "application/octet-stream" })
				?.id,
		).toBe("heic");
		expect(detectFormat({ name: "records.csv", type: "text/plain" })?.id).toBe(
			"csv",
		);
	});

	it("falls back to mime type", () => {
		expect(detectFormat({ name: "untitled", type: "video/mp4" })?.id).toBe(
			"mp4",
		);
		expect(
			detectFormat({ name: "untitled", type: "application/json" })?.id,
		).toBe("json");
	});

	it("rejects unknown files", () => {
		expect(
			detectFormat({ name: "archive.zip", type: "application/zip" }),
		).toBeNull();
	});
});

describe("conversion graph", () => {
	it("offers useful HEIC targets and recommends JPEG", () => {
		expect(getCompatibleTargets("heic").map((format) => format.id)).toEqual([
			"jpeg",
			"png",
			"webp",
			"pdf",
		]);
		expect(getRecommendedTarget("heic").id).toBe("jpeg");
		expect(getConversionPath("heic", "jpeg")?.engine).toBe("image");
	});

	it("supports media extraction and data transforms", () => {
		expect(getCompatibleTargets("mov").map((format) => format.id)).toContain(
			"mp3",
		);
		expect(getConversionPath("mov", "mp3")?.note).toMatch(/audio track/i);
		expect(getCompatibleTargets("csv").map((format) => format.id)).toEqual([
			"json",
			"yaml",
			"xml",
		]);
	});

	it("keeps unsupported graph edges closed", () => {
		expect(getConversionPath("pdf", "docx")).toBeNull();
		expect(getConversionPath("json", "mp4")).toBeNull();
	});
});

describe("output names", () => {
	it("replaces source extensions", () => {
		const heic = formatsById.get("heic");
		const jpeg = formatsById.get("jpeg");
		const csv = formatsById.get("csv");
		const json = formatsById.get("json");
		expect(heic && jpeg && csv && json).toBeTruthy();
		if (!heic || !jpeg || !csv || !json)
			throw new Error("Test formats are missing");
		expect(outputFileName("2024.06.01.HEIC", heic, jpeg)).toBe(
			"2024.06.01.jpg",
		);
		expect(outputFileName("data.csv", csv, json)).toBe("data.json");
	});

	it("numbers duplicate names", () => {
		expect(uniqueFileNames(["a.jpg", "a.jpg", "a.jpg"])).toEqual([
			"a.jpg",
			"a (2).jpg",
			"a (3).jpg",
		]);
	});
});

describe("display helpers", () => {
	it("formats sizes and deltas", () => {
		expect(formatBytes(2048)).toBe("2.0 KB");
		expect(formatBytes(Number.NaN)).toBe("—");
		expect(sizeChangePercent(100, 60)).toBe(-40);
	});

	it("builds a broad native file accept value", () => {
		const accept = universalAcceptAttribute();
		expect(accept).toContain(".heic");
		expect(accept).toContain("video/mp4");
		expect(accept).toContain(".docx");
	});
});
