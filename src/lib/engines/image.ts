import type { FormatDefinition } from "../formats";

function canvasToBlob(
	canvas: HTMLCanvasElement,
	type: string,
	quality: number,
): Promise<Blob> {
	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(blob) => {
				if (!blob) reject(new Error(`This browser cannot encode ${type}.`));
				else resolve(blob);
			},
			type,
			quality,
		);
	});
}

async function decodedImageBlob(
	file: Blob,
	source: FormatDefinition,
): Promise<Blob> {
	if (source.id !== "heic") return file;
	const { heicTo } = await import("heic-to");
	return heicTo({ blob: file, type: "image/png", quality: 1 });
}

async function renderImage(file: Blob, source: FormatDefinition) {
	const decoded = await decodedImageBlob(file, source);
	let bitmap: ImageBitmap;
	try {
		bitmap = await createImageBitmap(decoded, {
			imageOrientation: "from-image",
		});
	} catch {
		throw new Error(`${source.label} could not be decoded by this browser.`);
	}
	const canvas = document.createElement("canvas");
	canvas.width = bitmap.width;
	canvas.height = bitmap.height;
	const context = canvas.getContext("2d");
	if (!context)
		throw new Error("Canvas rendering is unavailable in this browser.");
	context.drawImage(bitmap, 0, 0);
	bitmap.close();
	return canvas;
}

export async function convertImage(
	file: Blob,
	source: FormatDefinition,
	target: FormatDefinition,
	quality: number,
): Promise<Blob> {
	const canvas = await renderImage(file, source);
	const normalizedQuality = Math.min(1, Math.max(0.01, quality / 100));

	if (target.id === "pdf") {
		const [{ PDFDocument }, imageBlob] = await Promise.all([
			import("pdf-lib"),
			canvasToBlob(canvas, "image/png", 1),
		]);
		const document = await PDFDocument.create();
		const image = await document.embedPng(await imageBlob.arrayBuffer());
		const maxDimension = 1440;
		const scale = Math.min(
			1,
			maxDimension / Math.max(image.width, image.height),
		);
		const width = image.width * scale;
		const height = image.height * scale;
		const page = document.addPage([width, height]);
		page.drawImage(image, { x: 0, y: 0, width, height });
		const bytes = await document.save();
		return new Blob([new Uint8Array(bytes)], { type: target.mimeTypes[0] });
	}

	if (target.id === "jpeg") {
		const flattened = document.createElement("canvas");
		flattened.width = canvas.width;
		flattened.height = canvas.height;
		const context = flattened.getContext("2d");
		if (!context)
			throw new Error("Canvas rendering is unavailable in this browser.");
		context.fillStyle = "#ffffff";
		context.fillRect(0, 0, flattened.width, flattened.height);
		context.drawImage(canvas, 0, 0);
		return canvasToBlob(flattened, "image/jpeg", normalizedQuality);
	}

	return canvasToBlob(canvas, target.mimeTypes[0], normalizedQuality);
}
