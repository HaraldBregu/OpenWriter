# Tech Stack Section

Developer-facing content for the "Built With" or "Under the Hood" section of the landing page.

---

## Section Headline

**Built on modern, battle-tested technology**

## Section Description

OpenWriter combines the best open-source tools into a cohesive desktop writing experience. Every layer is designed for performance, extensibility, and developer happiness.

---

## Stack Categories

### Desktop Framework

| Technology       | Version | Purpose                        |
| ---------------- | ------- | ------------------------------ |
| Electron         | 40      | Cross-platform desktop runtime |
| electron-vite    | 5       | Fast HMR development builds    |
| electron-builder | 26      | App packaging and distribution |

### Frontend

| Technology    | Version | Purpose                           |
| ------------- | ------- | --------------------------------- |
| React         | 19      | Component UI framework            |
| TypeScript    | 5.8     | Type-safe development             |
| Redux Toolkit | latest  | Centralized state management      |
| TailwindCSS   | 3.3     | Utility-first styling             |
| Radix UI      | latest  | Accessible component primitives   |
| Framer Motion | latest  | Smooth animations and transitions |

### Editor

| Technology  | Version | Purpose                    |
| ----------- | ------- | -------------------------- |
| Tiptap      | 3.20    | Rich text editor framework |
| ProseMirror | latest  | Editor core engine         |

### AI and Language Models

| Technology   | Version | Purpose                     |
| ------------ | ------- | --------------------------- |
| LangChain    | 1.2     | LLM orchestration framework |
| LangGraph    | 1.2     | Multi-agent graph execution |
| OpenAI API   | latest  | Language model provider     |
| hnswlib-node | latest  | Vector similarity search    |

### File Processing

| Technology  | Purpose               |
| ----------- | --------------------- |
| pdf-parse   | PDF text extraction   |
| mammoth     | DOCX document parsing |
| chokidar    | File system watching  |
| gray-matter | Frontmatter parsing   |

### Testing

| Technology | Purpose                    |
| ---------- | -------------------------- |
| Jest 30    | Unit and integration tests |
| Playwright | End-to-end testing         |
| ESLint     | Code quality linting       |
| Prettier   | Consistent code formatting |

---

## Architecture Highlights

For the technically curious, these are the key architectural decisions:

- **Four runtime layers** — Renderer, Preload, Shared, and Main process with strict boundaries
- **Per-window workspace isolation** — Each window gets its own workspace services and state
- **Decoupled task system** — AI agents and task execution are fully separated subsystems bridged by a single handler
- **Multi-agent AI pipeline** — 7 specialist nodes (intent detection, planning, RAG, web search, text generation, analysis, enhancement)
- **Priority-based task queue** — Background processing with concurrency limits, cancellation, and real-time streaming
- **Event-driven state sync** — Main process broadcasts keep all windows synchronized via EventBus

---

## Open Source

**License:** MIT

**Repository:** [github.com/HaraldBregu/openwriter](https://github.com/HaraldBregu/openwriter)

Contributions welcome. See the repository for development setup instructions.
