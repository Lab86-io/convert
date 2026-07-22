import { ArrowDownToLine, Plus } from "lucide-react";
import { useId, useRef, useState } from "react";
import { universalAcceptAttribute } from "../lib/formats";

interface DropzoneProps {
	onFiles: (files: Iterable<File>) => void;
	variant: "hero" | "compact";
}

export function Dropzone({ onFiles, variant }: DropzoneProps) {
	const inputId = useId();
	const [dragActive, setDragActive] = useState(false);
	const dragDepth = useRef(0);

	function handleDrop(event: React.DragEvent) {
		event.preventDefault();
		dragDepth.current = 0;
		setDragActive(false);
		if (event.dataTransfer.files.length > 0) onFiles(event.dataTransfer.files);
	}

	function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
		if (event.target.files?.length) onFiles(event.target.files);
		event.target.value = "";
	}

	return (
		<label
			htmlFor={inputId}
			className={`group relative cursor-pointer transition-colors duration-150 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent has-[:focus-visible]:ring-offset-2 ${
				dragActive
					? "border-accent bg-accent-wash"
					: "border-line hover:border-ink"
			} ${
				variant === "hero"
					? "drop-grid flex min-h-60 items-center border border-dashed px-6 py-10 sm:min-h-72 sm:px-10"
					: "inline-flex items-center border-0"
			}`}
			onDragEnter={(event) => {
				event.preventDefault();
				dragDepth.current += 1;
				setDragActive(true);
			}}
			onDragOver={(event) => event.preventDefault()}
			onDragLeave={(event) => {
				event.preventDefault();
				dragDepth.current = Math.max(0, dragDepth.current - 1);
				if (dragDepth.current === 0) setDragActive(false);
			}}
			onDrop={handleDrop}
			data-drag-active={dragActive || undefined}
		>
			<input
				id={inputId}
				type="file"
				multiple
				accept={universalAcceptAttribute()}
				onChange={handleChange}
				className="sr-only"
				aria-describedby={`${inputId}-hint`}
			/>
			{variant === "hero" ? (
				<span className="mx-auto grid w-full max-w-3xl items-center gap-6 sm:grid-cols-[4rem_minmax(0,1fr)_auto] sm:gap-8">
					<span className="flex size-14 items-center justify-center border border-ink bg-panel text-ink transition-transform group-hover:-translate-y-0.5 sm:size-16">
						<ArrowDownToLine
							className="size-6"
							strokeWidth={1.5}
							aria-hidden="true"
						/>
					</span>
					<span>
						<span className="block text-xl font-semibold tracking-[-0.025em] sm:text-2xl">
							{dragActive
								? "Release to add files"
								: "Drop files into this batch"}
						</span>
						<span className="mt-2 block text-sm leading-5 text-ink-soft">
							Images, audio, video, Zoom recordings, documents, text, or data.
							Files never leave this browser.
						</span>
						<span id={`${inputId}-hint`} className="sr-only">
							Select multiple files at once
						</span>
					</span>
					<span className="inline-flex h-10 w-fit items-center justify-center bg-ink px-4 text-xs font-semibold text-white transition-colors group-hover:bg-accent">
						Select files
					</span>
				</span>
			) : (
				<span className="flex items-center gap-1.5 text-xs font-semibold text-accent">
					<Plus className="size-3.5" aria-hidden="true" />
					<span>{dragActive ? "Drop to add" : "Add more files"}</span>
					<span id={`${inputId}-hint`} className="sr-only">
						Mixed formats welcome
					</span>
				</span>
			)}
		</label>
	);
}
