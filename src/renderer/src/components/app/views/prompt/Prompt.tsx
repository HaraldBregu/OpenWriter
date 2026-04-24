import React from 'react';
import type { NodeViewProps } from '@tiptap/react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardFooter } from '@/components/ui/Card';
import { Textarea } from '@/components/ui/Textarea';
import { FileUpload, FileUploadDropzone, FileUploadTrigger } from '@/components/ui/FileUpload';
import { usePrompt } from './hooks';
import { Provider } from './Provider';
import { PromptHeader } from './PromptHeader';
import { Paperclip, LoaderCircle, SendHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useTranslation } from 'react-i18next';

const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/png,image/gif,image/webp,image/svg+xml,image/avif';

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
				<div
					role="status"
					className="rounded-t-md border-t border-x border-border/60 bg-muted/40 px-3 py-1.5 mx-10 text-xs text-muted-foreground"
				>
					{t('assistantNode.status', 'Ready')}
				</div>
				<Card className="w-full mb-2 rounded-t-none border-t-0">
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
