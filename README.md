<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="resources/svgs/app_logo_dark.svg" />
    <img src="resources/svgs/app_logo.svg" alt="OpenWriter" width="128" height="128" />
  </picture>
</p>

<h1 align="center">OpenWriter</h1>

<p align="center">
  A modern, AI-powered desktop writing application built for creators, writers, and professionals.
</p>

## About

OpenWriter is a cross-platform desktop application that combines a distraction-free writing environment with intelligent AI assistance. Built on Electron with a React-based interface, it provides a rich text editor powered by Tiptap, workspace management, document organization, and an integrated AI writing assistant that helps you draft, continue, and enhance your content.

## Features

- **Rich Text Editor** — A full-featured editor with support for headings, lists, code blocks, images, highlights, and more.
- **AI Writing Assistant** — Powered by LangChain and LangGraph, the built-in agent can continue your writing, enhance selected text, and respond to inline prompts.
- **Workspace Management** — Organize your work into workspaces with automatic file watching and document tracking.
- **Resource Library** — Import and index PDFs, DOCX, and plain text files as reference material for your writing.
- **Cross-Platform** — Available on macOS, Windows, and Linux.
- **Multi-Language** — Supports English and Italian out of the box, with an extensible i18n system.
- **Theming** — Light and dark mode with system-preference detection.

## Tech Stack

- **Framework:** Electron + electron-vite
- **Frontend:** React, TypeScript, Tailwind CSS
- **Editor:** Tiptap (ProseMirror)
- **State Management:** Redux Toolkit
- **AI:** LangChain / LangGraph with OpenAI models
- **UI Components:** Radix UI primitives with a custom design system

## Getting Started

```bash
# Install dependencies
yarn install

# Run in development mode
yarn dev

# Build for production
yarn build

# Package for distribution
yarn dist:mac   # macOS
yarn dist:win   # Windows
yarn dist:linux # Linux
```

## License

MIT
