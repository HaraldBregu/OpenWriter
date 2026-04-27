import React from 'react';
import type { NodeViewProps } from '@tiptap/react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardFooter } from '@/components/ui/Card';
import { Button as MovingBorderButton } from '@/components/ui/MovingBorder';
import { Textarea } from '@/components/ui/Textarea';
import { FileUpload, FileUploadDropzone, FileUploadTrigger } from '@/components/ui/FileUpload';
import { usePrompt } from './hooks';
import { Provider } from './Provider';
import { PromptHeader } from './PromptHeader';
import { Paperclip, LoaderCircle, SendHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useTranslation } from 'react-i18next';

const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/png,image/gif,image/webp,image/svg+xml,image/avif';

function PromptStatusBar(): React.JSX.Element | null {
	const { statusBarVisible, statusBarMessage } = usePrompt();
	if (!statusBarVisible) return null;
	return (
		<div className="mt-2 w-full">
			<div
				role='alert'
				className="flex items-center gap-2 rounded-t-md px-3 py-1.5 text-xs text-muted-foreground"
			>
				<LoaderCircle className="h-3.5 w-3.5 animate-spin" />
				<span>{statusBarMessage}</span>
			</div>
		</div>
	);
}

function PromptContainer(): React.JSX.Element {
	const { t } = useTranslation();
	const {
		state,
		loading,
		enable,
		isSubmitDisabled,
		textareaRef,
		submitRef,
		handlePromptChange,
		handleFilesChange,
		resizeTextarea,
	} = usePrompt();

	const inputLabel = t('assistantNode.textTitle', 'Generate text');
	const isDisabled = !enable || loading;

	return (
		<FileUpload
			accept={ACCEPTED_IMAGE_TYPES}
			multiple
			disabled={isDisabled}
			value={state.files}
			onValueChange={handleFilesChange}
		>
			<FileUploadDropzone
				// Prevents the dropzone from triggering on click
				onClick={(event) => event.preventDefault()}
				className="w-full gap-0 rounded-none border-0 p-0 hover:bg-transparent focus-visible:border-transparent"
			>
				<PromptStatusBar />
				<div className="relative mb-2 w-full">
					<div
						aria-hidden="true"
						className="pointer-events-none absolute inset-x-6 top-8 bottom-0 -z-10 rounded-full bg-[radial-gradient(circle_at_12%_50%,hsl(195_96%_61%/0.26),transparent_32%),radial-gradient(circle_at_50%_100%,hsl(30_95%_61%/0.28),transparent_38%),radial-gradient(circle_at_88%_45%,hsl(270_91%_68%/0.24),transparent_32%)] opacity-70 blur-2xl dark:bg-[radial-gradient(circle_at_12%_50%,hsl(195_96%_61%/0.22),transparent_32%),radial-gradient(circle_at_50%_100%,hsl(30_95%_61%/0.26),transparent_38%),radial-gradient(circle_at_88%_45%,hsl(270_91%_68%/0.26),transparent_32%)]"
					/>
					<MovingShadow borderRadius="1rem" shadowSize={2} shadowBlur={3} duration={6200}>
						<Card className="w-full shadow-none!">
							<PromptHeader />
							<CardContent>
								<Textarea
									ref={textareaRef}
									value={state.prompt}
									onChange={(e) => {
										handlePromptChange(e.target.value);
										resizeTextarea();
									}}
									disabled={!enable}
									aria-label={inputLabel}
									className={cn(
										'disabled:bg-transparent! disabled:focus:bg-transparent!',
										'p-0 rounded-none w-full resize-none border-none bg-transparent dark:bg-transparent focus:bg-transparent text-[15px] leading-7 text-foreground shadow-none focus-visible:ring-0 focus-visible:ring-offset-0',
										'placeholder:text-foreground/42 dark:placeholder:text-muted-foreground/78',
										'disabled:cursor-not-allowed disabled:opacity-60'
									)}
									placeholder={t('assistantNode.placeholder', 'What can i write for you?')}
									rows={1}
								/>
							</CardContent>
							<CardFooter className="bg-transparent border-none">
								<FileUploadTrigger
									render={
										<Button
											type="button"
											variant="outline"
											size="icon"
											title={t('assistantNode.addAttachment', 'Add attachment')}
											aria-label={t('assistantNode.addAttachment', 'Add attachment')}
										/>
									}
								>
									<Paperclip />
								</FileUploadTrigger>
								<Button
									variant="default"
									className="ml-auto shrink-0"
									disabled={isSubmitDisabled}
									onMouseDown={(e) => e.preventDefault()}
									onClick={() => {
										if (!loading) submitRef.current?.();
									}}
									aria-label={t('agenticPanel.submit', 'Submit')}
								>
									{loading ? <LoaderCircle className="animate-spin" /> : <SendHorizontal />}
									<span>{t('agenticPanel.submit', 'Submit')}</span>
								</Button>
							</CardFooter>
						</Card>
					</MovingShadow>
				</div>
			</FileUploadDropzone>
		</FileUpload>
	);
}

interface PromptProps {
	nodeViewProps: NodeViewProps;
}

export function Prompt({ nodeViewProps }: PromptProps): React.JSX.Element {
	return (
		<Provider nodeViewProps={nodeViewProps}>
			<PromptContainer />
		</Provider>
	);
}
