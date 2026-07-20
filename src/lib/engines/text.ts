import type { FormatDefinition } from "../formats";

function htmlToText(html: string): string {
	const document = new DOMParser().parseFromString(html, "text/html");
	return `${document.body.textContent?.trim() ?? ""}\n`;
}

function escapeHtml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;");
}

function htmlDocument(body: string, title: string): string {
	return `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>${escapeHtml(title)}</title>\n</head>\n<body>\n${body}\n</body>\n</html>\n`;
}

export async function convertText(
	file: File,
	source: FormatDefinition,
	target: FormatDefinition,
): Promise<Blob> {
	const input = await file.text();
	let output: string;

	if (target.id === "html") {
		if (source.id === "md") {
			const { marked } = await import("marked");
			output = htmlDocument(await marked.parse(input), file.name);
		} else {
			output = htmlDocument(`<pre>${escapeHtml(input)}</pre>`, file.name);
		}
	} else if (target.id === "md") {
		if (source.id === "html") {
			const { default: TurndownService } = await import("turndown");
			output = `${new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" }).turndown(input)}\n`;
		} else {
			output = input;
		}
	} else if (source.id === "html") {
		output = htmlToText(input);
	} else if (source.id === "md") {
		const { marked } = await import("marked");
		output = htmlToText(await marked.parse(input));
	} else {
		output = input;
	}

	return new Blob([output], { type: `${target.mimeTypes[0]};charset=utf-8` });
}

export async function htmlToTargetBlob(
	html: string,
	name: string,
	target: FormatDefinition,
): Promise<Blob> {
	if (target.id === "html")
		return new Blob([htmlDocument(html, name)], {
			type: "text/html;charset=utf-8",
		});
	if (target.id === "txt")
		return new Blob([htmlToText(html)], { type: "text/plain;charset=utf-8" });
	const { default: TurndownService } = await import("turndown");
	return new Blob(
		[
			`${new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" }).turndown(html)}\n`,
		],
		{
			type: "text/markdown;charset=utf-8",
		},
	);
}
