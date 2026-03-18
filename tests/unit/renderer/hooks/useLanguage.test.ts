/**
 * Tests for useLanguage hook.
 * The hook is now a no-op — language sync is handled by LanguageProvider in AppContext.
 */
import { renderHook } from '@testing-library/react';
import { useLanguage } from '../../../../src/renderer/src/hooks/use-language';

describe('useLanguage', () => {
	it('should not throw when called', () => {
		expect(() => renderHook(() => useLanguage())).not.toThrow();
	});

	it('should return undefined (no-op hook)', () => {
		const { result } = renderHook(() => useLanguage());
		expect(result.current).toBeUndefined();
	});
});
