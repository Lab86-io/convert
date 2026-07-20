import { ImagePlus, ImageUp } from "lucide-react";
import { useId, useRef, useState } from "react";
import type { SourceFormat } from "../lib/formats";
import { acceptAttribute } from "../lib/formats";

interface DropzoneProps {
	source: SourceFormat;
	onFiles: (files: Iterable<File>) => void;
	/** `hero` is the dominant first action; `compact` is the add-more strip. */
	variant: "hero" | "compact";
}

export function Dropzone({ source, onFiles, variant }: DropzoneProps) {
	const inputId = useId();
	const [dragActive, setDragActive] = useState(false);
	const dragDepth = useRef(0);

	function handleDrop(event: React.DragEvent) {
		event.preventDefault();
		dragDepth.current = 0;
		setDragActive(false);
		if (event.dataTransfer.files.length > 0) {
			onFiles(event.dataTransfer.files);
		}
	}

	function handleDragEnter(event: React.DragEvent) {
		event.preventDefault();
		dragDepth.current += 1;
		setDragActive(true);
	}

	function handleDragLeave(event: React.DragEvent) {
		event.preventDefault();
		dragDepth.current = Math.max(0, dragDepth.current - 1);
		if (dragDepth.current === 0) setDragActive(false);
	}

	function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
		if (event.target.files && event.target.files.length > 0) {
			onFiles(event.target.files);
		}
		// Allow picking the same file again.
		event.target.value = "";
	}

	const base =
		"group relative block cursor-pointer rounded-2xl border-2 border-dashed transition-colors duration-150 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-paper";
	const tone = dragActive
		? "border-accent bg-accent-wash"
		: "border-line bg-paper-deep/50 hover:border-ink-faint";

	return (
		<label
			htmlFor={inputId}
			className={`${base} ${tone} ${
				variant === "hero" ? "px-6 py-14 sm:py-20" : "px-5 py-4"
			}`}
			onDragEnter={handleDragEnter}
			onDragOver={(event) => event.preventDefault()}
			onDragLeave={handleDragLeave}
			onDrop={handleDrop}
			data-drag-active={dragActive || undefined}
		>
			<input
				id={inputId}
				type="file"
				multiple
				accept={acceptAttribute(source)}
				onChange={handleChange}
				className="sr-only"
				aria-describedby={`${inputId}-hint`}
			/>
			{variant === "hero" ? (
				<span className="flex flex-col items-center gap-4 text-center">
					<ImageUp
						className={`size-10 transition-colors ${
							dragActive
								? "text-accent"
								: "text-ink-faint group-hover:text-ink-soft"
						}`}
						strokeWidth={1.5}
						aria-hidden="true"
					/>
					<span className="text-lg font-medium sm:text-xl">
						{dragActive ? "Drop to convert" : "Drop HEIC photos here"}
					</span>
					<span className="inline-flex items-center rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper transition-colors group-hover:bg-accent-deep">
						Browse files
					</span>
					<span id={`${inputId}-hint`} className="text-sm text-ink-soft">
						.heic and .heif &middot; several at once is fine &middot; converted
						on this device, never uploaded
					</span>
				</span>
			) : (
				<span className="flex items-center justify-center gap-3 text-sm">
					<ImagePlus
						className={`size-5 ${dragActive ? "text-accent" : "text-ink-soft"}`}
						strokeWidth={1.75}
						aria-hidden="true"
					/>
					<span className="font-medium">
						{dragActive ? "Drop to add" : "Add more photos"}
					</span>
					<span id={`${inputId}-hint`} className="text-ink-faint">
						.heic / .heif
					</span>
				</span>
			)}
		</label>
	);
}
