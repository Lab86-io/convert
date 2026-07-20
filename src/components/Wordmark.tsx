/** Compact lab86 signature: conversion-arrow mark plus product label. */
export function Wordmark() {
	return (
		<span className="flex items-center gap-2.5">
			<ConvertMark className="size-7 shrink-0" />
			<span className="flex items-baseline gap-1.5 font-mono text-xs uppercase tracking-[0.08em]">
				<span className="font-semibold">lab86</span>
				<span className="text-ink-faint">/</span>
				<span className="text-ink-soft">convert</span>
			</span>
		</span>
	);
}

/** The product mark — also mirrored in public/icon.svg. */
export function ConvertMark({ className }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 32 32"
			className={className}
			aria-hidden="true"
			focusable="false"
		>
			<rect width="32" height="32" fill="var(--color-ink)" />
			<path
				d="M6.5 16h15m0 0-5-5M21.5 16l-5 5"
				stroke="#fff"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				fill="none"
			/>
		</svg>
	);
}
