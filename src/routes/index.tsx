import { createFileRoute } from "@tanstack/react-router";
import { Archive, CheckCircle2, ShieldCheck, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Dropzone } from "../components/Dropzone";
import { FileCard } from "../components/FileCard";
import { Spinner } from "../components/Spinner";
import { Wordmark } from "../components/Wordmark";
import { zipBlobs } from "../lib/convert";
import {
	formatBytes,
	heicToJpeg,
	sizeChangePercent,
	uniqueFileNames,
} from "../lib/formats";
import { useConversionQueue } from "../lib/use-conversion-queue";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
	const converter = heicToJpeg;
	const {
		items,
		quality,
		setQuality,
		rejectedNames,
		dismissRejected,
		addFiles,
		removeItem,
		clearAll,
		retryItem,
		reconvertAll,
	} = useConversionQueue(converter);
	const [zipping, setZipping] = useState(false);

	const hasItems = items.length > 0;
	const doneItems = useMemo(
		() => items.filter((item) => item.status === "done"),
		[items],
	);
	const working = items.some(
		(item) => item.status === "queued" || item.status === "converting",
	);
	const errorCount = items.filter((item) => item.status === "error").length;
	const allDone = hasItems && !working && errorCount === 0;
	const staleCount = doneItems.filter(
		(item) => item.quality != null && item.quality !== quality,
	).length;

	const savings = useMemo(() => {
		const input = doneItems.reduce((sum, item) => sum + item.file.size, 0);
		const output = doneItems.reduce(
			(sum, item) => sum + (item.blob?.size ?? 0),
			0,
		);
		return { input, output, percent: sizeChangePercent(input, output) };
	}, [doneItems]);

	const liveMessage = !hasItems
		? ""
		: working
			? `Converting: ${doneItems.length} of ${items.length} files done.`
			: errorCount > 0
				? `Finished with ${errorCount} ${errorCount === 1 ? "error" : "errors"}. ${doneItems.length} of ${items.length} files converted.`
				: `All ${items.length} ${items.length === 1 ? "file" : "files"} converted to JPEG.`;

	async function handleDownloadAll() {
		if (doneItems.length === 0 || zipping) return;
		setZipping(true);
		try {
			const names = uniqueFileNames(doneItems.map((item) => item.outputName));
			const zip = await zipBlobs(
				doneItems.map((item, index) => ({
					name: names[index],
					// biome-ignore lint/style/noNonNullAssertion: done items always carry a blob
					blob: item.blob!,
				})),
			);
			const url = URL.createObjectURL(zip);
			const anchor = document.createElement("a");
			anchor.href = url;
			anchor.download = `${converter.id}.zip`;
			anchor.click();
			setTimeout(() => URL.revokeObjectURL(url), 10_000);
		} finally {
			setZipping(false);
		}
	}

	return (
		<div className="flex min-h-dvh flex-col">
			<header className="border-b border-line">
				<div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
					<Wordmark />
					<p className="flex items-center gap-1.5 text-xs text-ink-soft">
						<ShieldCheck className="size-4 text-ok" aria-hidden="true" />
						<span>
							Files never leave your device
							<span className="max-sm:sr-only"> — no uploads, no server</span>
						</span>
					</p>
				</div>
			</header>

			<main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
				<hgroup className="mb-6 sm:mb-8">
					<h1 className="font-display text-3xl tracking-tight sm:text-4xl">
						HEIC{" "}
						<span aria-hidden="true" className="text-accent">
							→
						</span>
						<span className="sr-only">to</span> JPEG
					</h1>
					<p className="mt-2 max-w-xl text-sm text-ink-soft sm:text-base">
						Turn Apple HEIC and HEIF photos into JPEGs that open anywhere.
						Conversion runs entirely in your browser.
					</p>
				</hgroup>

				<Dropzone
					source={converter.source}
					onFiles={addFiles}
					variant={hasItems ? "compact" : "hero"}
				/>

				{rejectedNames.length > 0 && (
					<div
						role="alert"
						className="mt-4 flex items-start justify-between gap-3 rounded-xl border border-accent/40 bg-accent-wash px-4 py-3 text-sm"
					>
						<p>
							<span className="font-medium">
								{rejectedNames.length === 1
									? "1 file isn’t HEIC/HEIF and was skipped: "
									: `${rejectedNames.length} files aren’t HEIC/HEIF and were skipped: `}
							</span>
							<span className="text-ink-soft">{rejectedNames.join(", ")}</span>
						</p>
						<button
							type="button"
							onClick={dismissRejected}
							className="rounded-lg p-1 text-ink-soft transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
						>
							<X className="size-4" aria-hidden="true" />
							<span className="sr-only">Dismiss</span>
						</button>
					</div>
				)}

				{hasItems && (
					<section aria-label="Conversion workspace" className="mt-6">
						<div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-xl border border-line bg-white/40 px-4 py-3">
							<div className="flex items-center gap-3">
								<label
									htmlFor="jpeg-quality"
									className="text-sm font-medium whitespace-nowrap"
								>
									JPEG quality
								</label>
								<input
									id="jpeg-quality"
									type="range"
									min={50}
									max={100}
									step={5}
									value={quality}
									onChange={(event) => setQuality(Number(event.target.value))}
									className="w-28 sm:w-36"
								/>
								<output
									htmlFor="jpeg-quality"
									className="w-8 font-mono text-sm tabular-nums"
								>
									{quality}
								</output>
								{staleCount > 0 && !working && (
									<button
										type="button"
										onClick={reconvertAll}
										className="rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium transition-colors hover:border-ink-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
									>
										Re-convert at {quality}
									</button>
								)}
							</div>

							<div className="flex items-center gap-3">
								{working ? (
									<p className="flex items-center gap-2 text-sm text-ink-soft">
										<Spinner className="size-4" />
										<span>
											{doneItems.length} of {items.length} done
										</span>
									</p>
								) : allDone ? (
									<p className="flex items-center gap-1.5 text-sm text-ok">
										<CheckCircle2 className="size-4" aria-hidden="true" />
										<span>
											All {items.length} converted
											{savings.percent != null && savings.percent < 0
												? ` · ${-savings.percent}% smaller`
												: ""}
										</span>
									</p>
								) : null}
								{doneItems.length > 1 && (
									<button
										type="button"
										onClick={handleDownloadAll}
										disabled={zipping}
										className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-deep disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
									>
										{zipping ? (
											<Spinner className="size-4" />
										) : (
											<Archive className="size-4" aria-hidden="true" />
										)}
										<span>Download all (.zip)</span>
									</button>
								)}
								<button
									type="button"
									onClick={clearAll}
									className="text-sm text-ink-soft underline-offset-4 transition-colors hover:text-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
								>
									Clear all
								</button>
							</div>
						</div>

						<ul className="mt-4 space-y-2.5">
							{items.map((item) => (
								<FileCard
									key={item.id}
									item={item}
									onRemove={removeItem}
									onRetry={retryItem}
								/>
							))}
						</ul>

						{doneItems.length > 0 && (
							<p className="mt-4 text-xs text-ink-faint">
								{formatBytes(savings.input)} in → {formatBytes(savings.output)}{" "}
								out
								{savings.percent != null && savings.percent !== 0
									? savings.percent < 0
										? ` · ${-savings.percent}% smaller`
										: ` · ${savings.percent}% larger`
									: ""}
							</p>
						)}
					</section>
				)}

				<p aria-live="polite" className="sr-only">
					{liveMessage}
				</p>
			</main>

			<footer className="border-t border-line">
				<div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-5 text-xs text-ink-soft sm:px-6">
					<p>
						Everything happens on your device — this page works without sending
						a single photo anywhere.
					</p>
					<p>
						<span className="font-mono font-semibold text-ink">lab86</span>{" "}
						convert · more formats coming
					</p>
				</div>
			</footer>
		</div>
	);
}
