import { AlertCircle, Download, ImageIcon, RotateCcw, X } from "lucide-react";
import { formatBytes } from "../lib/formats";
import type { QueueItem } from "../lib/use-conversion-queue";
import { Spinner } from "./Spinner";

interface FileCardProps {
	item: QueueItem;
	onRemove: (id: string) => void;
	onRetry: (id: string) => void;
}

export function FileCard({ item, onRemove, onRetry }: FileCardProps) {
	const isDone = item.status === "done";
	const isError = item.status === "error";

	return (
		<li className="flex items-center gap-3 rounded-xl border border-line bg-white/60 p-3 sm:gap-4">
			<div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-paper-deep">
				{isDone && item.url ? (
					<img
						src={item.url}
						alt={`Preview of ${item.outputName}`}
						className="size-full object-cover"
					/>
				) : isError ? (
					<AlertCircle className="size-5 text-accent-deep" aria-hidden="true" />
				) : item.status === "converting" ? (
					<Spinner className="size-5 text-ink-soft" />
				) : (
					<ImageIcon
						className="size-5 text-ink-faint"
						strokeWidth={1.5}
						aria-hidden="true"
					/>
				)}
			</div>

			<div className="min-w-0 flex-1">
				<p className="truncate text-sm font-medium" title={item.outputName}>
					{isDone ? item.outputName : item.file.name}
				</p>
				<p className="mt-0.5 truncate text-xs text-ink-soft">
					{isDone && item.blob ? (
						<>
							{formatBytes(item.file.size)}
							<span aria-hidden="true"> → </span>
							<span className="sr-only"> converted to </span>
							{formatBytes(item.blob.size)}
							{item.quality != null && (
								<span className="text-ink-faint">
									{" "}
									· quality {item.quality}
								</span>
							)}
						</>
					) : isError ? (
						<span className="text-accent-deep">{item.error}</span>
					) : item.status === "converting" ? (
						"Converting…"
					) : (
						`${formatBytes(item.file.size)} · waiting`
					)}
				</p>
			</div>

			<div className="flex shrink-0 items-center gap-1.5">
				{isDone && item.url && (
					<a
						href={item.url}
						download={item.outputName}
						className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3 py-2 text-xs font-medium text-paper transition-colors hover:bg-accent-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
					>
						<Download className="size-3.5" aria-hidden="true" />
						<span>
							JPEG<span className="sr-only"> — {item.outputName}</span>
						</span>
					</a>
				)}
				{isError && (
					<button
						type="button"
						onClick={() => onRetry(item.id)}
						className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs font-medium transition-colors hover:border-ink-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
					>
						<RotateCcw className="size-3.5" aria-hidden="true" />
						<span>
							Retry<span className="sr-only"> {item.file.name}</span>
						</span>
					</button>
				)}
				<button
					type="button"
					onClick={() => onRemove(item.id)}
					className="rounded-lg p-2 text-ink-faint transition-colors hover:bg-paper-deep hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
				>
					<X className="size-4" aria-hidden="true" />
					<span className="sr-only">Remove {item.file.name}</span>
				</button>
			</div>
		</li>
	);
}
