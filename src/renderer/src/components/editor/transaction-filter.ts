import { Extension } from "@tiptap/core";

export interface TransactionFilterStorage {
  silent: boolean;
}

declare module "@tiptap/core" {
  interface Storage {
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
