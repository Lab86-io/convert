import {
	AlertCircle,
	CheckCircle2,
	Download,
	FileAudio,
	FileImage,
	FileJson,
	FileText,
	FileVideo,
	RotateCcw,
	X,
} from "lucide-react";
import { formatBytes, getCompatibleTargets } from "../lib/formats";
import type { QueueItem } from "../lib/use-conversion-queue";
import { Spinner } from "./Spinner";

interface FileCardProps {
	item: QueueItem;
	onRemove: (id: string) => void;
	onRetry: (id: string) => void;
	onTargetChange: (id: string, targetId: string) => void;
}

function CategoryIcon({ item }: { item: QueueItem }) {
	const className = "size-4 text-ink-soft";
	switch (item.source.category) {
		case "image":
			return (
				<FileImage className={className} strokeWidth={1.6} aria-hidden="true" />
			);
		case "video":
			return (
				<FileVideo className={className} strokeWidth={1.6} aria-hidden="true" />
			);
		case "audio":
			return (
				<FileAudio className={className} strokeWidth={1.6} aria-hidden="true" />
			);
		case "data":
			return (
				<FileJson className={className} strokeWidth={1.6} aria-hidden="true" />
			);
		default:
			return (
				<FileText className={className} strokeWidth={1.6} aria-hidden="true" />
			);
	}
}

export function FileCard({
	item,
	onRemove,
	onRetry,
	onTargetChange,
}: FileCardProps) {
	const isDone = item.status === "done";
	const isError = item.status === "error";
	const locked = item.status === "queued" || item.status === "converting";
	const targets = getCompatibleTargets(item.source.id);

	return (
		<li className="relative px-3 py-3.5 sm:px-4">
			{item.status === "converting" && (
				<div
					className="absolute inset-x-0 bottom-0 h-0.5 bg-paper-deep"
					aria-hidden="true"
				>
					<div
						className="h-full bg-accent transition-[width]"
						style={{ width: `${Math.max(3, item.progress * 100)}%` }}
					/>
				</div>
			)}
			<div className="grid items-center gap-3 md:grid-cols-[2.25rem_minmax(12rem,1fr)_5.5rem_8rem_8.5rem_6.5rem]">
				<div
					className={`flex size-8 shrink-0 items-center justify-center border ${isError ? "border-danger/30 bg-danger-wash" : "border-line bg-canvas"}`}
				>
					{isError ? (
						<AlertCircle
							className="size-5 text-accent-deep"
							aria-hidden="true"
						/>
					) : item.status === "converting" ? (
						<Spinner className="size-5 text-accent" />
					) : isDone ? (
						<CheckCircle2 className="size-5 text-ok" aria-hidden="true" />
					) : (
						<CategoryIcon item={item} />
					)}
				</div>

				<div className="min-w-0 flex-1">
					<p className="truncate text-xs font-semibold" title={item.file.name}>
						{item.file.name}
					</p>
					{isError ? (
						<p className="mt-1 text-xs leading-4 text-danger">{item.error}</p>
					) : item.path.note ? (
						<p
							className="mt-1 text-xs leading-4 text-ink-soft"
							title={item.path.note}
						>
							{item.path.note}
						</p>
					) : null}
				</div>

				<p className="font-mono text-[11px] font-semibold uppercase text-ink-soft">
					<span className="mr-1 text-ink-faint md:hidden">From</span>
					{item.source.id}
				</p>

				<label className="flex items-center gap-2">
					<span className="font-mono text-[11px] uppercase text-ink-soft md:hidden">
						To
					</span>
					<select
						value={item.target.id}
						disabled={locked}
						onChange={(event) => onTargetChange(item.id, event.target.value)}
						aria-label={`Output format for ${item.file.name}`}
						className="h-9 w-full border border-line bg-panel px-2 font-mono text-[11px] font-semibold uppercase text-ink outline-none transition-colors hover:border-ink disabled:opacity-60 focus:border-accent focus:ring-2 focus:ring-accent/20"
					>
						{targets.map((target) => (
							<option key={target.id} value={target.id}>
								{target.id}
							</option>
						))}
					</select>
				</label>

				<p
					className={`font-mono text-[11px] ${isError ? "text-danger" : "text-ink-soft"}`}
				>
					{isError
						? "Failed"
						: isDone && item.blob
							? `${formatBytes(item.blob.size)} output`
							: item.status === "converting"
								? `${Math.round(item.progress * 100)}% converting`
								: `${formatBytes(item.file.size)} input`}
				</p>

				<div className="flex shrink-0 items-center gap-2 md:justify-end">
					{isDone && item.url && (
						<a
							href={item.url}
							download={item.outputName}
							className="inline-flex h-9 items-center gap-1.5 bg-ink px-3 text-xs font-semibold text-white transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
						>
							<Download className="size-3.5" aria-hidden="true" />
							<span>Download</span>
						</a>
					)}
					{isError && (
						<button
							type="button"
							onClick={() => onRetry(item.id)}
							className="inline-flex h-9 items-center gap-1.5 border border-line px-3 text-xs font-semibold hover:border-ink"
						>
							<RotateCcw className="size-3.5" aria-hidden="true" />
							<span>Retry</span>
						</button>
					)}
					<button
						type="button"
						onClick={() => onRemove(item.id)}
						className="p-2 text-ink-faint transition-colors hover:bg-canvas hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
					>
						<X className="size-4" aria-hidden="true" />
						<span className="sr-only">Remove {item.file.name}</span>
					</button>
				</div>
			</div>
		</li>
	);
}
