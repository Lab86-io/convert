import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Dropzone } from "./Dropzone";

afterEach(cleanup);

describe("Dropzone", () => {
	it("accepts files from every supported family", () => {
		render(<Dropzone onFiles={() => {}} variant="hero" />);
		const input = screen.getByLabelText(/drop files into this batch/i, {
			exact: false,
		}) as HTMLInputElement;
		expect(input.accept).toContain("image/heic");
		expect(input.accept).toContain("video/mp4");
		expect(input.accept).toContain(".json");
		expect(input.multiple).toBe(true);
	});

	it("passes picked files and resets the input", () => {
		const onFiles = vi.fn();
		render(<Dropzone onFiles={onFiles} variant="hero" />);
		const input = document.querySelector(
			'input[type="file"]',
		) as HTMLInputElement;
		fireEvent.change(input, { target: { files: [new File(["x"], "a.csv")] } });
		expect(
			Array.from(onFiles.mock.calls[0][0] as Iterable<File>)[0]?.name,
		).toBe("a.csv");
		expect(input.value).toBe("");
	});

	it("handles drag state and dropped files", () => {
		const onFiles = vi.fn();
		render(<Dropzone onFiles={onFiles} variant="compact" />);
		const label = document.querySelector("label") as HTMLLabelElement;
		fireEvent.dragEnter(label, { dataTransfer: { files: [] } });
		expect(label.dataset.dragActive).toBe("true");
		fireEvent.drop(label, {
			dataTransfer: { files: [new File(["x"], "a.json")] },
		});
		expect(onFiles).toHaveBeenCalledOnce();
		expect(label.dataset.dragActive).toBeUndefined();
	});
});
