import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { SectionHeader, SettingRow } from '../components';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSeparator,
	FieldSet,
} from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import { Separator } from '@/components/ui/Separator';

const GeneralPage: React.FC = () => {
	const { t } = useTranslation();

	const [trayEnabled, setTrayEnabled] = useState(true);

	useEffect(() => {
		window.app.getTrayEnabled().then(setTrayEnabled);
	}, []);

	const handleTrayToggle = useCallback((checked: boolean) => {
		setTrayEnabled(checked);
		window.app.setTrayEnabled(checked);
	}, []);

	const handleOpenAccessibility = useCallback(() => {
		window.app.openSystemAccessibility();
	}, []);

	const handleOpenScreenRecording = useCallback(() => {
		window.app.openSystemScreenRecording();
	}, []);

	const handleOpenAppDataFolder = useCallback(() => {
		window.app.openAppDataFolder();
	}, []);

	return (
		<div className="w-full max-w-2xl">
			<h1 className="text-lg font-normal mb-6">{t('settings.title')}</h1>

			<SectionHeader title={t('settings.sections.application')} />

			<FieldGroup>
				<FieldSet>
					<FieldLegend>Payment Method</FieldLegend>
					<FieldDescription>All transactions are secure and encrypted</FieldDescription>
					<FieldGroup>
						<Field>
							<FieldLabel htmlFor="checkout-7j9-card-name-43j">Name on Card</FieldLabel>
							<Input id="checkout-7j9-card-name-43j" placeholder="Evil Rabbit" required />
						</Field>
						<Field>
							<FieldLabel htmlFor="checkout-7j9-card-number-uw1">Card Number</FieldLabel>
							<Input id="checkout-7j9-card-number-uw1" placeholder="1234 5678 9012 3456" required />
							<FieldDescription>Enter your 16-digit card number</FieldDescription>
						</Field>
					</FieldGroup>
				</FieldSet>
				<FieldSeparator />
				<FieldSet>
					<FieldLegend>Billing Address</FieldLegend>
					<FieldDescription>
						The billing address associated with your payment method
					</FieldDescription>
					<FieldGroup>
						<Field orientation="horizontal">
							<Checkbox id="checkout-7j9-same-as-shipping-wgm" defaultChecked />
							<FieldLabel htmlFor="checkout-7j9-same-as-shipping-wgm" className="font-normal">
								Same as shipping address
							</FieldLabel>
						</Field>
					</FieldGroup>
				</FieldSet>
				<FieldSet>
					<FieldGroup>
						<Field>
							<FieldLabel htmlFor="checkout-7j9-optional-comments">Comments</FieldLabel>
							<Textarea
								id="checkout-7j9-optional-comments"
								placeholder="Add any additional comments"
								className="resize-none"
							/>
						</Field>
					</FieldGroup>
				</FieldSet>
				<Field orientation="horizontal">
					<Button type="submit">Submit</Button>
					<Button variant="outline" type="button">
						Cancel
					</Button>
				</Field>
			</FieldGroup>

			<Separator className="my-6" />

			<SettingRow label={t('settings.application.name')}>
				<span className="text-sm">{__APP_NAME__}</span>
			</SettingRow>

			<SettingRow label={t('settings.application.description')}>
				<span className="text-sm text-muted-foreground">{__APP_DESCRIPTION__}</span>
			</SettingRow>

			<SettingRow label={t('settings.application.version')}>
				<span className="font-mono text-sm">{__APP_VERSION__}</span>
			</SettingRow>

			<SettingRow label={t('settings.application.author')}>
				<span className="text-sm">{__APP_AUTHOR__}</span>
			</SettingRow>

			<SettingRow label={t('settings.application.license')}>
				<span className="text-sm">{__APP_LICENSE__}</span>
			</SettingRow>

			<SettingRow
				label={t('settings.application.accessibility')}
				description={t('settings.application.accessibilityDescription')}
			>
				<Button variant="outline" size="sm" onClick={handleOpenAccessibility}>
					{t('settings.application.openAccessibility')}
				</Button>
			</SettingRow>

			<SettingRow
				label={t('settings.application.screenRecording')}
				description={t('settings.application.screenRecordingDescription')}
			>
				<Button variant="outline" size="sm" onClick={handleOpenScreenRecording}>
					{t('settings.application.openScreenRecording')}
				</Button>
			</SettingRow>

			<SettingRow
				label={t('settings.application.menuBar')}
				description={t('settings.application.menuBarDescription')}
			>
				<Switch checked={trayEnabled} onCheckedChange={handleTrayToggle} />
			</SettingRow>

			<SettingRow
				label={t('settings.application.appData')}
				description={t('settings.application.appDataDescription')}
			>
				<Button variant="outline" size="sm" onClick={handleOpenAppDataFolder}>
					{t('settings.application.openAppData')}
				</Button>
			</SettingRow>
		</div>
	);
};

export default GeneralPage;
