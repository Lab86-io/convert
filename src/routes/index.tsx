import { createFileRoute } from "@tanstack/react-router";
import {
	Archive,
	ArrowRight,
	CheckCircle2,
	LockKeyhole,
	X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Dropzone } from "../components/Dropzone";
import { FileCard } from "../components/FileCard";
import { Spinner } from "../components/Spinner";
import { Wordmark } from "../components/Wordmark";
import { zipBlobs } from "../lib/convert";
import {
	categoryLabels,
	formatBytes,
	formats,
	sizeChangePercent,
	uniqueFileNames,
} from "../lib/formats";
import { useConversionQueue } from "../lib/use-conversion-queue";

export const Route = createFileRoute("/")({ component: Home });

const featuredFormats = [
	"HEIC",
	"JPG",
	"PNG",
	"WEBP",
	"MP4",
	"MOV",
	"MP3",
	"WAV",
	"PDF",
	"DOCX",
	"JSON",
	"CSV",
];

function Home() {
	const {
		items,
		quality,
		setQuality,
		rejectedNames,
		dismissRejected,
		addFiles,
		changeTarget,
		startAll,
		removeItem,
		clearAll,
		retryItem,
		reconvertAll,
	} = useConversionQueue();
	const [zipping, setZipping] = useState(false);
	const hasItems = items.length > 0;
	const doneItems = useMemo(
		() => items.filter((item) => item.status === "done"),
		[items],
	);
	const actionableCount = items.filter(
		(item) => item.status === "ready" || item.status === "error",
	).length;
	const working = items.some(
		(item) => item.status === "queued" || item.status === "converting",
	);
	const errorCount = items.filter((item) => item.status === "error").length;
	const staleCount = doneItems.filter(
		(item) => item.path.fidelity === "lossy" && item.quality !== quality,
	).length;
	const showQuality = items.some((item) => item.path.fidelity === "lossy");
	const savings = useMemo(() => {
		const input = doneItems.reduce((sum, item) => sum + item.file.size, 0);
		const output = doneItems.reduce(
			(sum, item) => sum + (item.blob?.size ?? 0),
			0,
		);
		return { input, output, percent: sizeChangePercent(input, output) };
	}, [doneItems]);

	async function handleDownloadAll() {
		if (!doneItems.length || zipping) return;
		setZipping(true);
		try {
			const names = uniqueFileNames(doneItems.map((item) => item.outputName));
			const zip = await zipBlobs(
				doneItems.map((item, index) => ({
					name: names[index],
					blob: item.blob as Blob,
				})),
			);
			const url = URL.createObjectURL(zip);
			const anchor = document.createElement("a");
			anchor.href = url;
			anchor.download = "lab86-converted.zip";
			anchor.click();
			setTimeout(() => URL.revokeObjectURL(url), 10_000);
		} finally {
			setZipping(false);
		}
	}

	return (
		<div className="flex min-h-dvh flex-col">
			<header className="border-b border-line/80">
				<div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
					<Wordmark />
					<p className="flex items-center gap-1.5 text-xs text-ink-soft">
						<LockKeyhole className="size-3.5 text-ok" aria-hidden="true" />
						<span>Local-only conversion</span>
					</p>
				</div>
			</header>

			<main className="mx-auto w-full max-w-5xl flex-1 px-4 py-9 sm:px-6 sm:py-14">
				{!hasItems && (
					<div className="mx-auto max-w-3xl text-center">
						<p className="mb-4 text-[11px] font-medium uppercase tracking-[0.2em] text-ink-faint">
							Private · in-browser · nothing uploaded
						</p>
						<h1 className="font-display text-4xl tracking-[-0.035em] text-balance sm:text-6xl">
							Anything <span className="text-accent">→</span> anything
						</h1>
						<p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-ink-soft sm:text-lg">
							Drop a messy mix of files, choose what each should become, and
							convert them together. Your files stay in this browser.
						</p>
						<div className="mt-5 flex flex-wrap justify-center gap-1.5">
							{featuredFormats.map((format) => (
								<span
									key={format}
									className="rounded-md bg-paper-deep px-2 py-1 font-mono text-[10px] text-ink-soft"
								>
									{format}
								</span>
							))}
						</div>
					</div>
				)}

				<div className={`mx-auto max-w-3xl ${hasItems ? "" : "mt-8 sm:mt-10"}`}>
					<Dropzone
						onFiles={addFiles}
						variant={hasItems ? "compact" : "hero"}
					/>

					{rejectedNames.length > 0 && (
						<div
							role="alert"
							className="mt-4 flex items-start justify-between gap-3 rounded-xl border border-accent/30 bg-accent-wash px-4 py-3 text-sm"
						>
							<p>
								<span className="font-medium">Not supported yet: </span>
								<span className="text-ink-soft">
									{rejectedNames.join(", ")}
								</span>
							</p>
							<button
								type="button"
								onClick={dismissRejected}
								className="rounded p-1 text-ink-soft hover:text-ink"
							>
								<X className="size-4" />
								<span className="sr-only">Dismiss</span>
							</button>
						</div>
					)}

					{hasItems && (
						<section aria-label="Conversion workspace" className="mt-5">
							<div className="sticky top-2 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-paper/95 px-4 py-3 backdrop-blur-sm">
								<div className="flex items-center gap-3">
									<p className="text-sm font-medium">
										{items.length} {items.length === 1 ? "file" : "files"}
									</p>
									{showQuality && (
										<label className="flex items-center gap-2 text-xs text-ink-soft">
											Quality{" "}
											<input
												type="range"
												min="50"
												max="100"
												step="5"
												value={quality}
												onChange={(event) =>
													setQuality(Number(event.target.value))
												}
												className="w-20 sm:w-28"
											/>
											<output className="w-6 font-mono tabular-nums">
												{quality}
											</output>
										</label>
									)}
									{staleCount > 0 && !working && (
										<button
											type="button"
											onClick={reconvertAll}
											className="text-xs font-medium text-accent-deep underline underline-offset-4"
										>
											Re-convert finished
										</button>
									)}
								</div>
								<div className="flex items-center gap-2">
									{working && (
										<p className="flex items-center gap-1.5 text-xs text-ink-soft">
											<Spinner className="size-3.5" />
											{doneItems.length} of {items.length} done
										</p>
									)}
									{actionableCount > 0 && !working && (
										<button
											type="button"
											onClick={startAll}
											className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3.5 text-sm font-medium text-white transition-colors hover:bg-accent-deep"
										>
											Convert{" "}
											{actionableCount === items.length
												? "all"
												: actionableCount}{" "}
											<ArrowRight className="size-3.5" aria-hidden="true" />
										</button>
									)}
									{doneItems.length > 1 && !working && (
										<button
											type="button"
											onClick={handleDownloadAll}
											disabled={zipping}
											className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-ink px-3 text-xs font-medium text-paper hover:bg-accent-deep disabled:opacity-60"
										>
											{zipping ? (
												<Spinner className="size-3.5" />
											) : (
												<Archive className="size-3.5" />
											)}{" "}
											ZIP
										</button>
									)}
									<button
										type="button"
										onClick={clearAll}
										className="rounded px-1 py-2 text-xs text-ink-soft hover:text-ink"
									>
										Clear
									</button>
								</div>
							</div>

							<ul className="mt-3 space-y-2.5">
								{items.map((item) => (
									<FileCard
										key={item.id}
										item={item}
										onRemove={removeItem}
										onRetry={retryItem}
										onTargetChange={changeTarget}
									/>
								))}
							</ul>

							{doneItems.length > 0 && !working && (
								<p className="mt-3 flex items-center gap-1.5 text-xs text-ink-faint">
									<CheckCircle2 className="size-3.5 text-ok" />
									{doneItems.length} ready · {formatBytes(savings.input)} in →{" "}
									{formatBytes(savings.output)} out
									{savings.percent && savings.percent < 0
										? ` · ${-savings.percent}% smaller`
										: ""}
									{errorCount ? ` · ${errorCount} failed` : ""}
								</p>
							)}
						</section>
					)}
				</div>

				{!hasItems && (
					<section className="mx-auto mt-14 grid max-w-3xl grid-cols-2 gap-x-8 gap-y-7 border-t border-line pt-8 sm:grid-cols-3">
						{Object.entries(categoryLabels).map(([category, label]) => {
							const list = formats
								.filter(
									(format) => format.category === category && format.canInput,
								)
								.map((format) => format.id.toUpperCase())
								.join(" · ");
							return (
								<div key={category}>
									<h2 className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
										{label}
									</h2>
									<p className="mt-1.5 text-[11px] leading-relaxed text-ink-faint">
										{list}
									</p>
								</div>
							);
						})}
					</section>
				)}
			</main>

			<footer className="border-t border-line/80">
				<div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-5 text-xs text-ink-soft sm:px-6">
					<p>No uploads. No accounts. No files retained.</p>
					<p className="font-mono">
						<span className="font-semibold text-ink">lab86</span> convert
					</p>
				</div>
			</footer>
		</div>
	);
}
