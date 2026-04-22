import { CardContent } from '@/components/ui/Card';
import { ActionsSection } from './components/ActionsSection';
import { DocumentMetaSection } from './components/DocumentMetaSection';

export function PanelBody(): React.ReactElement {
	return (
		<CardContent className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pt-2 pb-6 space-y-2">
			<DocumentMetaSection />
			<ActionsSection />
		</CardContent>
	);
}
