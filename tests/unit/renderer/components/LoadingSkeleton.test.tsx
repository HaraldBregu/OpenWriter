/**
 * Tests for LoadingSkeleton component.
 *
 * A simple loading indicator used as Suspense fallback throughout the app.
 */

import { render, screen } from '@testing-library/react';
import { AppLoadingSkeleton } from '../../../../src/renderer/src/components/AppLoadingSkeleton';

describe('LoadingSkeleton', () => {
	it('should render the loading text', () => {
		// Act
		render(<AppLoadingSkeleton />);

		// Assert
		expect(screen.getByText(/loading/i)).toBeInTheDocument();
	});

	it('should render the spinner element', () => {
		// Act
		const { container } = render(<AppLoadingSkeleton />);

		// Assert - look for the animated spinner div
		const spinner = container.querySelector('.animate-spin');
		expect(spinner).toBeInTheDocument();
	});
});
