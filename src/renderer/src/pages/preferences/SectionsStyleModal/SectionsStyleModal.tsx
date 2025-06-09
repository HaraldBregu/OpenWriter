import { useEffect, useMemo, useRef, useState } from 'react';
import { Typography as MUITypography } from "@mui/material";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Select, SelectContent, SelectTrigger, SelectValue, SelectItem } from "@/components/ui/select";
import { useIpcRenderer } from '@/hooks/use-ipc-renderer';
import { fontSizes } from '@/utils/optionsEnums';
import Modal from "@/components/ui/modal";
import Button from "@/components/ui/button";
import TextField from "@/components/ui/textField";
import Typogaphy from "@/components/Typography";
import Divider from "@/components/ui/divider";
import CustomSelect from "@/components/ui/custom-select";
import PlusCircle from "@/components/icons/PlusCircle";
import ColorToggleGroup from "./components/color-group-toggle";
import TextAlignToggle from "./components/text-align-toggle";
import SortableFontList from "./components/sortable-font-list";
import { useDispatch, useSelector } from 'react-redux';
import { selectStyles } from '../store/editor-styles/editor-styles.selector';
import { updateStyles } from '../store/editor-styles/editor-styles.slice';
interface SectionsStyleModalProps {
  open: boolean;
  onClose: () => void
}

/**
 * @todo:
 * - Gestire il caricamento dei font di sistema (con spinner o skeleton, o precaricandoli all'avvio dell'app)
 * - Gestire l'importazione (da template tml, file critx e file di stili) ed esportazione degli stili
 * - Gestire la visualizzazione degli stili nella dropdown del menu principale
 * - Gestire aggiunta colori personalizzati tramite color picker
 * - Gestiore l'aggiunta, copia e rimozione degli stili
 * - Aggiornare la gestione degli stili:
 *  *   - Aggiungere gli altri stili di default
 *  *   - I toc headings (H1, H2, H3, ecc.) non sono visibili nella lista degli stili (ne modificabili) ma venono applicati automaticamente
 *  *   - Gli stili di default (20) sono modificabili e copiabili, ma non eliminabili
 * *    - Header and Footer, Notes and Body non sono visibili nella lista degli stili, ma sono applicati automaticamente
 *      - Notes viene applicato automaticamente al testo delle note, ma è visibile nella lista degli stili e modificabile (controllare quali altri stili sono visibili nella lista) e quali nella select
 * - Gestire tutti gli stili di default nell' initial state di redux
 * - Sistemare le discrepenze css del pannello di destra (padding, margin, ecc.)
 * - Gestire la persistenza degli stili modificati
 * - Refactoring del codice: spostare componenti riusabili in components
 * - Sistemare la struttura redux delle preferences
 * - Includere le traduzioni per tutti i testi
 */

function SectionsStyleModal({ open, onClose }: SectionsStyleModalProps) {
  const [localStyles, setLocalStyles] = useState<any[] | null>([]);
  const [style, setStyle] = useState<any | null>(null);
  const [templates, setTemplates] = useState<any[] | null>(null);
  const [template, setTemplate] = useState<any | null>(null);
  const [fontsFamily, setFontsFamily] = useState<any[]>([]);
  const originalNameRef = useRef<string | null>(null);

  const dispatch = useDispatch();

  const styles = useSelector(selectStyles)?.map((style) => ({
    ...style,
    id: style.name,
    label: style.name,
  })) || []


  useEffect(() => {
    if (styles && styles.length > 0) {
      setLocalStyles(styles);
      setStyle(styles[0]);
      originalNameRef.current = styles[0].name;
    }
  }, []);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const templates = (await window.doc.getTemplates()).map((t) => JSON.parse(t));
        setTemplates(templates);
      } catch (error) {
        console.error("Error fetching templates:", error);
        setTemplates([]);
      }
    };
    fetchTemplates();
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


  const handleSave = () => {
    dispatch(updateStyles(localStyles ?? []));
    window.doc.setStyles(styles);
    onClose();
  };

  const templateOptions = useMemo(() => {
    return templates?.map((template) => ({
      value: template.name,
      label: <span className="text-[14px]">{template.name}</span>
    })) || []
  }, [templates]);

  return (
    <Modal
      isOpen={open}
      title={"Sections Style"}
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
          {"Cancel"}
        </Button>,
        <Button
          key="export-style"
          className="w-24"
          size="mini"
          intent="primary"
          variant="tonal"
          onClick={() => { }}
        >
          {"Export style"}
        </Button>,
        <Button
          key="done"
          className="w-24"
          size="mini"
          intent={"primary"}
          onClick={handleSave}
        >
          {"Done"}
        </Button>
      ]}>
      <ResizablePanelGroup direction="horizontal" className="h-full">
        <ResizablePanel minSize={33} defaultSize={33}>
          <div className="h-[433px] px-[10px]">
            <div className="flex justify-between mb-[14px] mt-[13px]">
              <CustomSelect
                disabled={!templates || templates.length === 0}
                placeholder={"Select a template"}
                value={template?.name}
                onValueChange={(name: string) => {
                  const found = templates?.find(t => t.name === name);
                  if (found) { setTemplate(found) };
                }}
                ariaLabel="Select a template"
                triggerClassName="w-[135px]"
                showSeparators={true}
                items={templateOptions}
              />
              <Button
                key="Import style"
                className="w-24"
                size="mini"
                intent="primary"
                onClick={() => { }}
              >
                {"Import style"}
              </Button>
            </div>
            <div className="flex justify-end mb-1">
              <Button
                key="add"
                size="small"
                intent={"secondary"}
                variant="outline"
                className="!p-[6px] h-[24px] w-[58px] align-end"
                onClick={() => { }}
              >
                <PlusCircle className="w-[16px] h-[16px] mr-[-6px]" />
                Add
              </Button>
            </div>
            <SortableFontList
              fonts={localStyles || []}
              selectedFont={style}
              onFontsChange={(newFonts) => setLocalStyles(newFonts)}
              onFontSelect={(font) => {
                setStyle(font);
                originalNameRef.current = font.name;
              }}
            />
          </div>
        </ResizablePanel>
        <ResizableHandle tabIndex={-1} />
        <ResizablePanel minSize={50} defaultSize={66}>
          <div className="w-full h-[438px] p-[24px] flex gap-4 flex-col overflow-y-auto"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}>
            <TextField
              id="title"
              type="text"
              label="Name"
              className="!bg-white"
              value={style?.name || ""}
              onChange={(e) => {
                const updatedStyle = { ...style, name: e.target.value, label: e.target.value };
                setStyle(updatedStyle);
                setLocalStyles(prev =>
                  prev?.map(s => s.id === style.id ? updatedStyle : s) || []
                );
              }}
              onBlur={() => {
                const name = style?.name?.trim();

                if (!name) {
                  const fallback = originalNameRef.current;
                  if (fallback) {
                    const restored = { ...style, name: fallback, label: fallback };
                    setStyle(restored);
                    setLocalStyles(prev => prev?.map(s => s.id === style.id ? restored : s) || []);
                  }
                  return;
                }

                const duplicate = localStyles?.find(s => s.name === name && s.id !== style.id);
                if (duplicate) {
                  alert(`A style named "${name}" already exists.`);
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
              }}
            />
           
            <div className="flex gap-2 flex flex-wrap">
              <div>
                <div>
                  <Typogaphy component="p" className="ml-2 mb-1 text-[12px] font-semibold">{"Font"}</Typogaphy>
                </div>
                <Select
                  value={style?.fontFamily ?? ""}
                  onValueChange={(value) => {
                    const updatedStyle = { ...style, fontFamily: value };
                    setStyle(updatedStyle);
                    setLocalStyles((prevStyles) => prevStyles?.map(s => s.id === style?.id ? updatedStyle : s) || []);
                  }}
                >
                  <SelectTrigger className="w-[184px] shadow-none focus:ring-0 focus:ring-offset-0 font-[400] text-[14px]">
                    <SelectValue placeholder="Choose font" />
                  </SelectTrigger>
                  <SelectContent>
                    {fontsFamily.map((ff) => (
                      <SelectItem value={ff} key={ff}>
                        {ff}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div >
                  <Typogaphy component="p" className="ml-2 mb-1 text-[12px] font-semibold">{"Style"}</Typogaphy>
                </div>
                <Select
                  value={style?.fontWeight ?? ""}
                  onValueChange={(value) => {
                    const updatedStyle = { ...style, fontWeight: value };
                    setStyle(updatedStyle);
                    setLocalStyles((prevStyles) => prevStyles?.map(s => s.id === style?.id ? updatedStyle : s) || []);
                  }}
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
                  <Typogaphy component="p" className="ml-2 mb-1 text-[12px] font-semibold">{"Size"}</Typogaphy>
                </div>
                <Select
                  onValueChange={(value) => {
                    const updatedStyle = { ...style, fontSize: value + "pt" };
                    setStyle(updatedStyle);
                    setLocalStyles((prevStyles) => prevStyles?.map(s => s.id === style?.id ? updatedStyle : s) || []);
                  }}
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
                  <Typogaphy component="p" className="ml-2 mb-1 text-[12px] font-semibold">{"Align"}</Typogaphy>
                </div>
                <TextAlignToggle value={style?.align} onChange={(value) => {
                  const updatedStyle = { ...style, align: value };
                  setStyle(updatedStyle);
                  setLocalStyles((prevStyles) => prevStyles?.map(s => s.id === style?.id ? updatedStyle : s) || []);
                }} />
              </div>
              <div>

                <ColorToggleGroup value={style?.color} onChange={(value) => {
                  const updatedStyle = { ...style, color: value };
                  setStyle(updatedStyle);
                  setLocalStyles((prevStyles) => prevStyles?.map(s => s.id === style?.id ? updatedStyle : s) || []);
                }}></ColorToggleGroup>
              </div>
            </div>
            <Divider orientation="horizontal"></Divider>

            <MUITypography component="h2">
              <span className="text-lg font-bold">{"Spacing"}</span>
            </MUITypography>
            <div className="flex gap-2 flex-wrap">
              <TextField
                value={style?.lineHeight?.split('pt')[0] ?? ""}
                id="line-spacing"
                className="w-[120px] !bg-white"
                type="number"
                label={"Line Spacing"}
                min={1}
                max={5}
                onChange={(e) => {
                  const updatedStyle = { ...style, lineHeight: e.target.value };
                  setStyle(updatedStyle);
                  setLocalStyles((prevStyles) => prevStyles?.map(s => s.id === style?.id ? updatedStyle : s) || []);
                }}
              />
              <TextField
                value={style?.marginTop?.split('pt')[0] ?? ""}
                id="line-spacing"
                className="w-[120px] !bg-white"
                type="number"
                label={"Before Paragraph"}
                min={1}
                max={50}
                onChange={(e) => {
                  const updatedStyle = { ...style, marginTop: e.target.value };
                  setStyle(updatedStyle);
                  setLocalStyles((prevStyles) => prevStyles?.map(s => s.id === style?.id ? updatedStyle : s) || []);
                }}
              />
              <TextField
                value={style?.marginBottom?.split('pt')[0] ?? ""}
                id="line-spacing"
                className="w-[120px] !bg-white"
                type="number"
                label={"After Paragraph"}
                min={1}
                max={50}
                onChange={(e) => {
                  const updatedStyle = { ...style, marginBottom: e.target.value };
                  setStyle(updatedStyle);
                  setLocalStyles((prevStyles) => prevStyles?.map(s => s.id === style?.id ? updatedStyle : s) || []);
                }}
              />
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </Modal>
  );
}

export default SectionsStyleModal;