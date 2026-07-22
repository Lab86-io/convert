import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useConversionQueue } from "./use-conversion-queue";

const { convertFileMock } = vi.hoisted(() => ({ convertFileMock: vi.fn() }));
vi.mock("./convert", async () => {
	const actual = await vi.importActual<typeof import("./convert")>("./convert");
	return { ...actual, convertFile: convertFileMock };
});

function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((done) => {
		resolve = done;
	});
	return { promise, resolve };
}

beforeEach(() => {
	convertFileMock.mockReset();
	Object.defineProperty(URL, "createObjectURL", {
		configurable: true,
		value: vi.fn(() => "blob:converted"),
	});
	Object.defineProperty(URL, "revokeObjectURL", {
		configurable: true,
		value: vi.fn(),
	});
});

describe("useConversionQueue", () => {
	it("detects mixed inputs and assigns per-file recommendations", () => {
		const { result } = renderHook(() => useConversionQueue());
		act(() =>
			result.current.addFiles([
				new File(["x"], "photo.heic", { type: "image/heic" }),
				new File(["x"], "data.csv", { type: "text/csv" }),
			]),
		);
		expect(
			result.current.items.map((item) => [
				item.source.id,
				item.target.id,
				item.status,
			]),
		).toEqual([
			["heic", "jpeg", "ready"],
			["csv", "json", "ready"],
		]);
	});

	it("changes the output before conversion", () => {
		const { result } = renderHook(() => useConversionQueue());
		act(() =>
			result.current.addFiles([
				new File(["x"], "photo.png", { type: "image/png" }),
			]),
		);
		act(() => result.current.changeTarget(result.current.items[0].id, "jpeg"));
		expect(result.current.items[0].target.id).toBe("jpeg");
		expect(result.current.items[0].outputName).toBe("photo.jpg");
	});

	it("pairs Zoom control metadata with its media file", () => {
		const { result } = renderHook(() => useConversionQueue());
		act(() =>
			result.current.addFiles([
				new File(["media"], "double_click_to_convert_01.zoom"),
				new File(["control"], "double_click_to_convert_02.zoom"),
			]),
		);
		expect(result.current.items).toHaveLength(1);
		expect(result.current.items[0].source.id).toBe("zoom");
		expect(result.current.items[0].zoom?.companionName).toBe(
			"double_click_to_convert_02.zoom",
		);
	});

	it("continues after an active item is removed", async () => {
		const first = deferred<Blob>();
		convertFileMock
			.mockImplementationOnce(() => first.promise)
			.mockResolvedValueOnce(new Blob(["second"]));
		const { result } = renderHook(() => useConversionQueue());
		act(() => result.current.addFiles([new File(["one"], "one.heic")]));
		act(() => result.current.startAll());
		await waitFor(() =>
			expect(result.current.items[0]?.status).toBe("converting"),
		);
		const activeId = result.current.items[0].id;
		act(() => {
			result.current.removeItem(activeId);
			result.current.addFiles([new File(["two"], "two.heic")]);
		});
		act(() => result.current.startAll());
		act(() => first.resolve(new Blob(["first"])));
		await waitFor(() => {
			expect(convertFileMock).toHaveBeenCalledTimes(2);
			expect(result.current.items[0]?.status).toBe("done");
		});
	});
});
