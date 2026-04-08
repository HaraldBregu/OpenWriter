# FAQ Section

---

## General

### What is OpenWriter?

OpenWriter is a free, open-source desktop writing application with built-in AI assistance. It combines a rich text editor, workspace management, document indexing, and a multi-agent AI writing assistant in a single cross-platform app.

### Is OpenWriter free?

Yes. OpenWriter is completely free and open source under the MIT license. There are no subscriptions, premium tiers, or hidden costs for the application itself.

### What platforms does OpenWriter support?

OpenWriter runs on macOS (Intel and Apple Silicon), Windows, and Linux. Download the installer for your platform from the GitHub releases page.

### Do I need an internet connection?

You need an internet connection for AI features (the assistant calls OpenAI's API). The editor, workspace management, and file operations work fully offline.

---

## AI Assistant

### Which AI models does OpenWriter use?

OpenWriter integrates with OpenAI models (GPT-4o, GPT-4o-mini) through the OpenAI API. The model can be configured per agent role in the settings.

### Do I need my own API key?

Yes. You'll need an OpenAI API key to use the AI features. Enter it in the app settings. Your key is stored locally on your machine and is never sent anywhere except directly to the OpenAI API.

### How does the AI assistant work?

The assistant uses a multi-agent pipeline: it detects your intent, creates a plan, retrieves relevant context from your workspace documents, optionally searches the web, generates a draft, reviews it for quality, and enhances the final output. All of this happens in the background with real-time streaming.

### Does the AI read my documents?

Only if you import them into the resource library. When you add PDFs, Word documents, or text files to a workspace, OpenWriter indexes them locally with semantic embeddings. The AI assistant can then retrieve relevant passages to ground its responses. Your documents are never uploaded to any cloud service — indexing and storage happen entirely on your machine.

### Can I use other AI providers?

The app is designed with a provider abstraction layer. OpenAI is the primary supported provider. Support for additional providers can be added through the extensible provider system.

---

## Privacy and Security

### Where is my data stored?

Everything is stored locally on your computer. Workspace files stay in the folders you choose. Settings, metadata, and vector indexes are stored in the app's local data directory. Nothing is uploaded to external servers except API calls to your configured AI provider.

### Is my writing sent to any server?

Only the text you explicitly send to the AI assistant is transmitted to the AI provider's API (e.g., OpenAI). The editor content, workspace files, and application state remain local.

### Can I audit the code?

Yes. OpenWriter is fully open source. Every line of code is available on GitHub for inspection, auditing, and contribution.

---

## Technical

### What is the tech stack?

Electron + React + TypeScript for the desktop app, Tiptap/ProseMirror for the editor, Redux Toolkit for state management, LangChain/LangGraph for AI orchestration, and TailwindCSS for styling. See the [Tech Stack](./TECH_STACK.md) page for the full breakdown.

### Can I contribute?

Absolutely. OpenWriter is MIT licensed and welcomes contributions. Check the GitHub repository for issues, development setup, and contribution guidelines.

### How do I report a bug?

Open an issue on the [GitHub repository](https://github.com/HaraldBregu/openwriter/issues) with steps to reproduce the problem, your OS, and the app version.

### Can I build custom AI agents?

Yes. The agent system is extensible. You can define new agent definitions with custom LangGraph topologies, state schemas, and execution protocols. See the project documentation for the agent registration guide.
