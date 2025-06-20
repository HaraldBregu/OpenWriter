import { useCallback, useEffect, useState } from "react";
import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import PaginationSetup from "@/components/pagination-form";
import { selectFooterSettings } from "@/pages/editor/store/pagination/pagination.selector";
import { type FooterSettings, updateFooterSettings } from "@/pages/editor/store/pagination/pagination.slice";

// Definizione dell'interfaccia per le impostazioni
interface FooterModalProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
}

const FooterSettings = ({ isOpen, setIsOpen }: FooterModalProps) => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const footerSettings = useSelector(selectFooterSettings);

    // Inizializza lo stato direttamente dal selettore Redux
    const [settings, setSettings] = useState<FooterSettings>(() => ({
        displayMode: footerSettings.displayMode,
        startFromPage: footerSettings.startFromPage ?? 1, // Provide default value if undefined
        sectionsToShow: footerSettings.sectionsToShow,
        leftContent: footerSettings.leftContent,
        centerContent: footerSettings.centerContent,
        rightContent: footerSettings.rightContent,
    }));

    // Aggiorna lo stato locale quando cambiano le impostazioni Redux
    useEffect(() => {
        setSettings({ ...footerSettings });
    }, [footerSettings]);

    const submitHandler = useCallback(() => {
        dispatch(updateFooterSettings(settings));

        setIsOpen(false);
    }, [settings, setIsOpen, dispatch]);

    const handleSetSettings = useCallback((footerSettings: any) => {
        setSettings({
            ...footerSettings,
        });
    }, []);

    return (
        <Modal
            key="footer-settings-modal"
            isOpen={isOpen}
            onOpenChange={setIsOpen}
            title={t('headerFooter.footer')}
            className="w-full max-w-full sm:max-w-[37.5em] md:min-w-[37.5em]"
            actions={[
                <Button
                    key="cancel"
                    className="w-full sm:w-[6em]"
                    size="mini"
                    intent="secondary"
                    variant="tonal"
                    onClick={() => setIsOpen(false)}
                >
                    {t('buttons.cancel')}
                </Button>,
                <Button
                    key="save"
                    className="w-full sm:w-[6em]"
                    size="mini"
                    intent="primary"
                    onClick={submitHandler}
                >
                    {t('buttons.done')}
                </Button>
            ]}
        >
            <div className="max-h-[70vh] overflow-y-auto">
                <PaginationSetup
                    settings={settings}
                    setSettings={handleSetSettings}
                />
            </div>
        </Modal>
    );
};

export default FooterSettings;