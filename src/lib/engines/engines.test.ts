import { describe, expect, it } from "vitest";
import { formatsById } from "../formats";
import { convertData } from "./data";
import { convertText } from "./text";

function format(id: string) {
	const value = formatsById.get(id);
	if (!value) throw new Error(`Missing test format: ${id}`);
	return value;
}

describe("data engine", () => {
	it("converts CSV records to typed JSON", async () => {
		const file = new File(["name,count\npears,3\napples,5\n"], "fruit.csv", {
			type: "text/csv",
		});
		const result = await convertData(file, format("csv"), format("json"));
		expect(JSON.parse(await result.text())).toEqual([
			{ name: "pears", count: 3 },
			{ name: "apples", count: 5 },
		]);
	});

	it("emits one valid XML root", async () => {
		const file = new File(['{"a":1,"b":2}'], "record.json", {
			type: "application/json",
		});
		const result = await convertData(file, format("json"), format("xml"));
		expect(await result.text()).toContain("<root>");
	});
});

describe("text engine", () => {
	it("renders Markdown as a complete HTML document", async () => {
		const file = new File(["# Hello\n\nWorld"], "note.md", {
			type: "text/markdown",
		});
		const result = await convertText(file, format("md"), format("html"));
		const html = await result.text();
		expect(html).toContain("<!doctype html>");
		expect(html).toContain("<h1>Hello</h1>");
	});
});
