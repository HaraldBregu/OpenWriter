import Typography from "@components/Typography";
import { Accordion } from "@/components/ui/accordion";
import { Reducer, useEffect, useMemo, useReducer, useState } from "react";
import { SortableArea } from "@components/drag-drop-area";
import PageSetup from "./components/page-setup";
import { defaultLayout, sectionLayouts, settingsLayout } from "./constants";
import {
  selectLayoutSettings,
  selectLayoutStandardPageDimensions,
  selectLayoutAvailableApparatusTypes,
} from "../store/layout/layout.selector";
import { useTranslation } from "react-i18next";
import AppRadioGroup from "@/components/app-radiogroup";
import PageVisibilityElements from "./components/page-visibility-elements";
import LayoutShape from "./components/layout-shape";
import PageLayoutAccordion from "./components/page-layout-accordion";
import TextContentManagement from "./components/text-content-management";
import Button from "@/components/ui/button";
import { useDispatch, useSelector } from "react-redux";
import { updateSetupPageState } from "../store/layout/layout.sclice";
import {AvailableApparatusTypes} from "../store/layout/layout.state";
import Modal from "@/components/ui/modal";
import colors from "../../../../../../tailwindColors.json";
import LayoutShapeText from "./components/layout-shape-text";
import { converterFromEditorToSetup, converterFromSetupToEditor } from "@/utils/optionsEnums";

interface PageSetupDialogProps {
  open: boolean;
  onClose: (data: PageSetupInterface) => void;
  onSave: (data: any) => void;
  visibleApparatuses: Apparatus[];
}

export function PageSetupDialog({ open, onClose, onSave, visibleApparatuses }: PageSetupDialogProps) {
  const { setupDialogState, setupOption, sort } =
    useSelector(selectLayoutSettings);
  const standardPageDimensions = useSelector(
    selectLayoutStandardPageDimensions
  );
  const availableApparatusTypes = useSelector(
    selectLayoutAvailableApparatusTypes
  );


  const [orderedItms, setOrderedItms] = useState<SetupDialogStateKeys[]>(sort);
  const [curSection, setCurSection] = useState<string>("");
  const [optSetup, setOptSetup] = useState<SetupOptionType>(setupOption);

  const [includedElements, setIncludedElements] = useReducer<
    Reducer<
      SetupDialogStateType,
      { type: string; posi: string; payload: unknown }
    >
  >(
    (state, action) => ({
      ...state,
      [action.posi]: {
        ...state[action.posi],
        [action.type]: action.payload,
      },
    }),
    {
      ...setupDialogState, critical: {
        visible: setupDialogState.critical.visible || true,
        layout: setupDialogState.critical.layout || defaultLayout,
        apparatusDetails: [
          {
            id: 'element1',
            title: 'Text',
            sectionType: "text",
            type: 'text',
            columns: 1,
            disabled: true,
            visible: true
          },
          ...visibleApparatuses.map(app => ({
            ...app,
            id: app.id,
            type: "apparatus",
            sectionType: converterFromEditorToSetup(app.type),
            columns: setupDialogState.critical.apparatusDetails.find(({id})=>{console.log('id setupDialog: ', id, '   id apparatus: ', app.id);(id===app.id)})?.columns ?? 1,
            visible: app.visible,
            disabled: app.disabled || false,
          }))
        ],
        required: setupDialogState.critical.required || false,
      }
    }
  );

  const { template_type } = optSetup || {};
  const isReadonly = template_type === "Community";
  const [availableApparatusTypesState, setavailableApparatusTypesState] =
    useState<AvailableApparatusTypes>(availableApparatusTypes);

  const { layout: curLayout = defaultLayout, apparatusDetails } =
    includedElements?.[curSection] || {};

  const [textColDetails, ...apparatusColDetails] = useMemo(
    () => apparatusDetails || [],
    [apparatusDetails]
  );
  const layouts = sectionLayouts[curSection] || [];

  const dispatch = useDispatch();

  const { t } = useTranslation();

  const checkboxChangeHdlr = (posi, payload) =>
    setIncludedElements({ type: "visible", posi, payload });

  const cancelButnClickHdlr = () => onClose({
    pageSetup: setupOption,
    sort: sort,
    layoutTemplate: setupDialogState,
  });

  const saveBtnClickHdlr = () => {
    const apparatusList = includedElements.critical.apparatusDetails.filter(
      (el) => el.type !== "text"
    );

    const apparatusPayload = apparatusList.map((app) => ({
      id: includedElements.critical.apparatusDetails.find(({title})=>title === app.title).id,
      title: app.title,
      type: converterFromSetupToEditor(app.sectionType),
      visible: app.visible,
      disabled: app.disabled
    }));

    const setupPayload = {
      setupDialogState: includedElements,
      sort: orderedItms,
      setupOption: optSetup,
    };

    onSave(apparatusPayload);
    dispatch(updateSetupPageState(setupPayload));
    onClose({
      pageSetup: optSetup,
      sort: orderedItms,
      layoutTemplate: includedElements,
    });
  };

  useEffect(() => {
    setavailableApparatusTypesState(settingsLayout[curLayout]);
  }, [curLayout]);


  return (
    <>
      <Modal
        title={t("pageSetup.title")}
        isOpen={open}
        onOpenChange={() => { }}
        className="flex flex-col w-full xl:max-w-[80vw] max-w-[98vw] h-[98%] xl:h-[90%] overflow-hidden !gap-0"
        actions={[
          <Button
            key="cancel"
            className="w-24 items-center justify-center"
            size="mini"
            intent={"secondary"}
            variant={"tonal"}
            onClick={cancelButnClickHdlr}
          >
            {t("buttons.cancel")}
          </Button>,
          <Button
            key="save"
            className="w-24 items-center justify-center"
            size="mini"
            intent={"primary"}
            onClick={saveBtnClickHdlr}
            disabled={isReadonly}
          >
            {t("buttons.save")}
          </Button>,
        ]}
        contentClassName="!overflow-y-auto h-full !p-0"
        headerClassName="h-[8vh]"
        footerClassName="!flex-1 items-center h-[8vh]"
      >
        <div className="flex flex-2 flex-row justify-between bg-gray-100 overflow-y-hidden h-full min-w-[20vw]" >
          <div
            className="flex w-[259px] pt-5 pb-5 pl-[12px] pr-[12px] overflow-auto flex-col bg-white h-full"
            style={{ msOverflowStyle: "none", scrollbarWidth: "none" }}
          >
            <div>
              <Typography component="h4" className="border-b pb-6">
                {t("pageSetup.component.configurationSubtitle")}
              </Typography>
            </div>
            <div className="flex flex-col">
              <Accordion type="single" collapsible>
                <PageVisibilityElements
                  orderedItms={sort}
                  includedElements={includedElements}
                  checkboxChangeHdlr={checkboxChangeHdlr}
                  readonly={isReadonly}
                />
                <PageSetup
                  exportSetup={setOptSetup}
                  initialSetup={setupOption}
                  readonly={isReadonly}
                  standardPageDimensions={standardPageDimensions}
                />
              </Accordion>
            </div>
          </div>
          <div className="flex w-[532px] justify-center p-5 overflow-y-auto" style={{ msOverflowStyle: "none", scrollbarWidth: "none" }}>
            <SortableArea<SetupDialogStateKeys>
              includedElements={includedElements}
              itemLs={orderedItms}
              readSorted={setOrderedItms}
              readonly={isReadonly}
              wrapper={(x) => (
                <Accordion
                  type="single"
                  className="!p-0 flex flex-col w-[393px] gap-2"
                  collapsible
                  onValueChange={(v) => setCurSection(v)}
                >
                  {x}
                </Accordion>
              )}
              item={(v, _, drag) => includedElements[v]?.visible ? (
                <PageLayoutAccordion
                  accordionDisabled={v === "toc"}
                  dragHandler={drag}
                  v={v}
                  title={t(`pageSetup.component.section.${v}`)}
                >
                  <div className="bg-white w-[393px] p-2 lg:p-5 flex flex-row justify-start gap-4 border-t h-[475px]">
                    <AppRadioGroup
                      disabled={isReadonly}
                      items={layouts
                        .filter(({ visible }) => visible(apparatusColDetails))
                        .map(({ name }) => ({
                          value: name,
                          label: name,
                          icon: (
                            <LayoutShape
                              variant="small"
                              key={name}
                              layoutName={name}
                              isSelected={name === curLayout}
                              isReadonly={isReadonly}
                              className="w-[56px] h-[78px] lg:w-[56px] p-2"
                              apparatusDetails={apparatusColDetails}
                              textDetails={textColDetails || {}}
                            />
                          ),
                        }))}
                      onValueChange={(lt) =>
                        setIncludedElements({
                          type: "layout",
                          posi: curSection,
                          payload: lt,
                        })
                      }
                      className="flex flex-col gap-2 items-center"
                      variant="icon"
                    />

                    {v === "critical" ? (
                      <LayoutShape
                        variant="big"
                        layoutName={curLayout}
                        apparatusDetails={apparatusColDetails || []}
                        textDetails={textColDetails || {}}
                        showDetails
                        className="!w-[281px] p-4 col-span-3 h-[398px]"
                      />
                    ) : (
                      <LayoutShapeText layout={curLayout} />
                    )}
                  </div>
                </PageLayoutAccordion>
              ) : (
                <div className="d-none" />
              )
              }

            />
          </div>
          {curSection &&
            curSection !== "intro" &&
            curSection !== "bibliography" ? (
            <div
              className="overflow-auto flex w-[280px] gap-3 pt-5 pb-5 pl-[12px] pr-[12px] flex-col bg-white"
              style={{ scrollbarWidth: "none" }}
            >
              <>
                <div>
                  <Typography component="h4" className="border-b pb-6">
                    {t(`pageSetup.component.section.${curSection}`)}
                  </Typography>
                </div>

                <TextContentManagement
                  readonly={isReadonly}
                  curSection={curSection}
                  curLayout={curLayout}
                  setIncludedElements={setIncludedElements}
                  apparatusDetails={apparatusDetails}
                  availableApparatusTypes={
                    availableApparatusTypesState[curSection].columnDetails
                  }
                  iconClassName="mt-[5px]"
                  textColor={`${colors.secondary.DEFAULT}`}
                />
              </>
            </div>
          ) : (
            <div className="flex w-[280px] pt-5 pb-5 pl-[12px] pr-[12px] flex-col bg-transparent" />
          )}
        </div>
      </Modal>
    </>
  );
}
