import { describe, expect, it } from "vitest";
import {
	acceptAttribute,
	formatBytes,
	heicSource,
	heicToJpeg,
	isAcceptedFile,
	outputFileName,
	sizeChangePercent,
	splitAcceptedFiles,
	uniqueFileNames,
} from "./formats";

describe("isAcceptedFile", () => {
	it("accepts files with a HEIC mime type", () => {
		expect(
			isAcceptedFile({ name: "photo", type: "image/heic" }, heicSource),
		).toBe(true);
		expect(
			isAcceptedFile({ name: "photo", type: "image/heif" }, heicSource),
		).toBe(true);
	});

	it("falls back to the extension when the mime type is empty", () => {
		expect(
			isAcceptedFile({ name: "IMG_0042.heic", type: "" }, heicSource),
		).toBe(true);
		expect(
			isAcceptedFile({ name: "IMG_0042.heif", type: "" }, heicSource),
		).toBe(true);
	});

	it("falls back to the extension for generic mime types", () => {
		expect(
			isAcceptedFile(
				{ name: "IMG_0042.HEIC", type: "application/octet-stream" },
				heicSource,
			),
		).toBe(true);
	});

	it("is case-insensitive for extensions and mime types", () => {
		expect(isAcceptedFile({ name: "A.HeIc", type: "" }, heicSource)).toBe(true);
		expect(
			isAcceptedFile(
				{ name: "a", type: "IMAGE/HEIC".toLowerCase() },
				heicSource,
			),
		).toBe(true);
	});

	it("rejects non-HEIC files", () => {
		expect(
			isAcceptedFile({ name: "photo.png", type: "image/png" }, heicSource),
		).toBe(false);
		expect(isAcceptedFile({ name: "notes.txt", type: "" }, heicSource)).toBe(
			false,
		);
		expect(
			isAcceptedFile({ name: "archive.heic.zip", type: "" }, heicSource),
		).toBe(false);
	});
});

describe("splitAcceptedFiles", () => {
	it("partitions files into accepted and rejected", () => {
		const heic = new File(["x"], "a.heic", { type: "" });
		const png = new File(["x"], "b.png", { type: "image/png" });
		const { accepted, rejected } = splitAcceptedFiles([heic, png], heicSource);
		expect(accepted.map((f) => f.name)).toEqual(["a.heic"]);
		expect(rejected.map((f) => f.name)).toEqual(["b.png"]);
	});
});

describe("outputFileName", () => {
	it("replaces the source extension with .jpg", () => {
		expect(
			outputFileName("IMG_0042.HEIC", heicToJpeg.source, heicToJpeg.target),
		).toBe("IMG_0042.jpg");
		expect(
			outputFileName("trip.heif", heicToJpeg.source, heicToJpeg.target),
		).toBe("trip.jpg");
	});

	it("keeps dots inside the base name", () => {
		expect(
			outputFileName("2024.06.01.heic", heicToJpeg.source, heicToJpeg.target),
		).toBe("2024.06.01.jpg");
	});

	it("appends .jpg when the extension is not a known source extension", () => {
		expect(outputFileName("photo", heicToJpeg.source, heicToJpeg.target)).toBe(
			"photo.jpg",
		);
	});

	it("handles a bare extension as the whole name", () => {
		expect(outputFileName(".heic", heicToJpeg.source, heicToJpeg.target)).toBe(
			"converted.jpg",
		);
	});
});

describe("uniqueFileNames", () => {
	it("leaves unique names untouched", () => {
		expect(uniqueFileNames(["a.jpg", "b.jpg"])).toEqual(["a.jpg", "b.jpg"]);
	});

	it("numbers duplicates before the extension", () => {
		expect(uniqueFileNames(["a.jpg", "a.jpg", "a.jpg"])).toEqual([
			"a.jpg",
			"a (2).jpg",
			"a (3).jpg",
		]);
	});
});

describe("formatBytes", () => {
	it("formats byte ranges", () => {
		expect(formatBytes(512)).toBe("512 B");
		expect(formatBytes(2048)).toBe("2.0 KB");
		expect(formatBytes(3.5 * 1024 * 1024)).toBe("3.5 MB");
		expect(formatBytes(250 * 1024 * 1024)).toBe("250 MB");
	});

	it("handles invalid input", () => {
		expect(formatBytes(-1)).toBe("—");
		expect(formatBytes(Number.NaN)).toBe("—");
	});
});

describe("sizeChangePercent", () => {
	it("is negative when the output is smaller", () => {
		expect(sizeChangePercent(100, 60)).toBe(-40);
	});

	it("is null for empty input", () => {
		expect(sizeChangePercent(0, 10)).toBeNull();
	});
});

describe("acceptAttribute", () => {
	it("includes mime types and extensions for browsers with poor HEIC mime support", () => {
		const accept = acceptAttribute(heicSource);
		expect(accept).toContain("image/heic");
		expect(accept).toContain(".heic");
		expect(accept).toContain(".heif");
	});
});
