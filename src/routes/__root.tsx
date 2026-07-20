import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import appCss from "../styles.css?url";

const title = "HEIC to JPEG — free, private, in your browser · lab86 convert";
const description =
	"Convert HEIC and HEIF photos to JPEG directly in your browser. Files never leave your device — no uploads, no server, no sign-up.";

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ title },
			{ name: "description", content: description },
			{ name: "theme-color", content: "#faf6ef" },
			{ property: "og:title", content: title },
			{ property: "og:description", content: description },
			{ property: "og:type", content: "website" },
			{ property: "og:url", content: "https://heic.lab86.io/" },
		],
		links: [
			{ rel: "stylesheet", href: appCss },
			{ rel: "icon", href: "/icon.svg", type: "image/svg+xml" },
			{ rel: "manifest", href: "/manifest.json" },
			{ rel: "canonical", href: "https://heic.lab86.io/" },
		],
	}),
	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body>
				{children}
				<Scripts />
			</body>
		</html>
	);
}
