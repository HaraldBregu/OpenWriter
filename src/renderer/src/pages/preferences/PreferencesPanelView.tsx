import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from "@/components/ui/button";
import Typography from "@/components/Typography";
import AppRadioGroup from "@/components/app-radiogroup";
import AppCheckbox from "@/components/app-checkbox";
import { Select, SelectContent, SelectTrigger, SelectValue, SelectItem } from "@/components/ui/select";
import CustomSelect from "@/components/ui/custom-select";
import Divider from '@/components/ui/divider';
import TextField from "@/components/ui/textField";
import Folder from '@/components/icons/Folder';
import { Sidebar, SidebarContent, SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { ThemeProvider, useTheme } from "../../providers/theme-provider";

const PreferencesPanelView = () => {
    const { t } = useTranslation();
    const { theme, setTheme } = useTheme();

    // Stato per la sezione attiva nella sidebar
    const [activeSection, setActiveSection] = useState('general');

    // Stati per le preferenze General
    const [fileNameDisplay, setFileNameDisplay] = useState('full');
    const [rememberLayout, setRememberLayout] = useState(true);
    const [recentFilesCount, setRecentFilesCount] = useState('10');
    const [linksBehavior, setLinksBehavior] = useState('default');

    // Stati per le preferenze Appearance
    const [commentPreviewLimit, setCommentPreviewLimit] = useState('50');
    const [bookmarkPreviewLimit, setBookmarkPreviewLimit] = useState('50');

    // Stati per le preferenze File
    const [fileSavingDirectory, setFileSavingDirectory] = useState('last');
    const [defaultDirectory, setDefaultDirectory] = useState('~/Username/Documents/');
    const [automaticFileSave, setAutomaticFileSave] = useState('never');
    const [versioningDirectory, setVersioningDirectory] = useState('default');
    const [customVersioningDirectory, setCustomVersioningDirectory] = useState('~/Username/Documents/');
    const [defaultEncoding, setDefaultEncoding] = useState('utf8');
    const [encodingDetection, setEncodingDetection] = useState(true);
    const [restoreLayout, setRestoreLayout] = useState(true);

    // Stati per le preferenze Language & Region
    const [criterionLanguage, setCriterionLanguage] = useState('en-UK');
    const [criterionRegion, setCriterionRegion] = useState('IT');
    const [dateTimeFormat, setDateTimeFormat] = useState('DD/MM/YYYY HH:MM:SS');

    // Stati per le preferenze Editing
    const [historyActionsCount, setHistoryActionsCount] = useState('10');

    const sidebarItems = [
        { id: 'general', label: t('preferences.sections.general') },
        { id: 'appearance', label: t('preferences.sections.appearance') },
        { id: 'file', label: t('preferences.sections.file') },
        { id: 'language', label: t('preferences.sections.language') },
        { id: 'editing', label: t('preferences.sections.editing') },
        // { id: 'account', label: t('preferences.sections.account') }
    ];

    const fileNameOptions = [
        {
            value: 'full',
            label: t('preferences.general.fileNameDisplay.fullPath'),
            description: t('preferences.general.fileNameDisplay.fullPathDescription')
        },
        {
            value: 'filename',
            label: t('preferences.general.fileNameDisplay.filenameOnly'),
            description: t('preferences.general.fileNameDisplay.filenameOnlyDescription')
        }
    ];

    const linksOptions = [
        {
            value: 'default',
            label: t('preferences.general.links.openInDefaultApp')
        },
        {
            value: 'criterion',
            label: t('preferences.general.links.openInCriterion')
        }
    ];

    const themeOptions = [
        {
            value: 'system',
            label: t('preferences.appearance.theme.system')
        },
        {
            value: 'light',
            label: t('preferences.appearance.theme.light')
        },
        {
            value: 'dark',
            label: t('preferences.appearance.theme.dark')
        }
    ];

    const recentFilesOptions = [
        { value: '5', label: '5' },
        { value: '10', label: '10' },
        { value: '15', label: '15' },
        { value: '20', label: '20' }
    ];

    const characterLimitOptions = [
        { value: '25', label: '25' },
        { value: '50', label: '50' },
        { value: '75', label: '75' },
        { value: '100', label: '100' },
        { value: '150', label: '150' },
        { value: '200', label: '200' }
    ];

    const fileSavingOptions = [
        {
            value: 'last',
            label: t('preferences.file.fileSavingDirectory.lastOpened')
        },
        {
            value: 'default',
            label: t('preferences.file.fileSavingDirectory.defaultDirectory')
        }
    ];

    const automaticSaveOptions = [
        {
            value: 'never',
            label: t('preferences.file.automaticFileSave.never')
        },
        {
            value: '5min',
            label: t('preferences.file.automaticFileSave.every5min')
        },
        {
            value: '10min',
            label: t('preferences.file.automaticFileSave.every10min')
        },
        {
            value: '15min',
            label: t('preferences.file.automaticFileSave.every15min')
        }
    ];

    const versioningOptions = [
        {
            value: 'default',
            label: t('preferences.file.versioningDirectory.defaultDirectory')
        },
        {
            value: 'custom',
            label: t('preferences.file.versioningDirectory.customDirectory')
        }
    ];

    // const encodingOptions = [
    //     {
    //         value: 'utf8',
    //         label: 'UTF-8'
    //     },
    //     {
    //         value: 'utf16',
    //         label: 'UTF-16'
    //     },
    //     {
    //         value: 'utf32',
    //         label: 'UTF-32'
    //     }
    // ];

    const languageOptions = [
        { value: 'en-US', label: 'English (US)' },
        { value: 'en-UK', label: 'English (UK)' },
        { value: 'it-IT', label: 'Italiano (Italia)' },
        { value: 'fr-FR', label: 'Français (France)' },
        { value: 'de-DE', label: 'Deutsch (Deutschland)' },
        { value: 'es-ES', label: 'Español (España)' }
    ];

    const regionOptions = [
        { value: 'US', label: 'United States' },
        { value: 'UK', label: 'United Kingdom' },
        { value: 'IT', label: 'Italy' },
        { value: 'FR', label: 'France' },
        { value: 'DE', label: 'Germany' },
        { value: 'ES', label: 'Spain' }
    ];

    const dateTimeFormatOptions = [
        { value: 'DD/MM/YYYY HH:MM:SS', label: 'DD/MM/YYYY HH:MM:SS' },
        { value: 'MM/DD/YYYY HH:MM:SS', label: 'MM/DD/YYYY HH:MM:SS' },
        { value: 'YYYY-MM-DD HH:MM:SS', label: 'YYYY-MM-DD HH:MM:SS' },
        { value: 'DD.MM.YYYY HH:MM:SS', label: 'DD.MM.YYYY HH:MM:SS' },
        { value: 'DD/MM/YYYY h:MM:SS A', label: 'DD/MM/YYYY h:MM:SS AM/PM' },
        { value: 'MM/DD/YYYY h:MM:SS A', label: 'MM/DD/YYYY h:MM:SS AM/PM' }
    ];



    const handleSave = async () => {
        console.log('Saving preferences:', {
            fileNameDisplay,
            rememberLayout,
            recentFilesCount,
            linksBehavior,
            theme,
            commentPreviewLimit,
            bookmarkPreviewLimit,
            fileSavingDirectory,
            defaultDirectory,
            automaticFileSave,
            versioningDirectory,
            customVersioningDirectory,
            defaultEncoding,
            encodingDetection,
            restoreLayout,
            criterionLanguage,
            criterionRegion,
            dateTimeFormat,
            historyActionsCount
        });
        await window.application.closeChildWindow();
    };

    const handleReset = () => {
        // Reset ai valori predefiniti
        setFileNameDisplay('full');
        setRememberLayout(true);
        setRecentFilesCount('10');
        setLinksBehavior('default');
        setTheme('system');
        setCommentPreviewLimit('50');
        setBookmarkPreviewLimit('50');
        setFileSavingDirectory('last');
        setDefaultDirectory('~/Username/Documents/');
        setAutomaticFileSave('never');
        setVersioningDirectory('default');
        setCustomVersioningDirectory('~/Username/Documents/');
        setDefaultEncoding('utf8');
        setEncodingDetection(true);
        setRestoreLayout(true);
        setCriterionLanguage('en-UK');
        setCriterionRegion('IT');
        setDateTimeFormat('DD/MM/YYYY HH:MM:SS');
        setHistoryActionsCount('10');
    };

    const renderGeneralContent = () => (
        <div className="space-y-6">
            {/* File name display */}
            <div className="grid grid-cols-12 gap-4">
                <div className="col-span-4 flex justify-end">
                    <Typography component="h3" className="text-[14px] font-semibold mb-3">
                        {t('preferences.general.fileNameDisplay.title')}
                    </Typography>
                </div>
                <div className="col-span-8">
                    <AppRadioGroup
                        items={fileNameOptions.map(option => ({
                            value: option.value,
                            label: option.label,
                            description: option.description,
                            className: "text-[13px]"
                        }))}
                        value={fileNameDisplay}
                        onValueChange={setFileNameDisplay}
                    />
                </div>
            </div>
            <Divider orientation='horizontal' className="my-2" />
            {/* Restore Criterion layout */}
            <div className="grid grid-cols-12 gap-4">
                <div className="col-span-4 flex justify-end">
                    <Typography component="h3" className="text-[14px] font-semibold mb-3">
                        {t('preferences.general.restoreCriterionLayout.title')}
                    </Typography>
                </div>
                <div className="col-span-8">
                    <div className="space-y-2">
                        <AppCheckbox
                            checked={rememberLayout}
                            onCheckedChange={setRememberLayout}
                            labelClassName='text-[14px]'
                            label={t('preferences.general.restoreCriterionLayout.rememberLastLayout')}
                        />
                        <Typography component="p" className="text-[11px] text-gray-600 ml-6">
                            {t('preferences.general.restoreCriterionLayout.rememberLastLayoutDescription')}
                        </Typography>
                    </div>
                </div>
            </div>
            <Divider orientation='horizontal' className="my-2" />
            {/* Recent files to open */}
            <div className="grid grid-cols-12 gap-4">
                <div className="col-span-4 flex justify-end">
                    <Typography component="h3" className="text-[14px] font-semibold mb-3">
                        {t('preferences.general.recentFiles.title')}
                    </Typography>
                </div>
                <div className="col-span-8">
                    <div className="flex items-center gap-3">
                        <Select value={recentFilesCount} onValueChange={setRecentFilesCount}>
                            <SelectTrigger className="w-16">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {recentFilesOptions.map(option => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Typography component="p" className="text-[11px] text-gray-600 mt-2">
                        {t('preferences.general.recentFiles.description')}
                    </Typography>
                </div>
            </div>
            <Divider orientation='horizontal' className="my-2" />

            {/* Links */}
            <div className="grid grid-cols-12 gap-4">
                <div className="col-span-4 flex justify-end">
                    <Typography component="h3" className="text-[14px] font-semibold mb-3">
                        {t('preferences.general.links.title')}
                    </Typography>
                </div>
                <div className="col-span-8">
                    <AppRadioGroup
                        items={linksOptions.map(option => ({
                            value: option.value,
                            label: option.label,
                            className: "text-[13px] text-bold"
                        }))}
                        value={linksBehavior}
                        onValueChange={setLinksBehavior}
                    />
                </div>
            </div>
        </div>
    );

    const renderAppearanceContent = () => (
        <div className="space-y-6">
            {/* Theme */}
            <div className="grid grid-cols-12 gap-4">
                <div className="col-span-4 flex justify-end">
                    <Typography component="h3" className="text-[14px] font-semibold mb-3">
                        {t('preferences.appearance.theme.title')}
                    </Typography>
                </div>
                <div className="col-span-8">
                    <AppRadioGroup
                        items={themeOptions.map(option => ({
                            value: option.value,
                            label: option.label,
                            className: "text-[13px]"
                        }))}
                        value={theme}
                        onValueChange={(value: string) => setTheme(value as 'light' | 'dark' | 'system')}
                    />
                </div>
            </div>

            <Divider orientation='horizontal' className="my-2" />

            {/* Comment preview character limit */}
            <div className="grid grid-cols-12 gap-4">
                <div className="col-span-4 flex justify-end">
                    <Typography component="h3" className="text-[12px] font-semibold mb-3 ml-12">
                        {t('preferences.appearance.commentPreviewLimit.title')}
                    </Typography>
                </div>
                <div className="col-span-8">
                    <div className="flex items-center gap-3">
                        <Select value={commentPreviewLimit} onValueChange={setCommentPreviewLimit}>
                            <SelectTrigger className="w-16">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {characterLimitOptions.map(option => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Typography component="p" className="text-[11px] text-gray-600 mt-2">
                        {t('preferences.appearance.commentPreviewLimit.description')}
                    </Typography>
                </div>
            </div>

            <Divider orientation='horizontal' className="my-2" />

            {/* Bookmark preview character limit */}
            <div className="grid grid-cols-12 gap-4">
                <div className="col-span-4 flex justify-end">
                    <Typography component="h3" className="text-[12px] font-semibold mb-3 ml-12">
                        {t('preferences.appearance.bookmarkPreviewLimit.title')}
                    </Typography>
                </div>
                <div className="col-span-8">
                    <div className="flex items-center gap-3">
                        <Select value={bookmarkPreviewLimit} onValueChange={setBookmarkPreviewLimit}>
                            <SelectTrigger className="w-16">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {characterLimitOptions.map(option => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Typography component="p" className="text-[11px] text-gray-600 mt-2">
                        {t('preferences.appearance.bookmarkPreviewLimit.description')}
                    </Typography>
                </div>
            </div>
        </div>
    );

    // Aggiungi una funzione per aprire il dialog di selezione cartella
    const handleSelectDirectory = async () => {
        console.log("handleSelectCustomVersioningDirectory")
        window.electron.ipcRenderer.send("select-folder-path")
        window.electron.ipcRenderer.on("receive-folder-path", (_, path) => {
            if (path?.lenght > 0)
                setDefaultDirectory(path)
        })
    };

    const renderFileContent = () => (
        <div className="space-y-6">
            {/* File saving directory */}
            <div className="grid grid-cols-12 gap-4">
                <div className="col-span-4 flex justify-end">
                    <Typography component="h3" className="text-[14px] font-semibold mb-3">
                        {t('preferences.file.fileSavingDirectory.title')}
                    </Typography>
                </div>
                <div className="col-span-8">
                    <div className="space-y-2">
                        <AppRadioGroup
                            items={fileSavingOptions.map(option => ({
                                value: option.value,
                                label: option.label,
                                className: "text-[13px]"
                            }))}
                            value={fileSavingDirectory}
                            onValueChange={setFileSavingDirectory}
                        />
                        {fileSavingDirectory === 'default' && (
                            <div className="ml-6 mt-2">
                                <TextField
                                    id="defaultDirectory"
                                    type="text"
                                    value={defaultDirectory}
                                    onChange={(e) => setDefaultDirectory(e.target.value)}
                                    placeholder={t('preferences.file.selectPath')}
                                    className="text-[11px]"
                                    rightIcon={
                                        <Button
                                            size="mini"
                                            intent="secondary"
                                            variant="icon"
                                            onClick={handleSelectDirectory}
                                        >
                                            <Folder variant="tonal" intent="secondary" size="small" />
                                        </Button>
                                    }
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <Divider orientation='horizontal' className="my-2" />

            {/* Automatic file save */}
            <div className="grid grid-cols-12 gap-4">
                <div className="col-span-4 flex justify-end">
                    <Typography component="h3" className="text-[14px] font-semibold mb-3">
                        {t('preferences.file.automaticFileSave.title')}
                    </Typography>
                </div>
                <div className="col-span-8">
                    <AppRadioGroup
                        items={automaticSaveOptions.map(option => ({
                            value: option.value,
                            label: option.label,
                            className: "text-[13px]"
                        }))}
                        value={automaticFileSave}
                        onValueChange={setAutomaticFileSave}
                    />
                </div>
            </div>

            <Divider orientation='horizontal' className="my-2" />

            {/* Versioning directory */}
            <div className="grid grid-cols-12 gap-4">
                <div className="col-span-4 flex justify-end">
                    <Typography component="h3" className="text-[14px] font-semibold mb-3">
                        {t('preferences.file.versioningDirectory.title')}
                    </Typography>
                </div>
                <div className="col-span-8">
                    <div className="space-y-2">
                        <AppRadioGroup
                            items={versioningOptions.map(option => ({
                                value: option.value,
                                label: option.label,
                                className: "text-[13px]"
                            }))}
                            value={versioningDirectory}
                            onValueChange={setVersioningDirectory}
                        />
                        <div className="ml-6 mt-2">
                            <TextField
                                id="customVersioningDirectory"
                                type="text"
                                value={customVersioningDirectory}
                                onChange={(e) => setCustomVersioningDirectory(e.target.value)}
                                placeholder={t('preferences.file.selectPath')}
                                className="text-[11px]"
                                disabled={versioningDirectory !== 'custom'}
                                rightIcon={
                                    <Button
                                        size="mini"
                                        intent="secondary"
                                        variant="icon"
                                        disabled={versioningDirectory !== 'custom'}
                                        onClick={handleSelectCustomVersioningDirectory}
                                    >
                                        <Folder variant="tonal" intent="secondary" size="small" />
                                    </Button>
                                }
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* <Divider orientation='horizontal' className="my-2" /> */}

            {/* Default encoding */}
            {/* <div className="grid grid-cols-12 gap-4">
                <div className="col-span-4 flex justify-end">
                    <Typography component="h3" className="text-[14px] font-semibold mb-3">
                        Default encoding
                    </Typography>
                </div>
                <div className="col-span-8">
                    <AppRadioGroup
                        items={encodingOptions.map(option => ({
                            value: option.value,
                            label: option.label,
                            className: "text-[13px]"
                        }))}
                        value={defaultEncoding}
                        onValueChange={setDefaultEncoding}
                    />
                </div>
            </div> */}

            {/* <Divider orientation='horizontal' className="my-2" /> */}

            {/* Encoding detection */}
            {/* <div className="grid grid-cols-12 gap-4">
                <div className="col-span-4 flex justify-end">
                    <Typography component="h3" className="text-[14px] font-semibold mb-3">
                        Encoding detection
                    </Typography>
                </div>
                <div className="col-span-8">
                    <AppCheckbox
                        checked={encodingDetection}
                        onCheckedChange={setEncodingDetection}
                        labelClassName='text-[13px]'
                        label="Enable"
                    />
                </div>
            </div> */}

            {/* <Divider orientation='horizontal' className="my-2" /> */}

            {/* Restore layout */}
            {/* <div className="grid grid-cols-12 gap-4">
                <div className="col-span-4 flex justify-end">
                    <Typography component="h3" className="text-[14px] font-semibold mb-3">
                        Restore layout
                    </Typography>
                </div>
                <div className="col-span-8">
                    <div className="space-y-2">
                        <AppCheckbox
                            checked={restoreLayout}
                            onCheckedChange={setRestoreLayout}
                            labelClassName='text-[13px]'
                            label="Remember the last visual layout"
                        />
                        <Typography component="p" className="text-[11px] text-gray-600 ml-6">
                            Saves and restores the last visual layout of the editing session.
                        </Typography>
                    </div>
                </div>
            </div> */}
        </div>
    );

    // Aggiungi anche la funzione per la cartella di versioning personalizzata
    const handleSelectCustomVersioningDirectory = async () => {
        console.log("handleSelectCustomVersioningDirectory")
        window.electron.ipcRenderer.send("select-folder-path")
        window.electron.ipcRenderer.on("receive-folder-path", (_, path) => {
            if (path?.lenght > 0)
                setCustomVersioningDirectory(path)
        })
    };

    const renderLanguageContent = () => (
        <div className="space-y-6">
            {/* Criterion Language */}
            <div className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-4 flex justify-end">
                    <Typography component="h3" className="text-[13px] font-semibold">
                        {t('preferences.language.criterionLanguage')}
                    </Typography>
                </div>
                <div className="col-span-8">
                    <div className="w-60 border border-grey-70 rounded-md">
                        <CustomSelect
                            value={criterionLanguage}
                            onValueChange={setCriterionLanguage}
                            items={languageOptions}
                            minWidth="192px"
                            triggerClassName="w-full border-none bg-transparent p-1"
                        />
                    </div>
                </div>
            </div>
            {/* Criterion Region */}
            <div className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-4 flex justify-end">
                    <Typography component="h3" className="text-[13px] font-semibold">
                        {t('preferences.language.criterionRegion')}
                    </Typography>
                </div>
                <div className="col-span-8">
                    <div className="w-60 border border-grey-70 rounded-md">
                        <CustomSelect
                            value={criterionRegion}
                            onValueChange={setCriterionRegion}
                            items={regionOptions}
                            minWidth="192px"
                            triggerClassName="w-full border-none bg-transparent p-1"
                        />
                    </div>
                </div>
            </div>
            {/* Date & Time format */}
            <div className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-4 flex justify-end">
                    <Typography component="h3" className="text-[13px] font-semibold">
                        {t('preferences.language.dateTimeFormat')}
                    </Typography>
                </div>
                <div className="col-span-8">
                    <div className="w-60 border border-grey-70 rounded-md ">
                        <CustomSelect
                            value={dateTimeFormat}
                            onValueChange={setDateTimeFormat}
                            items={dateTimeFormatOptions}
                            minWidth="192px"
                            triggerClassName="w-full border-none bg-transparent p-1"
                        />
                    </div>
                </div>
            </div>
        </div>
    );

    const renderEditingContent = () => (
        <div className="space-y-6">
            {/* Show history actions */}
            <div className="grid grid-cols-12 gap-4">
                <div className="col-span-4 flex justify-end">
                    <Typography component="h3" className="text-[13px] font-semibold mb-3">
                        {t('preferences.editing.showHistoryActions.title')}
                    </Typography>
                </div>
                <div className="col-span-8 ">
                    <div className="flex items-center gap-3 ">
                        <TextField
                            id="historyActionsCount"
                            type="number"
                            value={historyActionsCount}
                            onChange={(e) => setHistoryActionsCount(e.target.value)}
                            className="w-32 text-[13px] "
                            min="1"
                            max="100"
                        />
                    </div>
                    <Typography component="p" className="text-[11px] text-gray-600 mt-2">
                        {t('preferences.editing.showHistoryActions.description')}
                    </Typography>
                </div>
            </div>
        </div>
    );

    const renderContent = () => {
        switch (activeSection) {
            case 'general':
                return renderGeneralContent();
            case 'appearance':
                return renderAppearanceContent();
            case 'file':
                return renderFileContent();
            case 'language':
                return renderLanguageContent();
            case 'editing':
                return renderEditingContent();
            case 'account':
                return <div className="p-4">{t('preferences.comingSoon')}</div>;
            default:
                return renderGeneralContent();
        }
    };

    return (
        <div className="fixed inset-0">
            {/* Main Content Area with explicit height calculation */}
            <div className="h-[calc(100vh-3.5rem)] overflow-hidden">
                <SidebarProvider defaultOpen={true} style={{ height: 'calc(100vh - 3.5rem)' }}>
                    <Sidebar collapsible="offcanvas" style={{ height: 'calc(100vh - 3.5rem)' }} className="border-t border-grey-70 dark:border-grey-40">
                        <SidebarContent style={{ height: 'calc(100vh - 3.5rem)' }}>
                            <div className="h-full bg-grey-90 dark:bg-grey-20 border-r">
                                <div className="p-2 h-full overflow-y-auto">
                                    {sidebarItems.map((item) => (
                                        <div
                                            key={item.id}
                                            className={`
                                                    px-3 py-2 text-sm cursor-pointer rounded mb-1
                                                    ${activeSection === item.id
                                                    ? 'bg-primary-50 text-white font-medium'
                                                    : 'text-grey-10 dark:text-grey-90 hover:bg-gray-100 hover:dark:bg-grey-30'
                                                }`}
                                            onClick={() => setActiveSection(item.id)}
                                        >
                                            {item.label}
                                            {activeSection !== item.id && (
                                                <span className="float-right text-gray-400">›</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </SidebarContent>
                    </Sidebar>
                    <SidebarInset style={{ height: 'calc(100vh - 3.5rem)' }} className="flex flex-col">
                        <div className="flex-1 overflow-y-auto p-6 min-h-0">
                            {renderContent()}
                        </div>
                    </SidebarInset>
                </SidebarProvider>
            </div>

            {/* Fixed Footer */}
            <div className="absolute bottom-0 left-0 right-0 flex h-14 items-center gap-2 border-t bg-background px-3 z-50 bg-grey-90 dark:bg-grey-20">
                <div className="flex items-end justify-end gap-2 w-full">
                    <Button
                        key="cancel"
                        className="w-20"
                        size="mini"
                        intent="secondary"
                        variant="tonal"
                        onClick={async () => await window.application.closeChildWindow()}
                    >
                        {t('preferences.buttons.cancel')}
                    </Button>
                    <Button
                        key="reset"
                        className="w-32"
                        size="mini"
                        intent="primary"
                        variant="tonal"
                        onClick={handleReset}
                    >
                        {t('preferences.buttons.resetToDefault')}
                    </Button>
                    <Button
                        key="ok"
                        className="w-16"
                        size="mini"
                        intent="primary"
                        onClick={handleSave}
                    >
                        {t('preferences.buttons.ok')}
                    </Button>
                </div>
            </div>
        </div>
    )
};

const PreferencesPanelViewWithTheme = () => {
    return (
        <ThemeProvider>
            <PreferencesPanelView />
        </ThemeProvider>
    )
}

export default PreferencesPanelViewWithTheme;