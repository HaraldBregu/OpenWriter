import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Typography from "@components/Typography"
import { cn } from "@/lib/utils";
import { useReducer, Dispatch, SetStateAction, useEffect, useState } from "react";
import Check from "@/components/icons/Check";
import { useTranslation } from "react-i18next";
import CheckboxNumber from "./checkbox-number";
import AppRadioGroup from "@/components/app-radiogroup";
import CustomWidthHeightModal from "./custom-width-height-modal";
import TextField from "@/components/ui/textField";
import AppCheckbox from "@/components/app-checkbox";
import { StandardPageDimensionsState } from "@/pages/preferences/store/layout/layout.state";


interface PageSetupProps {
  exportSetup: Dispatch<SetStateAction<SetupOptionType>>;
  initialSetup?: SetupOptionType;
  readonly: boolean;
  standardPageDimensions: StandardPageDimensionsState[];
}

const PageSetup = ({
  exportSetup,
  initialSetup,
  readonly,
  standardPageDimensions,
}: PageSetupProps) => {
  const sectionClass = cn(
    "[&:not(:last-child)]:border-b",
    "flex",
    "flex-col",
    "pb-3",
    "pl-2",
    "pr-2"
  );
  const sectionClass2 = cn(
    "[&:not(:last-child)]:border-b",
    "flex",
    "flex-col",
    "gap-2",
    "p-2"
  );
  const sectionClass3 = cn(
    "[&:not(:last-child)]:border-b",
    "flex",
    "flex-col",
    "gap-4",
    "p-2"
  );
  const [openCustomWidthHeight, setOpenCustomWidthHeight] = useState(false);

  const [optSetup, setOptSetup] = useReducer((state, action) => {
    switch (action.type) {
      case "PAPER_SIZE":
        return {
          ...state,
          paperSize_name: action.payload.name,
          paperSize_width: action.payload.width,
          paperSize_height: action.payload.height,
        };
      case "ORIENTATION":
        return {
          ...state,
          paperSize_orientation: action.payload,
        };
      case "ELEMENT_EXISTS":
        return {
          ...state,
          [`${action.element}_show`]: action.payload,
        };
      case "ELEMENT_VALUE":
        return {
          ...state,
          [`${action.element}_weight`]: action.payload,
        };
      case "MARGIN":
        return {
          ...state,
          [`margin_${action.payload.posi}`]: action.payload.value,
        };
      case "TEMPLATE_TYPE":
        return {
          ...state,
          template_type:
            state.template_type === "Community" ? "Private" : "Community",
        };
      default:
        return state;
    }
  }, initialSetup);

  const orientationPageClass = (curOrientation) =>
    cn(
      "flex",
      "justify-end",
      "items-end",
      "border",
      { "w-[56px]": curOrientation === "horizontal" },
      { "h-[56px]": curOrientation === "vertical" },
      {
        "border-primary border-2":
          curOrientation === optSetup.paperSize_orientation && !readonly,
      },
      {
        "border-secondary border-2":
          curOrientation === optSetup.paperSize_orientation && readonly,
      }
    );

  const { t } = useTranslation();

  useEffect(() => exportSetup(optSetup), [optSetup]);

  const paperSizeChangeHdlr = (paperSize) => {
    if (paperSize === "custom") {
      setOptSetup({ type: "PAPER_SIZE", payload: {} });
      setOpenCustomWidthHeight(true);
      return;
    }
    setOptSetup({
      type: "PAPER_SIZE",
      payload: standardPageDimensions.find(({ name }) => paperSize === name),
    });
  };

  const orientationChangeHdlr = (orientation) =>
    setOptSetup({ type: "ORIENTATION", payload: orientation });

  return (
    <>
        <AccordionItem value="item-2" className="border-b-0 font-normal text-[13px]">
          <AccordionTrigger className="font-normal text-[13px]">
            {t("pageSetup.component.accordionSetup.title")}
          </AccordionTrigger>
          <AccordionContent className="font-normal text-[13px]">
            <div className="flex flex-col">
              <div className={sectionClass}>
                <Typography component="span" className="text-[13px] font-bold">
                  {t("pageSetup.component.accordionSetup.size")}
                </Typography>
                <Select
                  name="paperSize"
                  onValueChange={paperSizeChangeHdlr}
                  value={optSetup.paperSize_name}
                  disabled={readonly}
                >
                  <SelectTrigger className="justify-between w-[223px] bg-grey-95">
                    <SelectValue placeholder={t("pageSetup.selectPage")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {standardPageDimensions.map(({ name, width, height }) => (
                        <SelectItem key={name} value={name}>
                          {name} ({width} x {height})
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    <SelectGroup>
                      <SelectItem value="custom">
                        {t("pageSetup.component.selectCustom")}
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              {optSetup.paperSize_name && (
                <div className={sectionClass2}>
                  <Typography component="span" className="text-[13px] font-bold">
                    {t("pageSetup.component.accordionSetup.orientation.title")}
                  </Typography>
                  <AppRadioGroup
                    disabled={readonly}
                    items={[
                      {
                        value: "horizontal",
                        label: "h",
                        icon: (
                          <div
                            className={orientationPageClass("horizontal")}
                            style={{
                              aspectRatio: "4/3",
                            }}
                          >
                            {optSetup.paperSize_orientation ===
                              "horizontal" && (
                              <Check
                                stroke="currentColor"
                                className={
                                  readonly ? "text-secondary" : "text-primary"
                                }
                              />
                            )}
                          </div>
                        ),
                      },
                      {
                        value: "vertical",
                        label: "v",
                        icon: (
                          <div
                            className={orientationPageClass("vertical")}
                            style={{
                              aspectRatio: "3/4",
                            }}
                          >
                            {optSetup.paperSize_orientation === "vertical" && (
                              <Check
                                stroke="currentColor"
                                className={
                                  readonly ? "text-secondary" : "text-primary"
                                }
                              />
                            )}
                          </div>
                        ),
                      },
                    ]}
                    onValueChange={orientationChangeHdlr}
                    className="flex flex-row items-end gap-2"
                    variant="icon"
                  />
                  <Typography component="span" className="text-[13px]">
                    {optSetup.paperSize_orientation === "horizontal"
                      ? `${optSetup.paperSize_width} x ${optSetup.paperSize_height}`
                      : `${optSetup.paperSize_height} x ${optSetup.paperSize_width}`}
                  </Typography>
                </div>
              )}
              <div className={sectionClass3}>
                <CheckboxNumber
                  id="header"
                  checked={optSetup.header_show}
                  value={optSetup.header_weight}
                  onChange={setOptSetup}
                  label={t("pageSetup.areas.header")}
                  labelBottom={t("pageSetup.position.top")}
                  disabled={readonly}
                />
                <CheckboxNumber
                  id="footer"
                  checked={optSetup.footer_show}
                  value={optSetup.footer_weight}
                  onChange={setOptSetup}
                  label={t("pageSetup.areas.footer")}
                  labelBottom={t("pageSetup.position.bottom")}
                  disabled={readonly}
                />
              </div>
              <div className={sectionClass}>
              <Typography component="span" className="py-4 text-sm font-medium">
              {t("pageSetup.areas.documentMargin")}
                  </Typography>
               
                <div className="flex flex-col gap-3">
                  <div className="flex flex-row gap-2">
                    <div className="flex flex-col items-center">
                      <TextField
                        id="margin-top"
                        type="number"
                        onChange={(x) =>
                          setOptSetup({
                            type: "MARGIN",
                            payload: {
                              posi: "top",
                              value: parseFloat(x.target.value),
                            },
                          })
                        }
                        value={optSetup.margin_top}
                        unitMesure="cm"
                        decimals={2}
                        disabled={readonly}
                      />
                      <Typography component="label">
                        {t("pageSetup.position.top")}
                      </Typography>
                    </div>
                    <div className="flex flex-col items-center">
                      <TextField
                        id="margin-bottom"
                        type="number"
                        onChange={(x) =>
                          setOptSetup({
                            type: "MARGIN",
                            payload: {
                              posi: "bottom",
                              value: parseFloat(x.target.value),
                            },
                          })
                        }
                        decimals={2}
                        unitMesure="cm"
                        value={optSetup.margin_bottom}
                        disabled={readonly}
                      />
                      <Typography component="label">
                        {t("pageSetup.position.bottom")}
                      </Typography>
                    </div>
                  </div>
                  <div className="flex flex-row gap-2">
                    <div className="flex flex-col items-center">
                      <TextField
                        id="margin-left"
                        type="number"
                        onChange={(x) =>
                          setOptSetup({
                            type: "MARGIN",
                            payload: {
                              posi: "left",
                              value: parseFloat(x.target.value),
                            },
                          })
                        }
                        decimals={2}
                        unitMesure="cm"
                        value={optSetup.margin_left}
                        disabled={readonly}
                      />
                      <Typography component="label">
                        {t("pageSetup.position.left")}
                      </Typography>
                    </div>
                    <div className="flex flex-col items-center">
                      <TextField
                        id="margin-right"
                        type="number"
                        onChange={(x) =>
                          setOptSetup({
                            type: "MARGIN",
                            payload: {
                              posi: "right",
                              value: parseFloat(x.target.value),
                            },
                          })
                        }
                        decimals={2}
                        unitMesure="cm"
                        value={optSetup.margin_right}
                        disabled={readonly}
                      />
                      <Typography component="label">
                        {t("pageSetup.position.right")}
                      </Typography>
                    </div>
                  </div>
                </div>
              </div>
              <div className={sectionClass3}>
                <CheckboxNumber
                  id="innerMarginNote"
                  checked={optSetup.innerMarginNote_show}
                  onChange={setOptSetup}
                  value={optSetup.innerMarginNote_weight}
                  label={t("pageSetup.areas.innerMarginNote")}
                  labelBottom={t("pageSetup.position.left")}
                  disabled={readonly}
                />
                <CheckboxNumber
                  id="outerMarginNote"
                  checked={optSetup.outerMarginNote_show}
                  value={optSetup.outerMarginNote_weight}
                  onChange={setOptSetup}
                  label={t("pageSetup.areas.outerMarginNote")}
                  labelBottom={t("pageSetup.position.right")}
                  disabled={readonly}
                />
              </div>
              <AppCheckbox
                checked={readonly}
                label="Community template"
                onCheckedChange={() => setOptSetup({ type: "TEMPLATE_TYPE" })}
                containerClassName="mt-3 p-2"
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      <CustomWidthHeightModal
        open={openCustomWidthHeight}
        onDone={(payload) => setOptSetup({ type: "PAPER_SIZE", payload })}
      />
    </>
  );
};

export default PageSetup;
