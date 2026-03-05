import { Extension } from "@tiptap/core";

export interface TransactionFilterStorage {
  silent: boolean;
}

declare module "@tiptap/core" {
  interface ExtensionStorage {
    transactionFilter: TransactionFilterStorage;
  }
}

export const TransactionFilter = Extension.create<object, TransactionFilterStorage>({
  name: "transactionFilter",

  addStorage() {
    return {
      silent: false,
    };
  },
});
