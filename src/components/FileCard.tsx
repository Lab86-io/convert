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
	const className = "size-5 text-ink-soft";
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
		<li className="relative overflow-hidden rounded-xl border border-line bg-white/65 p-3.5 sm:p-4">
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
			<div className="flex items-center gap-3 sm:gap-4">
				<div
					className={`flex size-11 shrink-0 items-center justify-center rounded-lg border ${isError ? "border-accent/30 bg-accent-wash" : "border-line bg-paper-deep/70"}`}
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
					<p className="truncate text-sm font-medium" title={item.file.name}>
						{item.file.name}
					</p>
					<p className="mt-0.5 truncate text-xs text-ink-soft">
						{isError ? (
							<span className="text-accent-deep">{item.error}</span>
						) : isDone && item.blob ? (
							`${formatBytes(item.file.size)} → ${formatBytes(item.blob.size)} · ${item.outputName}`
						) : item.status === "converting" ? (
							`Converting · ${Math.round(item.progress * 100)}%`
						) : (
							`${item.source.label} · ${formatBytes(item.file.size)}`
						)}
					</p>
				</div>

				<div className="flex shrink-0 items-center gap-2">
					<label className="flex items-center gap-2">
						<span
							aria-hidden="true"
							className="max-sm:hidden font-mono text-xs text-ink-faint"
						>
							→
						</span>
						<select
							value={item.target.id}
							disabled={locked}
							onChange={(event) => onTargetChange(item.id, event.target.value)}
							aria-label={`Output format for ${item.file.name}`}
							className="h-9 rounded-lg border border-line bg-paper px-2.5 text-xs font-semibold uppercase text-ink outline-none transition-colors hover:border-ink-faint disabled:opacity-60 focus:border-accent focus:ring-2 focus:ring-accent/20"
						>
							{targets.map((target) => (
								<option key={target.id} value={target.id}>
									{target.id}
								</option>
							))}
						</select>
					</label>

					{isDone && item.url && (
						<a
							href={item.url}
							download={item.outputName}
							className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-ink px-3 text-xs font-medium text-paper transition-colors hover:bg-accent-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
						>
							<Download className="size-3.5" aria-hidden="true" />
							<span className="max-sm:sr-only">Download</span>
						</a>
					)}
					{isError && (
						<button
							type="button"
							onClick={() => onRetry(item.id)}
							className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-xs font-medium hover:border-ink-faint"
						>
							<RotateCcw className="size-3.5" aria-hidden="true" />
							<span className="max-sm:sr-only">Retry</span>
						</button>
					)}
					<button
						type="button"
						onClick={() => onRemove(item.id)}
						className="rounded-lg p-2 text-ink-faint transition-colors hover:bg-paper-deep hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
					>
						<X className="size-4" aria-hidden="true" />
						<span className="sr-only">Remove {item.file.name}</span>
					</button>
				</div>
			</div>
			{item.path.note && !isError && (
				<p className="mt-2 pl-14 text-[11px] text-ink-faint sm:pl-[3.75rem]">
					{item.path.note}
				</p>
			)}
		</li>
	);
}
