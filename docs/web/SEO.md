# SEO and Metadata

Page-level metadata, Open Graph tags, and structured data for the OpenWriter landing page.

---

## Page Title

```
OpenWriter — Free AI-Powered Desktop Writing App
```

## Meta Description

```
OpenWriter is a free, open-source desktop writing app with built-in AI assistance, workspace management, and a distraction-free editor. Available for macOS, Windows, and Linux.
```

---

## Open Graph Tags

```html
<meta property="og:type" content="website" />
<meta property="og:title" content="OpenWriter — Free AI-Powered Desktop Writing App" />
<meta
	property="og:description"
	content="A free, open-source desktop writing app with built-in AI assistance, workspace management, and a distraction-free rich text editor."
/>
<meta property="og:image" content="https://openwriter.app/og-image.png" />
<meta property="og:url" content="https://openwriter.app" />
<meta property="og:site_name" content="OpenWriter" />
```

**OG Image specifications:**

- Dimensions: 1200x630px
- Content: App screenshot with logo overlay and tagline
- Format: PNG
- File size: under 300KB

---

## Twitter Card Tags

```html
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="OpenWriter — Free AI-Powered Desktop Writing App" />
<meta
	name="twitter:description"
	content="Free, open-source desktop writing app with AI assistance. macOS, Windows, Linux."
/>
<meta name="twitter:image" content="https://openwriter.app/og-image.png" />
```

---

## Structured Data (JSON-LD)

```json
{
	"@context": "https://schema.org",
	"@type": "SoftwareApplication",
	"name": "OpenWriter",
	"description": "A free, open-source desktop writing application with built-in AI assistance, workspace management, and a distraction-free rich text editor.",
	"applicationCategory": "Productivity",
	"operatingSystem": "macOS, Windows, Linux",
	"offers": {
		"@type": "Offer",
		"price": "0",
		"priceCurrency": "USD"
	},
	"author": {
		"@type": "Person",
		"name": "Harald Bregu"
	},
	"license": "https://opensource.org/licenses/MIT",
	"url": "https://openwriter.app",
	"downloadUrl": "https://github.com/HaraldBregu/openwriter/releases",
	"softwareVersion": "1.0.0",
	"screenshot": "https://openwriter.app/screenshot.png"
}
```

---

## Keywords

Primary: `AI writing app`, `open source writing tool`, `desktop writing app`, `AI text editor`

Secondary: `free writing software`, `AI writing assistant desktop`, `electron writing app`, `markdown editor AI`, `ProseMirror editor`, `LangChain desktop app`, `workspace writing tool`, `RAG writing assistant`

Long-tail: `free open source AI writing app for mac`, `desktop writing app with AI assistant`, `offline writing tool with AI`, `open source alternative to notion AI`

---

## Canonical URL

```html
<link rel="canonical" href="https://openwriter.app/" />
```

---

## Robots

```html
<meta name="robots" content="index, follow" />
```

---

## Favicon

Provide in multiple sizes:

- `favicon.ico` (16x16, 32x32)
- `apple-touch-icon.png` (180x180)
- `icon-192.png` (192x192, for PWA manifest)
- `icon-512.png` (512x512, for PWA manifest)

---

## Performance Targets

- Lighthouse Performance score: 90+
- First Contentful Paint: under 1.5s
- Largest Contentful Paint: under 2.5s
- Cumulative Layout Shift: under 0.1
- Total page weight: under 500KB (excluding hero image)
