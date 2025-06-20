import { useCallback, useEffect, useState } from "react";
import Button from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import Divider from "@/components/ui/divider";
import Modal from "@/components/ui/modal";
import TextField from "@/components/ui/textField";
import { useDispatch, useSelector } from "react-redux";
import { selectTocSettings } from "@/pages/editor/store/editor/editor.selector";
import { initialTocSettings, updateTocSettings } from "@/pages/editor/store/editor/editor.slice";
import { useTranslation } from "react-i18next";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { levelFormat, numberSeparator, tabLeaderFormat } from "@/utils/optionsEnums";
import Typography from "@/components/Typography";
import { updateSetupPageState } from "../store/layout/layout.sclice";
import { selectLayoutSettings } from "../store/layout/layout.selector";


interface TocSetupModalProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
}

const TocSettings = ({ isOpen, setIsOpen }: TocSetupModalProps) => {
    const { t } = useTranslation();
    const tocSettings = useSelector(selectTocSettings);
    const layoutSetupState = useSelector(selectLayoutSettings);
    const dispatch = useDispatch();
    const [settings, setSettings] = useState({
        ...initialTocSettings
    });

    useEffect(() => {
        setSettings(prev => ({ ...prev, ...tocSettings }))
    }, [tocSettings])

    const submitHandler = useCallback(() => {
        dispatch(updateTocSettings(settings));
        dispatch(updateSetupPageState(
            {
                ...layoutSetupState,
                setupDialogState: {
                    ...layoutSetupState.setupDialogState,
                    toc: { ...layoutSetupState.setupDialogState.toc, visible: settings.show },
                }
            }
        ));

        setIsOpen(false);
    }, [dispatch, settings]);

    return <Modal
        key={"toc-setup-modal"}
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        title={t('tableOfContents.label')}
        className="w-full max-w-full sm:max-w-[37.5em] md:min-w-[37.5em]"
        actions={[
            <Button key="cancel" className="w-full sm:w-[6em]" size="mini" intent={"secondary"} variant={"tonal"} onClick={() => setIsOpen(false)}>{t('buttons.cancel')}</Button>,
            <Button key="save" className="w-full sm:w-[6em]" size="mini" intent={"primary"} onClick={() => submitHandler()}>{t('buttons.done')}</Button>
        ]}
    >
        <div className="flex flex-col gap-4 sm:gap-6 max-h-[70vh] overflow-y-auto">
            <div className="flex flex-col gap-4 sm:gap-6">
                <Checkbox
                    label={t('tableOfContents.settings.show')}
                    labelClassName="font-semibold"
                    checked={settings.show}
                    onClick={() => {
                        setSettings(prev => ({ ...prev, show: !prev.show }));
                    }}
                />
                <TextField
                    id="toc-title"
                    type="text"
                    className="w-full sm:w-3/4 md:w-1/2"
                    label={t('tableOfContents.settings.setTitle')}
                    value={settings.title}
                    onChange={(e) => {
                        setSettings((prev) => ({ ...prev, title: e.target.value }));
                    }}
                />
            </div>
            <Divider orientation="horizontal" />
            <div className="grid grid-cols-1 gap-6">
                <div className="grid grid-cols-3 gap-6">
                    <div>
                        <TextField
                            id="toc-levels"
                            type="number"
                            label={t('tableOfContents.settings.showLevels')}
                            min={1}
                            max={6}
                            value={settings.levels}
                            onChange={(e) => {
                                setSettings((prev) => ({ ...prev, levels: parseInt(e.target.value) }));
                            }}
                        />
                    </div>
                    <div className="flex items-end gap-2">
                        <Checkbox
                            label={t('tableOfContents.settings.indentLevels')}
                            labelClassName="font-semibold"
                            checked={settings.indentLevels}
                            onClick={() => {
                                setSettings(prev => ({ ...prev, indentLevels: !prev.indentLevels }));
                            }}
                        />
                    </div>
                    <div>
                        {/* Third column content */}
                    </div>
                </div>
                <div className="flex flex-col gap-2">
                    <div className="flex flex-col gap-1">
                        <Typography component="p" className="ml-1 text-[0.75em] font-semibold">{t('tableOfContents.settings.tabLeader')}</Typography>
                    </div>
                    <Select
                        onValueChange={(value) => {
                            setSettings(prev => ({ ...prev, tabLeaderFormat: value }));
                        }}
                        value={settings?.tabLeaderFormat || "1"}
                    >
                        <SelectTrigger className="w-full sm:w-[10.6em] shadow-none focus:ring-0 focus:ring-offset-0 font-[400] text-[0.875em]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {tabLeaderFormat.map((type, index) => (
                                <SelectItem
                                    className="font-thin text-black"
                                    value={type.value}
                                    key={`${type.value}-${index}`}>
                                    <span> {t(type.label)}</span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <Divider orientation="horizontal" />
            <div className="grid grid-cols-1 gap-6">
                <div className="flex flex-col gap-2">
                    <Checkbox
                        label={t('tableOfContents.settings.headingNumbers')}
                        labelClassName="font-semibold"
                        checked={settings.showHeadingNumbers}
                        onClick={() => {
                            setSettings(prev => ({ ...prev, showHeadingNumbers: !prev.showHeadingNumbers }));
                        }}
                    />
                </div>
                <div className="flex flex-col gap-2">
                    <div className="flex flex-col gap-1">
                        <Typography component="p" className="ml-1 text-[0.75em] font-semibold">{t('tableOfContents.settings.numberSeparator')}</Typography>
                    </div>
                    <Select
                        onValueChange={(value) => {
                            setSettings(prev => ({ ...prev, numberSeparator: value }));
                        }}
                        value={settings?.numberSeparator || "1"}
                        disabled={!settings.showHeadingNumbers}
                    >
                        <SelectTrigger className="w-full sm:w-[10.6em] shadow-none focus:ring-0 focus:ring-offset-0 font-[400] text-[0.875em]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {numberSeparator.map((type, index) => (
                                <SelectItem
                                    className="font-thin text-black"
                                    value={type.value}
                                    key={`${type.value}-${index}`}>
                                    <span> {t(type.label)}</span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid grid-cols-3 gap-6">
                    {Array.from({ length: settings.levels }, (_, i) => i + 1).map((level) => (
                        <div key={`level-${level}-format`}>
                            <div className="flex flex-col gap-1">
                                <Typography component="p" className="ml-1 text-[0.75em] font-semibold">
                                    {t(`tableOfContents.settings.level${level}Format`)}
                                </Typography>
                            </div>
                            <Select
                                onValueChange={(value) => {
                                    setSettings(prev => ({
                                        ...prev,
                                        [`level${level}Format`]: value
                                    }));
                                }}
                                value={settings?.[`level${level}Format`] || "1"}
                                disabled={!settings.showHeadingNumbers}
                            >
                                <SelectTrigger className="w-full sm:w-[10.6em] shadow-none focus:ring-0 focus:ring-offset-0 font-[400] text-[0.875em]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {levelFormat.map((type, index) => (
                                        <SelectItem
                                            className="font-thin text-black"
                                            value={type.value}
                                            key={`${type.value}-${index}`}>
                                            <span> {t(type.label)}</span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </Modal>

}

export default TocSettings;