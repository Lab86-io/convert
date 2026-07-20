import { useCallback, useEffect, useRef, useState } from "react";
import { clampQuality, convertFile } from "./convert";
import {
	type ConversionPath,
	detectFormat,
	type FormatDefinition,
	formatsById,
	getConversionPath,
	getRecommendedTarget,
	outputFileName,
} from "./formats";

export type ItemStatus = "ready" | "queued" | "converting" | "done" | "error";

export interface QueueItem {
	id: string;
	file: File;
	source: FormatDefinition;
	target: FormatDefinition;
	path: ConversionPath;
	outputName: string;
	status: ItemStatus;
	progress: number;
	quality?: number;
	blob?: Blob;
	url?: string;
	error?: string;
}

function makeId(): string {
	if (typeof crypto !== "undefined" && "randomUUID" in crypto)
		return crypto.randomUUID();
	return `item-${Math.random().toString(36).slice(2)}`;
}

function release(item: QueueItem): void {
	if (item.url) URL.revokeObjectURL(item.url);
}

export function useConversionQueue() {
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
		setItems((previous) =>
			previous.map((item) =>
				item.id === next.id
					? { ...item, status: "converting", progress: 0.01 }
					: item,
			),
		);

		convertFile(next.file, next.source, next.target, next.path, {
			quality: usedQuality,
			onProgress: (progress) => {
				setItems((previous) =>
					previous.map((item) =>
						item.id === next.id && item.status === "converting"
							? { ...item, progress }
							: item,
					),
				);
			},
		})
			.then((blob) => {
				const url = URL.createObjectURL(blob);
				busyRef.current = false;
				setItems((previous) => {
					if (!previous.some((item) => item.id === next.id)) {
						URL.revokeObjectURL(url);
						return [...previous];
					}
					return previous.map((item) =>
						item.id === next.id
							? {
									...item,
									status: "done",
									progress: 1,
									blob,
									url,
									quality: usedQuality,
									error: undefined,
								}
							: item,
					);
				});
			})
			.catch((error: unknown) => {
				busyRef.current = false;
				const message =
					error instanceof Error && error.message
						? error.message
						: typeof error === "string" && error
							? error
							: "This conversion could not be completed.";
				setItems((previous) =>
					previous.map((item) =>
						item.id === next.id
							? { ...item, status: "error", progress: 0, error: message }
							: item,
					),
				);
			});
	}, [items]);

	const addFiles = useCallback((files: Iterable<File>) => {
		const accepted: QueueItem[] = [];
		const rejected: string[] = [];
		for (const file of files) {
			const source = detectFormat(file);
			if (!source) {
				rejected.push(file.name);
				continue;
			}
			const target = getRecommendedTarget(source.id);
			const path = getConversionPath(source.id, target.id);
			if (!path) {
				rejected.push(file.name);
				continue;
			}
			accepted.push({
				id: makeId(),
				file,
				source,
				target,
				path,
				outputName: outputFileName(file.name, source, target),
				status: "ready",
				progress: 0,
			});
		}
		setRejectedNames(rejected);
		if (accepted.length > 0) setItems((previous) => [...previous, ...accepted]);
	}, []);

	const changeTarget = useCallback((id: string, targetId: string) => {
		setItems((previous) =>
			previous.map((item) => {
				if (item.id !== id || item.status === "converting") return item;
				const target = formatsById.get(targetId);
				const path = target
					? getConversionPath(item.source.id, target.id)
					: null;
				if (!target || !path) return item;
				release(item);
				return {
					...item,
					target,
					path,
					outputName: outputFileName(item.file.name, item.source, target),
					status: "ready",
					progress: 0,
					blob: undefined,
					url: undefined,
					quality: undefined,
					error: undefined,
				};
			}),
		);
	}, []);

	const startAll = useCallback(() => {
		setItems((previous) =>
			previous.map((item) =>
				item.status === "ready" || item.status === "error"
					? { ...item, status: "queued", progress: 0, error: undefined }
					: item,
			),
		);
	}, []);

	const retryItem = useCallback((id: string) => {
		setItems((previous) =>
			previous.map((item) =>
				item.id === id && item.status === "error"
					? { ...item, status: "queued", progress: 0, error: undefined }
					: item,
			),
		);
	}, []);

	const removeItem = useCallback((id: string) => {
		setItems((previous) => {
			const item = previous.find((candidate) => candidate.id === id);
			if (item) release(item);
			return previous.filter((item) => item.id !== id);
		});
	}, []);

	const clearAll = useCallback(() => {
		setItems((previous) => {
			for (const item of previous) release(item);
			return [];
		});
		setRejectedNames([]);
	}, []);

	const reconvertAll = useCallback(() => {
		setItems((previous) =>
			previous.map((item) => {
				if (item.status !== "done" || item.path.fidelity !== "lossy")
					return item;
				release(item);
				return {
					...item,
					status: "queued",
					progress: 0,
					blob: undefined,
					url: undefined,
					quality: undefined,
				};
			}),
		);
	}, []);

	return {
		items,
		quality,
		setQuality,
		rejectedNames,
		dismissRejected: useCallback(() => setRejectedNames([]), []),
		addFiles,
		changeTarget,
		startAll,
		removeItem,
		clearAll,
		retryItem,
		reconvertAll,
	};
}
