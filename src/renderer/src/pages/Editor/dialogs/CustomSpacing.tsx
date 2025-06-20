import React, { useEffect } from 'react';
import Modal from '@/components/ui/modal';
import Button from '@/components/ui/button';
import { useTranslation } from "react-i18next"
import { Input } from '@/components/ui/input';
import { useSelector } from 'react-redux';
import { selectToolbarEmphasisState } from '@/pages/editor/store/editor/editor.selector';
import { Label } from '@/components/ui/label';

interface CustomSpacingModalProps {
    isOpen: boolean;
    onCancel: () => void;
    onApply: (spacing: Spacing) => void;
}

const CustomSpacingModal: React.FC<CustomSpacingModalProps> = ({ isOpen, onCancel, onApply }) => {
    const { t } = useTranslation();
    const textEditorState = useSelector(selectToolbarEmphasisState);

    const [lineSpacing, setLineSpacing] = React.useState<number>(1);
    const [marginTop, setMarginTop] = React.useState<number>(0);
    const [marginBottom, setMarginBottom] = React.useState<number>(0);

    const changeLineSpacingValue = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseFloat(e.target.value);
        if (!isNaN(value)) {
            setLineSpacing(value);
        }
    };

    const changeMarginTopValue = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseFloat(e.target.value);
        if (!isNaN(value)) {
            setMarginTop(value);
        }
    };

    const changeMarginBottomValue = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseFloat(e.target.value);
        if (!isNaN(value)) {
            setMarginBottom(value);
        }
    };

    useEffect(() => {
        if (textEditorState.spacing) {
            setLineSpacing(textEditorState.spacing.line);
            setMarginTop(textEditorState.spacing.before || 0);
            setMarginBottom(textEditorState.spacing.after || 0);
        }
    }, [textEditorState.spacing]);

    return (
        <Modal
            key={"custom-spacing-modal"}
            isOpen={isOpen}
            onOpenChange={onCancel}
            title={t('customSpacing.title')}
            className="w-[360px] gap-0"
            contentClassName="flex flex-col gap-8"
            footerClassName='h-[auto] pt-4 pb-4 border-none'
            showCloseIcon={true}
            titleClassName='text-left'
            actions={[
                <Button key="cancel" className="border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 w-24" size="mini" intent={"secondary"} variant={"tonal"} onClick={onCancel}>{t('buttons.cancel')}</Button>,
                <Button key="save" className="border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 w-24" size="mini" intent={"primary"} onClick={() => onApply({
                    before: marginTop,
                    after: marginBottom,
                    line: lineSpacing
                })}>
                    {t('buttons.apply')}
                </Button>
            ]}
        >
            <div className="grid grid-cols-2 gap-6 w-full">
                <div className="flex flex-col">
                    <div className="flex flex-col">
                        <Label className="px-2 text-secondary-30 text-[13px] font-semibold">{t('customSpacing.lineSpacing')}</Label>
                    </div>
                    <Input className="text-right border-secondary-85 focus:border-secondary-85 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0" type='number' min={1} step={0.1} onChange={changeLineSpacingValue} value={lineSpacing} />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-6 w-full">
                <div className="flex flex-col">
                    <div className="flex flex-col">
                        <Label className="px-2 text-secondary-30 text-[13px] font-semibold">{t('customSpacing.beforeParagraphSpacing')}</Label>
                    </div>
                    <Input className="text-right border-secondary-85 focus:border-secondary-85 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0" type='number' min={0} step={0.1} onChange={changeMarginTopValue} value={marginTop} />
                </div>
                <div className="flex flex-col">
                    <div className="flex flex-col">
                        <Label className="px-2 text-secondary-30 text-[13px] font-semibold">{t('customSpacing.afterParagraphSpacing')}</Label>
                    </div>
                    <Input className="text-right border-secondary-85 focus:border-secondary-85 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0" type='number' min={0} step={0.1} onChange={changeMarginBottomValue} value={marginBottom} />
                </div>
            </div>
        </Modal>
    );
};

export default CustomSpacingModal;