import type { ContextValue } from '../context/context';
import { useDocumentContext } from './use-document-context';

export function useInsertContentDialog(): Pick<
	ContextValue,
	'insertContentDialogOpen' | 'openInsertContentDialog' | 'closeInsertContentDialog'
> {
	const { insertContentDialogOpen, openInsertContentDialog, closeInsertContentDialog } =
		useDocumentContext();
	return { insertContentDialogOpen, openInsertContentDialog, closeInsertContentDialog };
}
