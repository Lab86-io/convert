import type { FormatDefinition } from "../formats";
import { htmlToTargetBlob } from "./text";

async function extractPdfText(file: File): Promise<string> {
	const [pdfjs, workerModule] = await Promise.all([
		import("pdfjs-dist"),
		import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
	]);
	pdfjs.GlobalWorkerOptions.workerSrc = workerModule.default;
	const task = pdfjs.getDocument({ data: await file.arrayBuffer() });
	const document = await task.promise;
	const pages: string[] = [];
	for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
		const page = await document.getPage(pageNumber);
		const content = await page.getTextContent();
		const text = content.items
			.map((item) => ("str" in item ? item.str : ""))
			.join(" ")
			.replace(/\s+/g, " ")
			.trim();
		pages.push(text);
	}
	return `${pages.join("\n\n---\n\n")}\n`;
}

export async function convertDocument(
	file: File,
	source: FormatDefinition,
	target: FormatDefinition,
): Promise<Blob> {
	if (source.id === "pdf") {
		return new Blob([await extractPdfText(file)], {
			type: "text/plain;charset=utf-8",
		});
	}
	if (source.id === "docx") {
		const { default: mammoth } = await import("mammoth/mammoth.browser");
		const result = await mammoth.convertToHtml({
			arrayBuffer: await file.arrayBuffer(),
		});
		return htmlToTargetBlob(result.value, file.name, target);
	}
	throw new Error(`Unsupported document input: ${source.label}`);
}
