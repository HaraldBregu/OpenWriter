import React from 'react';
import Modal from '@/components/ui/modal';
import Button from '@/components/ui/button';
import { useTranslation } from "react-i18next"
import TextField from '@/components/ui/textField';

interface ResumeNumberingModalProps {
    isOpen: boolean;
    onCancel: () => void;
    onApply: (numberBullet: number) => void;
}

const ResumeNumberingModal: React.FC<ResumeNumberingModalProps> = ({ isOpen, onCancel, onApply }) => {
    const { t } = useTranslation();

    const [numberBullet, setNumberBullet] = React.useState<number>(1);

    const changeNumberBulletValue = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseFloat(e.target.value);
        if (!isNaN(value)) {
            setNumberBullet(value);
        }
    };

    return (
        <Modal
            key={"resume-numbering-modal"}
            isOpen={isOpen}
            onOpenChange={onCancel}
            title={t('resumeNumbering.title')}
            className="w-[240px] gap-0"
            contentClassName="flex flex-col gap-8"
            footerClassName='h-[auto] pt-4 pb-4 border-none'
            showCloseIcon={true}
            titleClassName='text-left'
            actions={[
                <Button key="cancel" className="border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 w-24" size="mini" intent={"secondary"} variant={"tonal"} onClick={onCancel}>{t('buttons.cancel')}</Button>,
                <Button key="save" className="border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 w-24" size="mini" intent={"primary"} onClick={() => onApply(numberBullet)}>
                    {t('buttons.apply')}
                </Button>
            ]}
        >
            <div className="grid grid-cols-1 gap-6 w-full">
                <div className="flex flex-col">
                    <TextField
                        id="resume-numbering-levels"
                        type="number"
                        label={t('resumeNumbering.label')}
                        min={1}
                        value={numberBullet}
                        onChange={changeNumberBulletValue}
                    />
                </div>
            </div>
        </Modal>
    );
};

export default ResumeNumberingModal;