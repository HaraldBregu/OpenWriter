import { TreeView } from "./tree-view";
import { useEffect, useState } from "react";
import TextField from "./ui/textField";
import { useTranslation } from "react-i18next";
import DragHandle from './icons/DragHandle';


interface TocContentDelimiterProps {
    text?: string;
    className?: string;
}

const TocContentDelimiter = ({
    text = "",
    className = "",
}: TocContentDelimiterProps) => {
    return (
        <div className='flex flex-col items-center'>
            <div className={`flex items-center w-[95%] border-b border-grey-60 py-0 bg-gray-50 my-2 ${className}`}>
                <DragHandle className="mr-1" size={18} />
                <span className="text-[11px] font-semibold text-grey-40">{text}</span>
            </div>
        </div>
    );
};


interface TableOfContentsProps {
    tocStructure: TreeItem[];
    tocSettings: TocSettings;
    layoutTemplate?: unknown;
    templateOrder?: string[];
    onUpdateTocSettings: (tocSettings: TocSettings) => void;
    onClickHeadingIndex?: (item: number) => void;
}

export default function TableOfContents({
    tocStructure,
    tocSettings,
    onUpdateTocSettings,
    layoutTemplate,
    templateOrder,
    onClickHeadingIndex
}: TableOfContentsProps) {
    const { t } = useTranslation();
    const [isEditing, setIsEditing] = useState(false);
    const [tempTitle, setTempTitle] = useState(tocSettings.title ?? "");

    const [currentTocStructure, setCurrentTocStructure] = useState<TreeItem[] | null>(null);
    const [currentTocSettings, setCurrentTocSettings] = useState<TocSettings | null>(null);

    useEffect(() => {
        setCurrentTocStructure(tocStructure);
        setCurrentTocSettings(tocSettings);
    }, [tocStructure, tocSettings])

    const handleTreeItemClicked = (item: TreeItem) => {
        onClickHeadingIndex?.(item.headingIndex);
    }

    const handleTocTitle = () => {
        setTempTitle(tocSettings.title);
        setIsEditing(true);
    };

    const saveTitle = () => {
        onUpdateTocSettings({
            ...tocSettings,
            title: tempTitle
        });
        setIsEditing(false);
    };

    const isSectionVisible = (sectionKey: string) => {
        return layoutTemplate?.[sectionKey]?.visible === true;
    };

    const getOrderedVisibleSections = () => {
        if (!templateOrder || !layoutTemplate) return [];

        return templateOrder.filter(sectionKey => isSectionVisible(sectionKey));
    };

    const orderedVisibleSections = getOrderedVisibleSections();

    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center p-2 sticky top-0 z-10">
                <h4 className="text-xs font-medium">{t('tableOfContents.sidepanelLabel')}</h4>
            </div>
            <div className="flex-1 overflow-y-auto pt-2">
                <div className="mb-4">
                    {orderedVisibleSections.map((sectionKey) => {
                        switch (sectionKey) {
                            case 'toc':
                                return (
                                    <div key="toc" className="flex justify-between items-center px-2 my-3">
                                        {tocSettings.show && <div className="flex items-center gap-0">
                                            {!isEditing ?
                                                <h5 className="text-sm font-bold" onDoubleClick={() => handleTocTitle()}>
                                                    {tocSettings.title}
                                                </h5> :
                                                <TextField
                                                    id="toc-title"
                                                    className="w-full"
                                                    value={tempTitle}
                                                    onChange={(e) => {
                                                        setTempTitle(e.target.value);
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            saveTitle();
                                                        }
                                                    }}
                                                    onBlur={() => {
                                                        saveTitle();
                                                    }}
                                                    autoFocus
                                                    placeholder={t('tableOfContents.navigation.placeholder')}
                                                />
                                            }
                                        </div>}
                                    </div>
                                );

                            case 'intro':
                                return (
                                    <div key="intro" className="flex justify-between items-center px-2 my-3">
                                        <div className="flex items-center gap-0">
                                            <h5 className="text-sm font-bold">{t('tableOfContents.sections.introduction')}</h5>
                                        </div>
                                    </div>
                                );

                            case 'critical':
                                return (
                                    <div
                                        key="critical"
                                        className="flex flex-col hover:bg-gray-50 rounded-md mb-4">
                                        <TocContentDelimiter text={t('tableOfContents.sections.criticalText.start')} />
                                        {currentTocStructure && currentTocSettings &&
                                            <TreeView
                                                data={currentTocStructure}
                                                defaultOpen
                                                onTreeItemClicked={(item) => {
                                                    handleTreeItemClicked(item)
                                                }}
                                                indentLevels={currentTocSettings.indentLevels}
                                            />}
                                        <TocContentDelimiter text={t('tableOfContents.sections.criticalText.end')} />
                                    </div>
                                );

                            case 'bibliography':
                                return (
                                    <div key="bibliography" className="flex justify-between items-center px-2 my-3">
                                        <div className="flex items-center gap-0">
                                            <h5 className="text-sm font-bold">{t('tableOfContents.sections.bibliography')}</h5>
                                        </div>
                                    </div>
                                );

                            default:
                                return null;
                        }
                    })}
                </div>
            </div>
        </div>
    );
}

