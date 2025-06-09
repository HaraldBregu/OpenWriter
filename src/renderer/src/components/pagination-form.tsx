import { useEffect, useMemo, memo } from "react";
import Divider from "./ui/divider";
import { useTranslation } from "react-i18next";
import AppRadioGroup from "./app-radiogroup";
import Typography from "./Typography";
import TextField from "./ui/textField";
import { Check } from "lucide-react";
import AppCheckbox from "./app-checkbox";
import { HeaderContentType, HeaderDisplayMode } from "@/utils/headerEnums";
import { HeaderSettings } from "@/pages/editor/store/pagination/pagination.slice";

/**
 * Componente memoizzato per la selezione del punto di inizio
 */
const StartingPoint = memo(({
    displayMode,
    startFromPage = 1,
    onChange
}: {
    displayMode: HeaderDisplayMode,
    startFromPage?: number,
    onChange: (value: number) => void
}) => {
    const isStartMode = displayMode === HeaderDisplayMode.FROM_SPECIFIC_PAGE;

    return (
        <TextField
            id="starting-point"
            type="number"
            className={`w-full sm:w-[4.5em] h-[1.75em] ${!isStartMode ? 'opacity-50' : ''}`}
            value={startFromPage.toString()}
            onChange={(e) => {
                if (isStartMode) {
                    onChange(parseInt(e.target.value) || 1);
                }
            }}
            disabled={!isStartMode}
        />
    );
});

/**
 * Componente memoizzato per le opzioni di visualizzazione
 */
const ShowOptions = memo(({
    settings,
    setSettings
}: {
    settings: HeaderSettings,
    setSettings: (settings: HeaderSettings) => void
}) => {
    const { t } = useTranslation();

    const handleSelectSection = (section: number, checked: boolean) => {
        // Gestisce sia il caso in cui onCheckedChange riceve un valore booleano
        const currentSections = settings.sectionsToShow || [];
        const valueExists = currentSections.includes(section);

        let newSections;
        if (checked && !valueExists) {
            newSections = [...currentSections, section];
        } else if (!checked && valueExists) {
            newSections = currentSections.filter(s => s !== section);
        } else {
            newSections = currentSections;
        }

        setSettings({
            ...settings,
            sectionsToShow: newSections
        });
    }

    return (
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
            <div className="flex-1">
                <AppRadioGroup
                    items={[
                        { label: t('headerFooter.show.none'), value: HeaderDisplayMode.NONE.toString(), className: "text-[0.8125em] font-[600]" },
                        { label: t('headerFooter.show.firstPage'), value: HeaderDisplayMode.FIRST_PAGE_ONLY.toString(), className: "text-[0.8125em] font-[600]" },
                        {
                            label: <div className="flex flex-row gap-2 items-center">
                                {t('headerFooter.show.fromPage')}
                                <StartingPoint
                                    displayMode={settings.displayMode}
                                    startFromPage={settings.startFromPage}
                                    onChange={(value) => setSettings({ ...settings, startFromPage: value })}
                                />
                            </div>,
                            value: HeaderDisplayMode.FROM_SPECIFIC_PAGE.toString(),
                            className: "text-[0.8125em] font-[600]"
                        },
                        { label: t('headerFooter.show.allSections'), value: HeaderDisplayMode.ALL_SECTIONS.toString(), className: "text-[0.8125em] font-[600]" },
                    ]}
                    value={(settings.displayMode ?? HeaderDisplayMode.NONE).toString()}
                    onValueChange={(value) => {
                        const newValue = parseInt(value);
                        setSettings({
                            ...settings,
                            displayMode: newValue,
                            startFromPage: newValue === HeaderDisplayMode.FROM_SPECIFIC_PAGE ? (settings.startFromPage || 1) : undefined,
                            sectionsToShow: undefined
                        });
                    }}
                />
            </div>
            <div className="flex-1">
                <AppRadioGroup
                    itemClassName="items-start"
                    items={[
                        {
                            label: (
                                <div className="flex flex-col gap-2">
                                    <span className="text-[0.8125em] font-[600]">{t('headerFooter.show.selectedSections')}</span>
                                    <div className="flex flex-col gap-1 ml-2 mt-1">
                                        {[
                                            { label: t('headerFooter.show.toc'), value: 1 },
                                            { label: t('headerFooter.show.intro'), value: 2 },
                                            { label: t('headerFooter.show.crt'), value: 3 },
                                            { label: t('headerFooter.show.biblio'), value: 4 }
                                        ].map(section => (
                                            <AppCheckbox
                                                key={section.value}
                                                id={`section-${section.value}`}
                                                label={section.label}
                                                checked={settings.sectionsToShow?.includes(section.value) || false}
                                                onCheckedChange={(checked) => handleSelectSection(section.value, checked)}
                                                disabled={settings.displayMode !== HeaderDisplayMode.SELECTED_SECTIONS}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ),
                            value: HeaderDisplayMode.SELECTED_SECTIONS.toString(),
                            className: "text-[0.8125em] font-[600]"
                        },
                    ]}
                    value={(settings.displayMode ?? HeaderDisplayMode.NONE).toString()}
                    onValueChange={(value) => {
                        const newValue = parseInt(value);
                        setSettings({
                            ...settings,
                            displayMode: newValue,
                            startFromPage: undefined,
                            sectionsToShow: newValue === HeaderDisplayMode.SELECTED_SECTIONS ? (settings.sectionsToShow || [1, 2, 3, 4]) : undefined
                        });
                    }}
                />
            </div>
        </div>
    );
});

/**
 * Componente per una singola posizione (colonna)
 */
const PositionColumn = memo(({
    position,
    options,
    value,
    onChange
}: {
    position: { key: string, label: string },
    options: Array<{ label: string, value: string }>,
    value: HeaderContentType,
    onChange: (value: string) => void
}) => {
    return (
        <div className="flex flex-col">
            <Typography component="h6" className="text-[0.8125em] font-[600] mb-2">{position.label}</Typography>
            <div className="bg-grey-90 rounded-lg shadow-sm border border-secondary-85 p-1 h-full">
                <div className="space-y-1">
                    {options.map((option) => {
                        const isSelected = value.toString() === option.value;

                        return (
                            <div
                                key={option.value}
                                className="flex items-center px-3 py-1.5 hover:bg-primary hover:text-white rounded-md cursor-pointer text-[0.875em] font-[400] group"
                                onClick={() => onChange(option.value)}
                            >
                                <div className="w-5 flex-shrink-0">
                                    {isSelected && (
                                        <Check className="h-4 w-4 text-grey-30 group-hover:text-white" />
                                    )}
                                </div>
                                <div className="flex-grow">{option.label}</div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
});

/**
 * Componente principale per la configurazione della paginazione
 */
const PaginationSetup = ({ settings, setSettings }: PaginationSetupProps) => {
    const { t } = useTranslation();

    useEffect(() => {
        console.log("🚀 ~ PaginationSetup ~ settings:", settings)
    }, [settings]);

    // Memorizza le opzioni per evitare ricreazioni ad ogni render
    const positionOptions = useMemo(() => [
        { label: t('headerFooter.position.options.none'), value: HeaderContentType.NONE.toString() },
        { label: t('headerFooter.position.options.pageNumber'), value: HeaderContentType.PAGE_NUMBER.toString() },
        { label: t('headerFooter.position.options.date'), value: HeaderContentType.DATE.toString() },
        { label: t('headerFooter.position.options.dateTime'), value: HeaderContentType.DATE_TIME.toString() },
        { label: t('headerFooter.position.options.author'), value: HeaderContentType.AUTHOR.toString() },
        { label: t('headerFooter.position.options.title'), value: HeaderContentType.TITLE.toString() },
    ], [t]);

    // Memorizza le posizioni per evitare ricreazioni ad ogni render
    const positions = useMemo(() => [
        { key: 'leftContent', label: t('headerFooter.position.left') },
        { key: 'centerContent', label: t('headerFooter.position.center') },
        { key: 'rightContent', label: t('headerFooter.position.right') }
    ], [t]);

    // Gestore per la selezione delle opzioni in ciascuna posizione
    const handleSelect = (positionKey: 'leftContent' | 'centerContent' | 'rightContent', optionValue: string) => {
        setSettings({
            ...settings,
            [positionKey]: parseInt(optionValue) as HeaderContentType
        });
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-1">
                    <Typography component="h6" className="text-[1.125em] font-bold">
                        {t('headerFooter.show.label')}
                    </Typography>
                </div>
                <ShowOptions settings={settings} setSettings={setSettings} />
            </div>
            <Divider orientation="horizontal" />
            <div className="flex flex-col gap-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full">
                    {positions.map((position) => (
                        <PositionColumn
                            key={position.key}
                            position={position}
                            options={positionOptions}
                            value={settings[position.key as 'leftContent' | 'centerContent' | 'rightContent'] ?? HeaderContentType.NONE}
                            onChange={(value) => handleSelect(position.key as 'leftContent' | 'centerContent' | 'rightContent', value)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PaginationSetup;