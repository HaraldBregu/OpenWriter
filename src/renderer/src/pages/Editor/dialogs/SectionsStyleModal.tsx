import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { t } from 'i18next';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Select, SelectContent, SelectTrigger, SelectValue, SelectItem } from "@/components/ui/select";
import { useIpcRenderer } from '@/hooks/use-ipc-renderer';
import { fontSizes } from '@/utils/optionsEnums';
import Modal from "@/components/ui/modal";
import Button from "@/components/ui/button";
import TextField from "@/components/ui/textField";
import Typography from "@/components/Typography";
import Divider from "@/components/ui/divider";
import CustomSelect from "@/components/ui/custom-select";
import PlusCircle from "@/components/icons/PlusCircle";
import ColorToggleGroup from "@/components/color-group-toggle";
import TextAlignToggle from "@/components/text-align-toggle";
import SortableStylesList from "@/components/sortable-styles-list";
import { selectEnabledStyles } from '../store/editor-styles/editor-styles.selector';
import { updateStyles } from '../store/editor-styles/editor-styles.slice';


/**
 * @todo:
 * - Handle system font loading (with spinner, skeleton, or by preloading at app startup)
 * - Fix bug with empty or duplicate name: it becomes readonly
 */

interface SectionsStyleModalProps {
  open: boolean;
  onClose: () => void
}

function SectionsStyleModal({ open, onClose }: SectionsStyleModalProps) {
  const [localStyles, setLocalStyles] = useState<any[] | null>([]);
  const [style, setStyle] = useState<any | null>(null);
  const [fontsFamily, setFontsFamily] = useState<any[]>([]);
  const [exportedStyles, setExportedStyles] = useState<any | null>(null);
  const [selectedExportedStyleName, setSelectedExportedStyleName] = useState<any | null>(null);
  const originalNameRef = useRef<string | null>(null);

  const dispatch = useDispatch();

  const styles = useSelector(selectEnabledStyles)
    .map((style) => ({
      ...style,
      id: style.name,
      label: style.name,
    })) || [];


  useEffect(() => {
    if (styles && styles.length > 0) {
      setLocalStyles(styles);
      setStyle(styles[0]);
      originalNameRef.current = styles[0].name;
      // should check if folder styles contains this file.
      setSelectedExportedStyleName('default.stl')
    }
  }, []);

  useEffect(() => {
    fetchExportedStyles()
  }, [])

  useIpcRenderer((ipc) => {
    ipc.send('request-system-fonts');
    ipc.on('receive-system-fonts', (_: any, fonts: string[]) => {
      setFontsFamily(fonts);
    });
    return () => {
      ipc.off('receive-system-fonts');
    }
  }, [window.electron.ipcRenderer]);

  const exportedStylesOptions = useMemo(() => {
    return [
      ...(exportedStyles?.map((name) => ({
        value: name,
        label: <span className="text-[14px]">{name.split('.')[0]}</span>
      })) || [])
    ];
  }, [exportedStyles]);

  /** 
   * @todo: Temporary workaround to prevent the select from appearing empty due to font loading delay.
   * Remove this once font loading is handled properly.
  */
  const fontFamilyOptions = useMemo(() => fontsFamily.length === 0
    ? [style?.fontFamily]
    : fontsFamily
    , [fontsFamily, style])

  const fetchExportedStyles = async () => {
    try {
      const exported = (await window.doc.getStylesNames());
      setExportedStyles(exported);
    } catch (error) {
      console.error("Error fetching styles:", error);
      setExportedStyles([]);
    }
  };

  const handleSelectExportedFile = async (name: string) => {
    if (name === null) {
      setSelectedExportedStyleName(null);
      setLocalStyles(styles);
      setStyle(styles[0]);
      originalNameRef.current = styles[0].name;
      return;
    }

    const found = exportedStyles?.find(s => s === name);

    if (!found) return;

    setSelectedExportedStyleName(found);

    try {
      const styleData = await window.doc.getStyle(found);
      const enabledStyles = JSON.parse(styleData)
        .filter(s => s.enabled === true)
        .map(style => ({
          ...style,
          id: style.name,
          label: style.name,
        }));

      setLocalStyles(enabledStyles);
      if (enabledStyles.length > 0) {
        setStyle(enabledStyles[0]);
      }
    } catch (err) {
      console.log("err", err);
    }
  };

  const handleStyleChange = (font) => {
    setStyle(font);
    originalNameRef.current = font.name;
  }

  const handleSave = () => {
    const updatedStyles = localStyles?.map(({ id, label, ...rest }) => rest);
    dispatch(updateStyles(updatedStyles ?? []));
    window.doc.setStyles(updatedStyles ?? []);
    onClose();
  };

  const handleExport = async () => {
    const styles = localStyles?.map(({ id, label, ...rest }) => rest);
    await window.doc.createStyle(styles);
    fetchExportedStyles()
  }

  const handleImport = async () => {
    try {
      const styleName = await window.doc.importStyle();

      // Attendi che gli stili vengano caricati
      await fetchExportedStyles();

      if (styleName) {
        // Imposta il nome dello stile selezionato
        setSelectedExportedStyleName(styleName);

        try {
          // Carica il contenuto dello stile
          const exportedStyle = JSON.parse(await window.doc.getStyle(styleName));

          // Filtra e mappa gli stili abilitati
          const filteredStyles = exportedStyle
            .filter(s => s.enabled === true)
            .map(style => ({
              ...style,
              id: style.name,
              label: style.name,
            }));

          // Aggiorna gli stili locali e seleziona il primo
          setLocalStyles(filteredStyles);
          if (filteredStyles.length > 0) {
            setStyle(filteredStyles[0]);
            originalNameRef.current = filteredStyles[0].name;
          }
        } catch (parseErr) {
          console.error("Error parsing imported style:", parseErr);
        }
      }
    } catch (err) {
      console.error("Error during import:", err);
    }
  };

  const handleAdd = async () => {
    const baseName = "New Style";
    const existingNames = localStyles?.map(style => style.name) || [];

    let newName = baseName;
    let counter = 0;
    while (existingNames.includes(newName)) {
      counter++;
      newName = `${baseName} ${counter}`;
    }

    const newStyle = {
      id: newName,
      label: newName,
      type: "CUSTOM",
      enabled: true,
      name: newName,
      fontSize: "12pt",
      fontWeight: "normal",
      fontFamily: "Times New Roman",
      color: "#000000",
      align: "left",
      lineHeight: "1",
      marginTop: "0pt",
      marginBottom: "0pt"
    };

    // Trova l'indice dell'elemento selezionato
    const selectedIndex = localStyles?.findIndex(s => s.id === style?.id) ?? -1;

    // Se non c'è selezione o non viene trovata, aggiungi alla fine
    // Altrimenti, inserisci dopo l'elemento selezionato
    const insertIndex = selectedIndex === -1 ? (localStyles?.length ?? 0) : selectedIndex + 1;

    const newList = [...(localStyles ?? [])];
    newList.splice(insertIndex, 0, newStyle);

    setLocalStyles(newList);
    handleStyleChange(newStyle);
  }

  const handleTitleBlur = () => {
    const name = style?.name?.trim();
    const duplicate = localStyles?.find(s => s.name === name && s.id !== style.id);

    if (!name || duplicate) {
      if (duplicate) {
        alert(`A style named "${name}" already exists.`);
      }
      const fallback = originalNameRef.current;
      if (fallback) {
        const restored = { ...style, name: fallback, label: fallback };
        setStyle(restored);
        setLocalStyles(prev => prev?.map(s => s.id === style.id ? restored : s) || []);
      }
      return;
    }

    const updated = { ...style, label: name };
    originalNameRef.current = name;
    setStyle(updated);
    setLocalStyles(prev => prev?.map(s => s.id === style.id ? updated : s) || []);
  }

  const updateStyleProperty = (property: string, value: any) => {
    const updatedStyle = { ...style, [property]: value };
    setStyle(updatedStyle);
    setLocalStyles((prevStyles) =>
      prevStyles?.map((s) => (s.id === style?.id ? updatedStyle : s)) || []
    );
  };


  return (
    <Modal
      isOpen={open}
      title={t("sections_styles_dialog.title")}
      className="max-w-[880px] max-h-[90%] flex flex-col !m-2 !p-0"
      contentClassName="!p-0 my-[-15px] h-full"
      onOpenChange={() => { }}
      actions={[
        <Button
          key="cancel"
          className="w-24"
          size="mini"
          intent="secondary"
          variant="tonal"
          onClick={onClose}
        >
          {t("sections_styles_dialog.cancel")}
        </Button>,
        <Button
          key="export-style"
          className="w-24"
          size="mini"
          intent="primary"
          variant="tonal"
          onClick={handleExport}
        >
          {t("sections_styles_dialog.export_style")}
        </Button>,
        <Button
          key="done"
          className="w-24"
          size="mini"
          intent="primary"
          onClick={handleSave}
        >
          {t("sections_styles_dialog.done")}
        </Button>
      ]}>
      <ResizablePanelGroup direction="horizontal" className="h-full">
        <ResizablePanel minSize={33} defaultSize={33}>
          <div className="h-[433px] px-[10px]">
            <div className="flex justify-between mb-[14px] mt-[13px]">
              <CustomSelect
                disabled={!exportedStyles || exportedStyles.length === 0}
                placeholder={t("sections_styles_dialog.styles_section.select_style")}
                value={selectedExportedStyleName}
                onValueChange={handleSelectExportedFile}
                ariaLabel={t("sections_styles_dialog.styles_section.select_style")}
                triggerClassName="w-[135px]"
                showSeparators={true}
                items={exportedStylesOptions}
              />
              <Button
                key="Import styles"
                className="w-24"
                size="mini"
                intent="primary"
                onClick={handleImport}
              >
                {t("sections_styles_dialog.styles_section.import_style")}
              </Button>
            </div>
            <div className="flex justify-end mb-1">
              <Button
                key="add"
                size="small"
                intent={"secondary"}
                variant="outline"
                className="!p-[6px] h-[24px] w-[58px] align-end"
                onClick={handleAdd}
              >
                <PlusCircle className="w-[16px] h-[16px] mr-[-6px]" />
                {t("sections_styles_dialog.styles_section.add")}
              </Button>
            </div>
            <SortableStylesList
              styles={localStyles || []}
              selectedStyle={style}
              onStylesChange={(newFonts) => setLocalStyles(newFonts)}
              onStyleSelect={handleStyleChange}
            />
          </div>
        </ResizablePanel>
        <ResizableHandle tabIndex={-1} />
        <ResizablePanel minSize={50} defaultSize={66}>
          <div className="w-full h-[433px] pt-[24px] px-[24px] flex gap-4 flex-col overflow-y-auto"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}>
            <TextField
              id="title"
              type="text"
              label={t("sections_styles_dialog.name")}
              className="!bg-white !mx-0"
              value={style?.name || ""}
              onChange={(e) => updateStyleProperty("name", e.target.value)}
              onBlur={handleTitleBlur}
              autoFocus
            />

            <Typography component="h2" className="-mb-[10px] -mt-[12px]">
              <span className="text-lg font-bold">{t("sections_styles_dialog.typography_section.typography")}</span>
            </Typography>

            {/* @FIXME: this classname has 2 classes with the same name */}
            <div className="flex gap-2 flex flex-wrap">
              <div>
                <div>
                  <Typography component="p" className="ml-2 mb-[10px] text-[12px] font-semibold ">{t("sections_styles_dialog.typography_section.font")}</Typography>
                </div>
                <Select
                  value={style?.fontFamily ?? "Times New Roman"}
                  onValueChange={(value) => updateStyleProperty("fontFamily", value)}
                >
                  <SelectTrigger className="w-[184px] shadow-none focus:ring-0 focus:ring-offset-0 font-[400] text-[14px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fontFamilyOptions.map((ff) => (
                      <SelectItem value={ff} key={ff}>
                        {ff}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div >
                  <Typography component="p" className="ml-2 mb-[10px] text-[12px] font-semibold">{t("sections_styles_dialog.typography_section.style")}</Typography>
                </div>
                <Select
                  value={style?.fontWeight ?? ""}
                  onValueChange={(value) => updateStyleProperty("fontWeight", value)}
                >
                  <SelectTrigger className="w-[92px] shadow-none focus:ring-0 focus:ring-offset-0 font-[400] text-[14px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['bold', 'italic', 'normal'].map((type, index) => (
                      <SelectItem
                        className="font-thin text-grey-10"
                        value={type}
                        key={`${type}-${index}`}>
                        <span> {type}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div>
                  <Typography component="p" className="ml-2 mb-[10px] text-[12px] font-semibold">{t("sections_styles_dialog.typography_section.size")}</Typography>
                </div>
                <Select
                  onValueChange={(value) => updateStyleProperty("fontSize", value + "pt")}
                  value={style?.fontSize.split('pt')[0] ?? ""}
                >
                  <SelectTrigger className="w-[64px] shadow-none focus:ring-0 focus:ring-offset-0 font-[400] text-[14px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fontSizes.map((value, index) => (
                      <SelectItem
                        className="font-thin text-grey-10"
                        value={value.toString().split('pt')[0]}
                        key={`${value}-${index}`}>
                        <span> {value}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div>
                  <Typography component="p" className="ml-2 mb-[10px] text-[12px] font-semibold">{t("sections_styles_dialog.typography_section.align")}</Typography>
                </div>
                <TextAlignToggle value={style?.align} onChange={(value) => updateStyleProperty("align", value)} />
              </div>
              <div>
                <ColorToggleGroup
                  value={style?.color}
                  onChange={(value) => updateStyleProperty("color", value)} />
              </div>
            </div>

            <Divider orientation="horizontal" className="my-[-2px]"></Divider>

            <Typography component="h2" className="-mb-[12px] mt-[-2px]">
              <span className="text-lg font-bold">{t("sections_styles_dialog.spacing_section.spacing")}</span>
            </Typography>
            <div className="flex gap-2 flex-wrap">
              <TextField
                value={style?.lineHeight?.split('pt')[0] ?? ""}
                id="line-spacing"
                className="w-[120px] !bg-white"
                type="number"
                label={t("sections_styles_dialog.spacing_section.line_spacing")}
                decimals={1}
                min={1}
                max={5}
                onChange={(e) => updateStyleProperty("lineHeight", e.target.value)}
              />
              <TextField
                value={style?.marginTop?.split('pt')[0] ?? ""}
                id="line-spacing"
                className="w-[120px] !bg-white"
                type="number"
                label={t("sections_styles_dialog.spacing_section.before_paragraph")}
                min={1}
                max={50}
                onChange={(e) => updateStyleProperty("marginTop", e.target.value)}
              />
              <TextField
                value={style?.marginBottom?.split('pt')[0] ?? ""}
                id="line-spacing"
                className="w-[120px] !bg-white"
                type="number"
                label={t("sections_styles_dialog.spacing_section.after_paragraph")}
                min={1}
                max={50}
                onChange={(e) => updateStyleProperty("marginBottom", e.target.value)}
              />
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </Modal>
  );
}

export default SectionsStyleModal;