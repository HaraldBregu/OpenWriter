import { useCallback, useEffect, useState } from "react";
import Button from "../../../components/ui/button";
import Divider from "../../../components/ui/divider";
import Modal from "../../../components/ui/modal";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import AppRadioGroup from "../../../components/app-radiogroup";
import Typography from "../../../components/Typography";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { sectionTypes } from "@/utils/optionsEnums";
import { updateLineNumberSettings } from "@/pages/editor/store/pagination/pagination.slice";
import { selectLineNumberSettings } from "@/pages/editor/store/pagination/pagination.selector";

interface LineNumberModalProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
}

const LineNumberSettings = ({ isOpen, setIsOpen }: LineNumberModalProps) => {
    const { t } = useTranslation();
    const lineNumberSettings = useSelector(selectLineNumberSettings);
    const dispatch = useDispatch();
    const [settings, setSettings] = useState({
        showLines: 0,
        linesNumeration: 1,
        sectionLevel: 1,
    });

    useEffect(() => {
        // console.log("🚀 ~ LineNumberModal ~ lineNumberSettings:", lineNumberSettings)
        setSettings(prev => ({
            ...prev,
            ...lineNumberSettings
        }))
    }, [lineNumberSettings])

    const submitHandler = useCallback(() => {
        dispatch(updateLineNumberSettings(settings));
        setIsOpen(false);
    }, [dispatch, settings, setIsOpen]);

    const selectSectionLevel = () => {
        return <Select
            onValueChange={(value) => setSettings(prev => ({ ...prev, sectionLevel: parseInt(value) }))}
            value={settings.sectionLevel?.toString()}
            disabled={settings.linesNumeration !== 3}
        >
            <SelectTrigger className="w-full sm:w-[7.5em] shadow-none focus:ring-0 focus:ring-offset-0 font-[400] text-[0.875em]">
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                {sectionTypes.map((type, index) => (
                    <SelectItem
                        className="font-thin"
                        value={type.value.toString()}
                        key={`${type.value}-${index}`}>
                        <span> {t(type.label)}</span>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    }

    return <Modal
        key={"line-number-modal"}
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        title={t('lineNumber.label')}
        className="w-full max-w-full sm:max-w-[37.5em] md:min-w-[37.5em]"
        actions={[
            <Button key="cancel" className="w-full sm:w-[6em]" size="mini" intent={"secondary"} variant={"tonal"} onClick={() => setIsOpen(false)}>{t('buttons.cancel')}</Button>,
            <Button key="save" className="w-full sm:w-[6em]" size="mini" intent={"primary"} onClick={() => submitHandler()}>{t('buttons.done')}</Button>
        ]}
    >
        <div className="flex flex-col gap-6 max-h-[70vh] overflow-y-auto">
            <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-1">
                    <Typography component="h6" className="text-[1.125em] font-bold">{t('lineNumber.show.label')}</Typography>
                    <Typography component="p" className="text-[0.8125em]">{t('lineNumber.show.description')}</Typography>
                </div>
                <AppRadioGroup
                    items={[
                        { label: t('lineNumber.show.none'), value: '0', className: "text-[0.8125em] font-[600]" },
                        { label: t('lineNumber.show.everyFive'), value: '5', className: "text-[0.8125em] font-[600]" },
                        { label: t('lineNumber.show.everyTen'), value: '10', className: "text-[0.8125em] font-[600]" },
                        { label: t('lineNumber.show.everyFifteen'), value: '15', className: "text-[0.8125em] font-[600]" },
                    ]}
                    value={settings?.showLines?.toString()}
                    onValueChange={(value) => {
                        setSettings((prev) => ({ ...prev, showLines: parseInt(value) }));
                    }}
                />
            </div>
            <Divider orientation="horizontal" />
            <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-1">
                    <Typography component="p" className="text-[0.8125em] font-bold">{t('lineNumber.numeration')}</Typography>
                </div>
                <AppRadioGroup
                    items={[
                        { label: t('lineNumber.whole'), value: '1', className: "text-[0.8125em] font-[600]" },
                        { label: t('lineNumber.everyPage'), value: '2', className: "text-[0.8125em] font-[600]" },
                        { label: <>{t('lineNumber.everySection')} {selectSectionLevel()}</>, value: '3', className: "text-[0.8125em] font-[600]" },
                    ]}
                    value={settings.linesNumeration.toString()}
                    onValueChange={(value) => {
                        setSettings((prev) => ({ ...prev, linesNumeration: parseInt(value) }));
                    }}
                />
            </div>
        </div>
    </Modal>
}

export default LineNumberSettings;