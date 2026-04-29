import type { ContextValue } from '../context/context';
import { useContext } from './use-context';

export function useInsertContentDialog(): Pick<
	ContextValue,
	'insertContentDialogOpen' | 'openInsertContentDialog' | 'closeInsertContentDialog'
> {
	const { insertContentDialogOpen, openInsertContentDialog, closeInsertContentDialog } =
		useContext();
	return { insertContentDialogOpen, openInsertContentDialog, closeInsertContentDialog };
}
