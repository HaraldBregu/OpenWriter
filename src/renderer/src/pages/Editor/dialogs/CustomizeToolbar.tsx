import React, { useEffect } from 'react';
import Modal from '@/components/ui/modal';
import Button from '@/components/ui/button';
import { useTranslation } from "react-i18next"
import Bold from '@/components/icons/Bold';
import Superscript from '@/components/icons/Superscript';
import Subscript from '@/components/icons/Subscript';
import Underline from '@/components/icons/Underline';
import Italic from '@/components/icons/Italic';
import ColorText from '@/components/icons/ColorText';
import NonPrintingCharact from '@/components/icons/NonPrintingCharact';
import Highlighter from '@/components/icons/Highlighter';
import HistoryEdu from '@/components/icons/HistoryEdu';
import Siglum from '@/components/icons/Siglum';
import Citation from '@/components/icons/Citation';
import CommentAdd from '@/components/icons/CommentAdd';
import Bookmark from '@/components/icons/Bookmark';
import Link from '@/components/icons/Link';
import AlignJustify from '@/components/icons/AlignJustify';
import FormatLineSpacing from '@/components/icons/FormatLineSpacing';
import List from '@/components/icons/List';
import IndentIncrease from '@/components/icons/IndentIncrease';
import IndentDecrease from '@/components/icons/IndentDecrease';
import Search from '@/components/icons/Search';
import Print from '@/components/icons/Print';
import ReadingSeperator from '@/components/icons/ReadingSeperator';
import Symbol from '@/components/icons/Symbol';
import Object from '@/components/icons/Object';
import cn from '@/utils/classNames';
import ReadingType from '@/components/icons/ReadingType';
import { Label } from '@/components/ui/label';

interface CustomizeToolbarModalProps {
    existingToolbarItems: string[];
    isOpen: boolean;
    onCancel: () => void;
    onSaveToolbarOptions: (toolbarOptions: string[]) => void;
}

interface CustomizeToolbarSectionProps {
    className?: string;
    section: string;
    buttons: {
        className?: string;
        enabled: boolean;
        label: string;
        icon: any;
        action: string
    }[];
    selectedItems: string[];
    onButtonClick: (action: string) => void
}

const CustomizeToolbarSection: React.FC<CustomizeToolbarSectionProps> = ({ className = 'justify-start', section, buttons, selectedItems, onButtonClick }) => {
    return (
        <div key={section} className={cn("flex flex-wrap items-start gap-2 border border-grey-80 rounded-md p-2", className)}>
            {/* Section Buttons */}
            {buttons.map(({
                enabled,
                label,
                icon: Icon,
                action,
                className = 'w-[88px]',
            }) => (
                <Button
                    key={action}
                    disabled={!enabled}
                    className={cn("text-grey-10 gap-2 flex flex-col p-1 border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 h-auto", className)}
                    variant={selectedItems.includes(action) ? "tonal" : "outline"}
                    intent={selectedItems.includes(action) ? "primary" : "secondary"}
                    onClick={() => onButtonClick(action)}
                >
                    <Icon intent="secondary" inheritColor={true} variant={enabled ? 'tonal' : 'outline'} />
                    <Label className='break-words whitespace-normal font-normal leading-[18px]'>{label}</Label>
                </Button>
            ))}
        </div>
    )
}
const CustomizeToolbarModal: React.FC<CustomizeToolbarModalProps> = ({ existingToolbarItems, isOpen, onCancel, onSaveToolbarOptions }) => {
    const { t } = useTranslation();

    const [selectedToolbarItems, setSelectedToolbarItems] = React.useState<string[]>([]);

    useEffect(() => {
        // Initialize selectedToolbarItems with existingToolbarItems when the modal opens
        if (isOpen) {
            setSelectedToolbarItems(existingToolbarItems);
        }
    }, [isOpen, existingToolbarItems]);

    // Define the toolbar data
    const toolbarData: any = [
        {
            section: "formatting",
            className: 'justify-between',
            buttons: [
                { enabled: true, label: t('toolbar.superscript'), icon: Superscript, action: "superscript" },
                { enabled: true, label: t('toolbar.subscript'), icon: Subscript, action: "subscript" },
                { enabled: false, label: t("toolbar.bold"), icon: Bold, action: "bold" },
                { enabled: false, label: t("toolbar.underline"), icon: Underline, action: "underline" },
                { enabled: false, label: t("toolbar.italic"), icon: Italic, action: "italic" },
                { enabled: false, label: t("toolbar.fontColor"), icon: ColorText, action: "color" },
                { enabled: false, label: t("toolbar.highlightColor"), icon: Highlighter, action: "highlight" },
                { enabled: true, label: t("toolbar.nonPrintingCharacters"), icon: NonPrintingCharact, action: "nonprinting" },
            ],
        },
        {
            section: "references",
            buttons: [
                { enabled: false, label: t("toolbar.note"), icon: HistoryEdu, action: "note" },
                { enabled: false, label: t("toolbar.siglum"), icon: Siglum, action: "siglum" },
                { enabled: false, label: t("toolbar.citation"), icon: Citation, action: "citation" },
                { enabled: true, label: t("toolbar.readingType"), icon: ReadingType, action: "readingType" },
                { enabled: true, label: t("toolbar.readingSeperator"), icon: ReadingSeperator, action: "readingSeparator" },
            ],
        },
        {
            section: "insert",
            buttons: [
                { enabled: false, label: t("toolbar.comment"), icon: CommentAdd, action: "comment" },
                { enabled: false, label: t("toolbar.bookmark"), icon: Bookmark, action: "bookmark" },
                { enabled: true, label: t("toolbar.symbol"), icon: Symbol, action: "symbol" },
                { enabled: false, label: t("toolbar.link"), icon: Link, action: "link" },
                { enabled: true, label: t("toolbar.object"), icon: Object, action: "object" },
            ],
        },
    ];

    const layoutToolbarData = [
        {
            section: "alignment",
            buttons: [
                { enabled: false, label: t("toolbar.alignment"), icon: AlignJustify, action: "align" },
                { enabled: false, label: t("toolbar.spacing"), icon: FormatLineSpacing, action: "spacing" },
                { enabled: false, label: t("toolbar.list"), icon: List, action: "lists" },
                { enabled: false, label: t("toolbar.increaseIndent"), icon: IndentIncrease, action: "indent" },
                { enabled: false, label: t("toolbar.decreaseIndent"), icon: IndentDecrease, action: "outdent" },
            ]
        }, {
            section: "search",
            buttons: [
                { enabled: false, label: t("toolbar.search"), icon: Search, action: "find" },
            ]
        }, {
            section: "print",
            buttons: [
                { enabled: false, label: t("toolbar.printPreview"), icon: Print, action: "printPreview", className: 'w-[96px]' },
            ],
        },
    ];

    const handleButtonClick = (action: string) => {
        // Toggle the button in the selectedToolbarItems array
        setSelectedToolbarItems((prev) => {
            if (prev.includes(action)) {
                return prev.filter(item => item !== action);
            } else {
                return [...prev, action];
            }
        });
    };

    return (
        <Modal
            key={"customize-toolbar-modal"}
            isOpen={isOpen}
            onOpenChange={onCancel}
            title={t('toolbar.modalTitle')}
            className="max-w-[904px] h-[90%] max-h-[534px] overflow-hidden gap-0"
            contentClassName="flex flex-col gap-8 p-8 overflow-y-auto"
            footerClassName='h-[auto] py-4'
            showCloseIcon={true}
            actions={[
                <Button key="cancel" className="border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 w-24" size="mini" intent={"secondary"} variant={"tonal"} onClick={onCancel}>{t('buttons.cancel')}</Button>,
                <Button key="save" className="border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 w-24" size="mini" intent={"primary"} onClick={() => onSaveToolbarOptions(selectedToolbarItems)}>
                    {t('buttons.done')}
                </Button>
            ]}
        >
            <div className="flex flex-col gap-2">
                {/* Toolbar Container */}
                <div className="flex flex-col gap-2">
                    {toolbarData.map((section) => (
                        <CustomizeToolbarSection
                            key={section.section}
                            className={section.className}
                            section={section.section}
                            buttons={section.buttons}
                            selectedItems={selectedToolbarItems}
                            onButtonClick={handleButtonClick}
                        />
                    ))}
                </div>
                <div className="flex flex-row gap-2">
                    {layoutToolbarData.map((section) => (
                        <CustomizeToolbarSection
                            key={section.section}
                            section={section.section}
                            buttons={section.buttons}
                            selectedItems={selectedToolbarItems}
                            onButtonClick={handleButtonClick}
                        />
                    ))}
                </div>
            </div>
        </Modal>
    );
};

export default CustomizeToolbarModal;