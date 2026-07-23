import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright-core";

const url = process.env.TEST_URL ?? "http://127.0.0.1:8894";
const executablePath = process.env.CHROMIUM_PATH;
const heicPath = process.env.HEIC_FIXTURE;
const mediaPath = process.env.MEDIA_FIXTURE;
const zoomPath = process.env.ZOOM_FIXTURE;
assert(executablePath, "CHROMIUM_PATH is required");

const fixtures = {
	csv: {
		name: "records.csv",
		mimeType: "text/csv",
		buffer: Buffer.from("name,count\npears,3\napples,5\n"),
	},
	...(heicPath
		? {
				heic: {
					name: "photo.heic",
					mimeType: "image/heic",
					buffer: await readFile(heicPath),
				},
			}
		: {}),
	...(mediaPath
		? {
				media: {
					name: "clip.mp4",
					mimeType: "video/mp4",
					buffer: await readFile(mediaPath),
				},
			}
		: {}),
	...(zoomPath
		? {
				zoom: {
					name: "double_click_to_convert_01.zoom",
					mimeType: "application/octet-stream",
					buffer: await readFile(zoomPath),
				},
			}
		: {}),
};

const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const runtimeErrors = [];
page.on("pageerror", (error) => runtimeErrors.push(error.message));
page.on("console", (message) => {
	if (message.type() === "error") runtimeErrors.push(message.text());
});

async function reset() {
	await page.goto(url, { waitUntil: "domcontentloaded" });
	await page.getByRole("heading", { name: /^convert files$/i }).waitFor();
	await page.waitForTimeout(1_000);
}

async function convertOne(file, target) {
	await reset();
	await page.locator('input[type="file"]').setInputFiles(file);
	if (target) await page.getByLabel(new RegExp(`output format for ${file.name}`, "i")).selectOption(target);
	await page
		.getByRole("button", { name: /convert all|recover recording/i })
		.click({ timeout: 30_000 });
	const download = page.getByRole("link", { name: /download/i });
	const retry = page.getByRole("button", { name: /retry/i });
	const outcome = await Promise.race([
		download.waitFor({ timeout: 180_000 }).then(() => "done"),
		retry.waitFor({ timeout: 180_000 }).then(() => "error"),
	]);
	if (outcome === "error") throw new Error(`Conversion failed: ${await page.getByRole("listitem").innerText()}`);
	return download.evaluate(async (link) => {
		const response = await fetch(link.href);
		const blob = await response.blob();
		return {
			name: link.download,
			size: blob.size,
			type: blob.type,
			text: blob.type.includes("json") ? await blob.text() : "",
		};
	});
}

try {
	await reset();
	await page.screenshot({ path: "/tmp/lab86-convert-home.png", fullPage: true });
	const queueFixtures = Object.values(fixtures);
	await page.locator('input[type="file"]').setInputFiles(queueFixtures);
	await page.getByRole("listitem").nth(queueFixtures.length - 1).waitFor();
	assert.equal(await page.getByRole("listitem").count(), queueFixtures.length);
	await page.screenshot({ path: "/tmp/lab86-convert-queue.png", fullPage: true });

	const csv = await convertOne(fixtures.csv);
	assert(csv.name.endsWith(".json") && JSON.parse(csv.text)[0].count === 3);
	console.log(`CSV smoke passed: ${csv.size} bytes`);

	let heic = null;
	if ("heic" in fixtures) {
		heic = await convertOne(fixtures.heic);
		assert(heic.name.endsWith(".jpg") && heic.size > 1_000);
		console.log(`HEIC smoke passed: ${heic.size} bytes`);
	}

	let media = null;
	if ("media" in fixtures) {
		media = await convertOne(fixtures.media, "mp3");
		assert(media.name.endsWith(".mp3") && media.size > 1_000);
		console.log(`Media smoke passed: ${media.size} bytes`);
	}

	let zoom = null;
	if (fixtures.zoom) {
		zoom = await convertOne(fixtures.zoom);
		assert(zoom.name.endsWith(".mp4") && zoom.size > 10_000);
		console.log(`Zoom recovery smoke passed: ${zoom.size} bytes`);
	}

	await page.screenshot({ path: "/tmp/lab86-convert-results.png", fullPage: true });
	await page.setViewportSize({ width: 390, height: 844 });
	await page.screenshot({ path: "/tmp/lab86-convert-mobile.png", fullPage: true });
	const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
	assert(overflow <= 1, `Mobile layout overflows by ${overflow}px`);
	assert.deepEqual(runtimeErrors, []);
	console.log(
		JSON.stringify(
			{
				outputs: [
					csv,
					...(heic ? [heic] : []),
					...(media ? [media] : []),
					...(zoom ? [zoom] : []),
				],
				overflow,
			},
			null,
			2,
		),
	);
} finally {
	await browser.close();
}
