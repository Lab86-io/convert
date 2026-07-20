import { useCallback, useEffect, useRef, useState } from "react";
import { clampQuality, convertFile } from "./convert";
import type { Converter } from "./formats";
import { outputFileName, splitAcceptedFiles } from "./formats";

export type ItemStatus = "queued" | "converting" | "done" | "error";

export interface QueueItem {
	id: string;
	file: File;
	outputName: string;
	status: ItemStatus;
	/** Quality the finished conversion used. */
	quality?: number;
	blob?: Blob;
	/** Object URL for previewing and downloading the converted file. */
	url?: string;
	error?: string;
}

function makeId(): string {
	if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
		return crypto.randomUUID();
	}
	return `item-${Math.random().toString(36).slice(2)}`;
}

/**
 * Owns the conversion workspace state: the file queue, the quality setting,
 * and rejected-file notices. Files convert one at a time to keep memory in
 * check with large photo batches.
 */
export function useConversionQueue(converter: Converter) {
	const [items, setItems] = useState<QueueItem[]>([]);
	const [rejectedNames, setRejectedNames] = useState<string[]>([]);
	const [quality, setQuality] = useState(90);

	const qualityRef = useRef(quality);
	qualityRef.current = quality;
	const busyRef = useRef(false);

	useEffect(() => {
		if (busyRef.current) return;
		const next = items.find((item) => item.status === "queued");
		if (!next) return;

		busyRef.current = true;
		const usedQuality = clampQuality(qualityRef.current);
		setItems((prev) =>
			prev.map((item) =>
				item.id === next.id ? { ...item, status: "converting" as const } : item,
			),
		);

		convertFile(next.file, converter, usedQuality)
			.then((blob) => {
				const url = URL.createObjectURL(blob);
				busyRef.current = false;
				setItems((prev) => {
					if (!prev.some((item) => item.id === next.id)) {
						// Removed while converting — drop the result. Return a new array so
						// the effect runs again after busyRef is released; otherwise a file
						// added while this conversion was finishing could remain queued.
						URL.revokeObjectURL(url);
						return [...prev];
					}
					return prev.map((item) =>
						item.id === next.id
							? {
									...item,
									status: "done" as const,
									blob,
									url,
									quality: usedQuality,
									error: undefined,
								}
							: item,
					);
				});
			})
			.catch((err: unknown) => {
				busyRef.current = false;
				const message =
					err instanceof Error && err.message
						? err.message
						: "This file could not be decoded.";
				setItems((prev) =>
					prev.map((item) =>
						item.id === next.id
							? { ...item, status: "error" as const, error: message }
							: item,
					),
				);
			});
	}, [items, converter]);

	const addFiles = useCallback(
		(files: Iterable<File>) => {
			const { accepted, rejected } = splitAcceptedFiles(
				files,
				converter.source,
			);
			if (rejected.length > 0) {
				setRejectedNames(rejected.map((file) => file.name));
			}
			if (accepted.length === 0) return;
			setRejectedNames((prev) => (rejected.length > 0 ? prev : []));
			setItems((prev) => [
				...prev,
				...accepted.map(
					(file): QueueItem => ({
						id: makeId(),
						file,
						outputName: outputFileName(
							file.name,
							converter.source,
							converter.target,
						),
						status: "queued",
					}),
				),
			]);
		},
		[converter],
	);

	const removeItem = useCallback((id: string) => {
		setItems((prev) => {
			const target = prev.find((item) => item.id === id);
			if (target?.url) URL.revokeObjectURL(target.url);
			return prev.filter((item) => item.id !== id);
		});
	}, []);

	const clearAll = useCallback(() => {
		setItems((prev) => {
			for (const item of prev) {
				if (item.url) URL.revokeObjectURL(item.url);
			}
			return [];
		});
		setRejectedNames([]);
	}, []);

	const retryItem = useCallback((id: string) => {
		setItems((prev) =>
			prev.map((item) =>
				item.id === id && item.status === "error"
					? { ...item, status: "queued" as const, error: undefined }
					: item,
			),
		);
	}, []);

	/** Re-runs finished conversions, e.g. after the quality slider moved. */
	const reconvertAll = useCallback(() => {
		setItems((prev) =>
			prev.map((item) => {
				if (item.status !== "done") return item;
				if (item.url) URL.revokeObjectURL(item.url);
				return {
					...item,
					status: "queued" as const,
					blob: undefined,
					url: undefined,
					quality: undefined,
				};
			}),
		);
	}, []);

	const dismissRejected = useCallback(() => setRejectedNames([]), []);

	return {
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
	};
}
