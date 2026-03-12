---
name: TipTap extension patterns
description: Confirmed patterns for TipTap extension authoring in this codebase — options vs storage, Storage type augmentation, NodeView callback access
type: project
---

## addOptions vs addStorage: when to use which

**Rule**: External callbacks (things callers pass in) always go in `addOptions`, not `addStorage`.

- `addOptions` is for **configuration** — values set once at `.configure()` time, owned by the caller.
- `addStorage` is for **mutable runtime state** — values the extension manages internally as the document evolves (e.g., current search query, cached parser instance).

**Why:** `addStorage` default values are set once at extension creation time (module scope for `BASE_EXTENSIONS`). There is no typed API to replace a storage callback after editor creation. Using storage for callbacks forces imperative post-creation mutation with no type safety.

**How to apply:** Any time a new extension needs a caller-supplied callback, use `addOptions` with a typed options interface. See `AgentPromptExtension` and `ImageExtension` as confirmed examples.

## Typed options generic

```ts
export interface MyExtensionOptions {
  onCallback: (value: string) => void;
}
export const MyExtension = Node.create<MyExtensionOptions>({
  addOptions() {
    return { onCallback: (_value) => {} };
  },
});
```

This enables TypeScript to enforce the options shape at `.configure()` call sites.

## Accessing options from a NodeView

`NodeViewProps.extension` is typed as `Node<any, any>` (the TipTap Node class). Access options with a narrow cast:

```ts
const options = extension.options as MyExtensionOptions;
options.onCallback(value);
```

Import the options interface from the extension file to keep the cast tight.

## The Storage module augmentation (for editor.storage access)

`editor.storage` is typed as the `Storage` interface in `@tiptap/core`, which is an empty augmentable interface — the same pattern as `Commands<ReturnType>`. To add a key to it:

```ts
declare module '@tiptap/core' {
  interface Storage {
    myExtension: { myValue: string };
  }
}
```

This is appropriate only for storage values the extension itself manages. Avoid this pattern for callback options.

## The workaround for unaugmented storage (existing TextEditor.tsx pattern)

When accessing third-party extension storage without type augmentation (e.g., `tiptap-markdown`'s `storage.markdown.parser`), cast the whole storage object:

```ts
const storage = editor.storage as unknown as Record<string, Record<string, unknown>>;
const parser = storage.markdown?.parser as { parse: ... } | undefined;
```

This is a last-resort pattern — prefer augmentation or addOptions for first-party extensions.
