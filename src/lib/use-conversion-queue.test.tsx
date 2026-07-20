import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { heicToJpeg } from "./formats";
import { useConversionQueue } from "./use-conversion-queue";

const { convertFileMock } = vi.hoisted(() => ({
	convertFileMock: vi.fn(),
}));

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
	it("continues after the active item is removed while another is queued", async () => {
		const firstConversion = deferred<Blob>();
		convertFileMock
			.mockImplementationOnce(() => firstConversion.promise)
			.mockResolvedValueOnce(new Blob(["second"], { type: "image/jpeg" }));

		const { result } = renderHook(() => useConversionQueue(heicToJpeg));

		act(() => {
			result.current.addFiles([new File(["one"], "one.heic")]);
		});
		await waitFor(() => {
			expect(result.current.items[0]?.status).toBe("converting");
		});

		const activeId = result.current.items[0].id;
		act(() => {
			result.current.removeItem(activeId);
			result.current.addFiles([new File(["two"], "two.heic")]);
		});

		act(() => {
			firstConversion.resolve(new Blob(["first"], { type: "image/jpeg" }));
		});

		await waitFor(() => {
			expect(convertFileMock).toHaveBeenCalledTimes(2);
			expect(result.current.items[0]?.status).toBe("done");
		});
	});
});
