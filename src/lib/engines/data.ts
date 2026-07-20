import type { FormatDefinition } from "../formats";

async function parseData(
	file: File,
	source: FormatDefinition,
): Promise<unknown> {
	const text = await file.text();
	switch (source.id) {
		case "json":
			return JSON.parse(text);
		case "yaml": {
			const { parse } = await import("yaml");
			return parse(text);
		}
		case "csv": {
			const { default: Papa } = await import("papaparse");
			const result = Papa.parse<Record<string, unknown>>(text, {
				header: true,
				dynamicTyping: true,
				skipEmptyLines: true,
			});
			if (result.errors.length > 0) throw new Error(result.errors[0].message);
			return result.data;
		}
		case "xml": {
			const { XMLParser } = await import("fast-xml-parser");
			return new XMLParser({
				ignoreAttributes: false,
				attributeNamePrefix: "@_",
			}).parse(text);
		}
		default:
			throw new Error(`Unsupported data input: ${source.label}`);
	}
}

async function serializeData(
	data: unknown,
	target: FormatDefinition,
): Promise<string> {
	switch (target.id) {
		case "json":
			return `${JSON.stringify(data, null, 2)}\n`;
		case "yaml": {
			const { stringify } = await import("yaml");
			return stringify(data);
		}
		case "csv": {
			const { default: Papa } = await import("papaparse");
			const rows = Array.isArray(data) ? data : [data];
			if (
				rows.some(
					(row) => row == null || typeof row !== "object" || Array.isArray(row),
				)
			) {
				throw new Error(
					"CSV output needs a record or a list of similarly shaped records.",
				);
			}
			return `${Papa.unparse(rows as Record<string, unknown>[])}\n`;
		}
		case "xml": {
			const { XMLBuilder } = await import("fast-xml-parser");
			const root = { root: Array.isArray(data) ? { item: data } : data };
			return new XMLBuilder({
				ignoreAttributes: false,
				attributeNamePrefix: "@_",
				format: true,
			}).build(root);
		}
		default:
			throw new Error(`Unsupported data output: ${target.label}`);
	}
}

export async function convertData(
	file: File,
	source: FormatDefinition,
	target: FormatDefinition,
): Promise<Blob> {
	const data = await parseData(file, source);
	const output = await serializeData(data, target);
	return new Blob([output], { type: `${target.mimeTypes[0]};charset=utf-8` });
}
