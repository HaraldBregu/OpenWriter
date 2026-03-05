import { Extension } from "@tiptap/core";

/**
 * TransactionFilter — Tiptap extension that allows suppressing the `onUpdate`
 * callback for programmatic content changes.
 *
 * Usage:
 *   // Suppress onChange while inserting content:
 *   editor.storage.transactionFilter.silent = true;
 *   editor.commands.setContent(text);
 *   editor.storage.transactionFilter.silent = false;
 *
 * The `onUpdate` handler in TextEditor checks `editor.storage.transactionFilter.silent`
 * and skips emitting when it is `true`.
 */
export const TransactionFilter = Extension.create({
  name: "transactionFilter",

  addStorage() {
    return {
      silent: false,
    };
  },
});
