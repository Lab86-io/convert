import { Files, Plus } from "lucide-react";
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
			className={`group relative block cursor-pointer overflow-hidden rounded-2xl border transition-all duration-150 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-paper ${
				dragActive
					? "border-accent bg-accent-wash shadow-[0_0_0_4px_var(--color-accent-wash)]"
					: "border-dashed border-line bg-white/55 hover:border-ink-faint"
			} ${variant === "hero" ? "px-6 py-12 sm:py-16" : "px-5 py-4"}`}
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
				<span className="flex flex-col items-center text-center">
					<span className="mb-5 flex size-12 items-center justify-center rounded-xl border border-line bg-paper text-ink-soft shadow-sm transition-transform group-hover:-translate-y-0.5">
						<Files className="size-5" strokeWidth={1.75} aria-hidden="true" />
					</span>
					<span className="font-display text-2xl tracking-tight sm:text-3xl">
						{dragActive ? "Let go to add them" : "Drop anything here"}
					</span>
					<span className="mt-2 text-sm text-ink-soft">
						Images, video, audio, documents, and structured data
					</span>
					<span className="mt-5 inline-flex rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-paper transition-colors group-hover:bg-accent-deep">
						Choose files
					</span>
					<span id={`${inputId}-hint`} className="mt-3 text-xs text-ink-faint">
						Choose several formats at once · nothing is uploaded
					</span>
				</span>
			) : (
				<span className="flex items-center justify-center gap-2.5 text-sm">
					<Plus className="size-4 text-ink-soft" aria-hidden="true" />
					<span className="font-medium">
						{dragActive ? "Drop to add" : "Add more files"}
					</span>
					<span id={`${inputId}-hint`} className="text-ink-faint">
						mixed formats welcome
					</span>
				</span>
			)}
		</label>
	);
}
