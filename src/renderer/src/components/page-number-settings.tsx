import { useCallback, useEffect, useState } from "react";
import Button from "./ui/button";
import Modal from "./ui/modal";
import {
    useDispatch,
    useSelector
} from "react-redux";
import { useTranslation } from "react-i18next";
import AppRadioGroup from "./app-radiogroup";
import Typography from "./Typography";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import TextField from "./ui/textField";
import { numberFormat } from "@/utils/optionsEnums";
import { selectPageNumberSettings } from "@/pages/editor/store/pagination/pagination.selector";
import {
    updatePageNumberSettings,
    PageNumberSettings
} from "@/pages/editor/store/pagination/pagination.slice";

interface PageNumberModalProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
}

const PageNumberModal = ({ isOpen, setIsOpen }: PageNumberModalProps) => {
    const { t } = useTranslation();
    const dispatch = useDispatch();

    const storedSettings = useSelector(selectPageNumberSettings);
    const [settings, setSettings] = useState<PageNumberSettings>({
        toc: { pageNumeration: '1', numberFormat: '1', startingPointValue: 1 },
        intro: { pageNumeration: '1', numberFormat: '1', startingPointValue: 1 },
        crt: { pageNumeration: '1', numberFormat: '1', startingPointValue: 1 },
        biblio: { pageNumeration: '1', numberFormat: '1', startingPointValue: 1 }
    });

    useEffect(() => {
        if (storedSettings) {
            setSettings(prev => ({
                ...prev,
                ...storedSettings
            }));
        }
    }, [storedSettings]);

    const submitHandler = useCallback(() => {
        dispatch(updatePageNumberSettings(settings));
        setIsOpen(false);
    }, [dispatch, settings, setIsOpen]);

    const handleSectionChange = useCallback((section: keyof PageNumberSettings, newSettings: Record<string, string | number>) => {
        setSettings(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                ...newSettings
            }
        }));
    }, []);

    const selectStarterPoint = (tabType: keyof PageNumberSettings) => {
        const isStartMode = settings?.[tabType]?.pageNumeration === '3';

        return <TextField
            id={`${tabType}-starting-point`}
            type="number"
            className={`w-full sm:w-[4.5em] h-[1.75em] ${!isStartMode ? 'opacity-50' : ''}`}
            value={settings[tabType]?.startingPointValue?.toString() || "1"}
            onChange={(e) => {
                if (isStartMode) {
                    handleSectionChange(tabType, {
                        startingPointValue: parseInt(e.target.value) || 1
                    });
                }
            }}
            disabled={!isStartMode}
        />
    }

    const numberTypeSelector = (tabType: keyof PageNumberSettings) => {
        return <Select
            onValueChange={(value) => {
                handleSectionChange(tabType, {
                    numberFormat: value
                });
            }}
            value={settings[tabType]?.numberFormat || "1"}
        >
            <SelectTrigger className="w-full sm:w-[10.6em] shadow-none focus:ring-0 focus:ring-offset-0 font-[400] text-[0.875em]">
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                {numberFormat.map((type, index) => (
                    <SelectItem
                        className="font-thin text-grey-10"
                        value={type.value}
                        key={`${type.value}-${index}`}>
                        <span> {t(type.label)}</span>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    }

    const pageConfigurator = (tabType: keyof PageNumberSettings) => {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full pt-4">
                <div className="p-1">
                    <div className="flex flex-col gap-2">
                        <div className="flex flex-col gap-1">
                            <Typography component="p" className="text-[0.8125em] font-bold">{t('pageNumber.numeration')}</Typography>
                        </div>
                        <AppRadioGroup
                            items={[
                                { label: t('pageNumber.none'), value: '1', className: "text-[0.8125em] font-[600]" },
                                { label: t('pageNumber.continue'), value: '2', className: "text-[0.8125em] font-[600]" },
                                { label: <div className="flex flex-row gap-2 items-center">{t('pageNumber.start')} {selectStarterPoint(tabType)}</div>, value: '3', className: "text-[0.8125em] font-[600]" },
                            ]}
                            value={settings[tabType]?.pageNumeration || "1"}
                            onValueChange={(value) => {
                                handleSectionChange(tabType, {
                                    pageNumeration: value
                                });
                            }}
                        />
                    </div>
                </div>
                <div className="p-1">
                    <div className="flex flex-col gap-2">
                        <div className="flex flex-col gap-1">
                            <Typography component="p" className="text-[0.8125em] font-bold">{t('pageNumber.format.label')}</Typography>
                        </div>
                        {numberTypeSelector(tabType)}
                    </div>
                </div>
                <div className="p-1">
                </div>
            </div>
        );
    }

    return <Modal
        key={"page-number-modal"}
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        title={t('pageNumber.label')}
        className="w-full max-w-full sm:max-w-[43.75em] md:min-w-[43.75em]"
        actions={[
            <Button key="cancel" className="w-full sm:w-[6em]" size="mini" intent={"secondary"} variant={"tonal"} onClick={() => setIsOpen(false)}>{t('buttons.cancel')}</Button>,
            <Button key="save" className="w-full sm:w-[6em]" size="mini" intent={"primary"} onClick={() => submitHandler()}>{t('buttons.done')}</Button>
        ]}
    >
        <div className="max-h-[70vh] overflow-y-none">
            <Tabs defaultValue="toc" className="w-full">
                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
                    <TabsTrigger value="toc">{t('pageSetup.component.section.toc')}</TabsTrigger>
                    <TabsTrigger value="intro">{t('pageSetup.component.section.intro')}</TabsTrigger>
                    <TabsTrigger value="crt">{t('pageSetup.component.section.critical')}</TabsTrigger>
                    <TabsTrigger value="biblio">{t('pageSetup.component.section.bibliography')}</TabsTrigger>
                </TabsList>
                <TabsContent value="toc">
                    {pageConfigurator('toc')}
                </TabsContent>
                <TabsContent value="intro">
                    {pageConfigurator('intro')}
                </TabsContent>
                <TabsContent value="crt">
                    {pageConfigurator('crt')}
                </TabsContent>
                <TabsContent value="biblio">
                    {pageConfigurator('biblio')}
                </TabsContent>
            </Tabs>
        </div>
    </Modal>
}

export default PageNumberModal;