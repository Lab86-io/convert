import { createFileRoute } from "@tanstack/react-router";
import { Archive, ArrowRight, Check, LockKeyhole, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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

const inputFormatCount = formats.filter((format) => format.canInput).length;
const outputFormatCount = formats.filter((format) => format.canOutput).length;

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

	useEffect(() => {
		if (!hasItems) return;
		function keepFileDropInApp(event: DragEvent) {
			if (event.dataTransfer?.types.includes("Files")) event.preventDefault();
		}
		function addDroppedFiles(event: DragEvent) {
			if (event.defaultPrevented || !event.dataTransfer?.files.length) return;
			event.preventDefault();
			addFiles(event.dataTransfer.files);
		}
		document.addEventListener("dragover", keepFileDropInApp);
		document.addEventListener("drop", addDroppedFiles);
		return () => {
			document.removeEventListener("dragover", keepFileDropInApp);
			document.removeEventListener("drop", addDroppedFiles);
		};
	}, [addFiles, hasItems]);

	function handleClear() {
		if (
			doneItems.length > 0 &&
			!window.confirm("Clear this batch and remove its converted downloads?")
		)
			return;
		clearAll();
	}

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
			<header className="border-b border-line bg-panel">
				<div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
					<Wordmark />
					<p className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-soft">
						{inputFormatCount} inputs · {outputFormatCount} outputs
					</p>
				</div>
			</header>

			<main className="mx-auto w-full max-w-6xl flex-1 px-4 py-7 sm:px-6 sm:py-10">
				{!hasItems && (
					<section className="mb-5 flex flex-wrap items-end justify-between gap-4">
						<div>
							<h1 className="text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
								Convert files
							</h1>
							<p className="mt-2 max-w-2xl text-sm leading-6 text-ink-soft">
								Images, audio, video, documents, text, and data in one batch.
							</p>
						</div>
						<div className="text-xs text-ink-soft">
							<p className="flex items-center gap-2">
								<LockKeyhole className="size-3.5" aria-hidden="true" />
								Files stay on this device
							</p>
						</div>
					</section>
				)}

				{rejectedNames.length > 0 && (
					<div
						role="alert"
						className="mb-4 flex items-start justify-between gap-3 border border-danger/30 bg-danger-wash px-4 py-3 text-sm"
					>
						<p>
							<span className="font-medium">Not supported yet: </span>
							<span className="text-ink-soft">{rejectedNames.join(", ")}</span>
						</p>
						<button
							type="button"
							onClick={dismissRejected}
							className="p-1 text-ink-soft hover:text-ink"
						>
							<X className="size-4" />
							<span className="sr-only">Dismiss</span>
						</button>
					</div>
				)}

				{!hasItems ? (
					<section
						aria-label="New conversion"
						className="border border-ink bg-panel"
					>
						<div className="flex items-center justify-between border-b border-line px-4 py-2.5 text-xs">
							<span className="font-semibold text-ink">New batch</span>
							<span className="text-ink-soft">
								Choose one file or a mixed batch
							</span>
						</div>
						<div className="p-3 sm:p-5">
							<Dropzone onFiles={addFiles} variant="hero" />
						</div>
						<div className="grid grid-cols-2 border-t border-line sm:grid-cols-3 lg:grid-cols-6">
							{Object.entries(categoryLabels).map(
								([category, label], index) => {
									const list = formats
										.filter(
											(format) =>
												format.category === category && format.canInput,
										)
										.map((format) => format.id.toUpperCase())
										.join("  ");
									return (
										<div
											key={category}
											className={`min-w-0 p-3 sm:p-4 ${index > 0 ? "border-l border-line" : ""} max-sm:[&:nth-child(odd)]:border-l-0 max-sm:[&:nth-child(n+3)]:border-t max-lg:[&:nth-child(4)]:border-l-0 max-lg:[&:nth-child(n+4)]:border-t`}
										>
											<h2 className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-ink">
												{label}
											</h2>
											<p
												className="mt-1.5 font-mono text-[10px] leading-4 text-ink-soft"
												title={list}
											>
												{list}
											</p>
										</div>
									);
								},
							)}
						</div>
					</section>
				) : (
					<section
						aria-label="Conversion workspace"
						className="border border-ink bg-panel"
					>
						<div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-panel px-3 py-2.5 sm:px-4">
							<div className="flex items-center gap-3">
								<p className="text-xs font-semibold">
									{items.length} {items.length === 1 ? "file" : "files"}
								</p>
								<span className="hidden h-4 w-px bg-line sm:block" />
								<Dropzone onFiles={addFiles} variant="compact" />
							</div>
							<button
								type="button"
								onClick={handleClear}
								className="text-xs text-ink-soft hover:text-ink"
							>
								Clear batch
							</button>
						</div>

						<div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-canvas px-3 py-3 sm:px-4">
							<div className="flex flex-wrap items-center gap-4">
								{showQuality ? (
									<label className="flex items-center gap-2 text-xs text-ink-soft">
										Quality
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
										<output className="w-7 text-right tabular-nums text-ink">
											{quality}
										</output>
									</label>
								) : (
									<p className="text-xs text-ink-soft">
										Choose an output format in each row
									</p>
								)}
								{staleCount > 0 && !working && (
									<button
										type="button"
										onClick={reconvertAll}
										className="text-xs font-medium text-accent underline underline-offset-4"
									>
										Re-convert finished
									</button>
								)}
							</div>
							<div className="flex items-center gap-2">
								{working && (
									<p className="flex items-center gap-2 font-mono text-[10px] uppercase text-ink-soft">
										<Spinner className="size-3.5" /> {doneItems.length}/
										{items.length} complete
									</p>
								)}
								{doneItems.length > 1 && !working && (
									<button
										type="button"
										onClick={handleDownloadAll}
										disabled={zipping}
										className="inline-flex h-9 items-center gap-2 border border-ink bg-panel px-3 font-mono text-[10px] font-semibold uppercase tracking-[0.06em] hover:bg-canvas disabled:opacity-60"
									>
										{zipping ? (
											<Spinner className="size-3.5" />
										) : (
											<Archive className="size-3.5" />
										)}{" "}
										Download ZIP
									</button>
								)}
								{actionableCount > 0 && !working && (
									<button
										type="button"
										onClick={startAll}
										className="inline-flex h-9 items-center gap-2 bg-accent px-4 text-xs font-semibold text-white hover:bg-accent-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
									>
										Convert{" "}
										{actionableCount === items.length ? "all" : actionableCount}
										<ArrowRight className="size-3.5" aria-hidden="true" />
									</button>
								)}
							</div>
						</div>

						<div className="hidden grid-cols-[2.25rem_minmax(12rem,1fr)_5.5rem_8rem_8.5rem_6.5rem] items-center gap-3 border-b border-line px-3 py-2 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-soft md:grid sm:px-4">
							<span />
							<span>File</span>
							<span>From</span>
							<span>Convert to</span>
							<span>Status / size</span>
							<span className="text-right">Action</span>
						</div>
						<ul className="divide-y divide-line">
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

						<div className="flex min-h-11 flex-wrap items-center justify-between gap-2 border-t border-line bg-canvas px-3 py-2 font-mono text-[11px] text-ink-soft sm:px-4">
							{doneItems.length > 0 && !working ? (
								<p className="flex items-center gap-2">
									<Check className="size-3.5 text-ok" aria-hidden="true" />
									{doneItems.length} ready / {formatBytes(savings.input)} in /{" "}
									{formatBytes(savings.output)} out
									{savings.percent && savings.percent < 0
										? ` / ${-savings.percent}% smaller`
										: ""}
									{errorCount ? ` / ${errorCount} failed` : ""}
								</p>
							) : (
								<p>
									{working
										? "Conversion running locally"
										: "Review outputs, then convert"}
								</p>
							)}
							<p className="text-ink-faint">Processed in this browser</p>
						</div>
					</section>
				)}
			</main>

			<footer className="border-t border-line bg-panel">
				<div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-ink-faint sm:px-6">
					<p>Local processing. No file uploads.</p>
					<p className="font-mono">lab86 convert v1</p>
				</div>
			</footer>
		</div>
	);
}
