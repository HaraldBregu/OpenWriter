/**
 * Narrow an unknown caught value to a {@link NodeJS.ErrnoException} so that
 * the `.code` property is safely accessible without a cast at every call site.
 */
export function asErrno(err: unknown): NodeJS.ErrnoException {
	return err as NodeJS.ErrnoException;
}
