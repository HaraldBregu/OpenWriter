import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { ChannelType } from '../../../../shared/types';
import { FieldGroup } from '@/components/ui/Field';
import {
	PageBody,
	PageContainer,
	PageHeader,
	PageHeaderDescription,
	PageHeaderTitle,
} from '@/components/app/base/page';
import { ChannelForm } from './components';
import Layout from './Layout';

const VISIBLE_TYPES: readonly ChannelType[] = ['telegram', 'whatsapp', 'discord'] as const;

function PageContent(): ReactElement {
	const { t } = useTranslation();

	return (
		<PageContainer>
			<PageHeader className="px-0 border-none">
				<PageHeaderTitle>{t('settings.channels.title', 'Channels')}</PageHeaderTitle>
				<PageHeaderDescription>
					{t(
						'settings.channels.subtitle',
						'Configure messaging channels (Telegram, WhatsApp, Discord).'
					)}
				</PageHeaderDescription>
			</PageHeader>
			<PageBody className="px-0">
				<FieldGroup className="max-w-2xl">
					{VISIBLE_TYPES.map((channelType) => (
						<ChannelForm key={channelType} channelType={channelType} />
					))}
				</FieldGroup>
			</PageBody>
		</PageContainer>
	);
}

export default function Page(): ReactElement {
	return (
		<Layout>
			<PageContent />
		</Layout>
	);
}
