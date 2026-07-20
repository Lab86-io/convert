import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { heicSource } from "../lib/formats";
import { Dropzone } from "./Dropzone";

afterEach(cleanup);

describe("Dropzone", () => {
	it("renders a file input accepting HEIC mime types and extensions", () => {
		render(<Dropzone source={heicSource} onFiles={() => {}} variant="hero" />);
		const input = screen.getByLabelText(/drop heic photos here/i, {
			exact: false,
		});
		expect(input).toBeInstanceOf(HTMLInputElement);
		const accept = (input as HTMLInputElement).accept;
		expect(accept).toContain("image/heic");
		expect(accept).toContain(".heic");
		expect((input as HTMLInputElement).multiple).toBe(true);
	});

	it("calls onFiles with the picked files and resets the input", () => {
		const onFiles = vi.fn();
		render(<Dropzone source={heicSource} onFiles={onFiles} variant="hero" />);
		const input = document.querySelector(
			'input[type="file"]',
		) as HTMLInputElement;
		const file = new File(["x"], "a.heic", { type: "image/heic" });
		fireEvent.change(input, { target: { files: [file] } });
		expect(onFiles).toHaveBeenCalledTimes(1);
		const passed = Array.from(onFiles.mock.calls[0][0] as Iterable<File>);
		expect(passed.map((f) => f.name)).toEqual(["a.heic"]);
		expect(input.value).toBe("");
	});

	it("accepts dropped files and clears the drag highlight", () => {
		const onFiles = vi.fn();
		render(
			<Dropzone source={heicSource} onFiles={onFiles} variant="compact" />,
		);
		const label = document.querySelector("label") as HTMLLabelElement;
		const file = new File(["x"], "b.heif", { type: "" });

		fireEvent.dragEnter(label, { dataTransfer: { files: [] } });
		expect(label.dataset.dragActive).toBe("true");

		fireEvent.drop(label, { dataTransfer: { files: [file] } });
		expect(onFiles).toHaveBeenCalledTimes(1);
		expect(label.dataset.dragActive).toBeUndefined();
	});

	it("does not call onFiles for a drop with no files", () => {
		const onFiles = vi.fn();
		render(<Dropzone source={heicSource} onFiles={onFiles} variant="hero" />);
		const label = document.querySelector("label") as HTMLLabelElement;
		fireEvent.drop(label, { dataTransfer: { files: [] } });
		expect(onFiles).not.toHaveBeenCalled();
	});
});
