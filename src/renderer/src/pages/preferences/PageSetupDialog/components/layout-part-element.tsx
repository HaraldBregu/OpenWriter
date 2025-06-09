import Check from "@/components/icons/Check";
import Pencil from "@/components/icons/Pencil";
import Button from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ReactNode, useEffect, useState } from "react";
import DragHandle from "@/components/icons/DragHandle";
import Typogaphy from "@/components/Typography";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ApparatusTypes,
  ColDetailsType,
  TElement,
} from "@/pages/preferences/store/layout/layout.state";
import { settingsLayout } from "../constants";
import CloseBig from "@/components/icons/CloseBig";
import { useTranslation } from "react-i18next";

interface LayoutPartElementProps {
  details: TElement;
  onDelete: (index: number) => void;
  index: number;
  onChangeColumnNr: (i: number, details: TElement) => void;
  readonly?: boolean;
  sectionTypes: { [key in ApparatusTypes]: ColDetailsType };
  dragHandler: (c: ReactNode) => ReactNode;
  curLayout?: string;
  curSection: string;
  setIncludedElements: (action: {
    type:
    | "textColumns"
    | "nrApparatus"
    | "apparatusColumns"
    | "apparatusDetails";
    posi: string;
    payload: number | TElement[];
  }) => void;
  apparatusDetails: TElement[];
}

const LayoutPartElement = ({
  details,
  curLayout,
  curSection,
  onDelete,
  index,
  onChangeColumnNr,
  readonly,
  sectionTypes,
  dragHandler,
  setIncludedElements,
  apparatusDetails,
}: LayoutPartElementProps) => {
  const { t } = useTranslation();

  const [edit, setEdit] = useState<boolean>(false);
  const [dets, setDets] = useState<TElement>(details);
  const [apparatusSectionTypes, setApparatusSectionTypes] = useState<string[]>(
    Object.keys(sectionTypes).filter((type) => { type !== "text" })
  );

  const editEndHandler = (i, details) => {
    onChangeColumnNr(i, details);
    setEdit(false);
  };

  const getArrayFromNumber = (num) =>
    Array.from({ length: num }, (_, i) => i + 1);
  const changeTitleValue = (e) =>
    setDets((prev) => ({ ...prev, title: e.target.value }));

  const sectionTypeLabel = (sectionType) => {
    switch (sectionType) {
      case "text":
        return "Text";
      case "critical":
        return "Critical";
      case "pageNotes":
        return "Page notes";
      case "sectionNotes":
        return "Section notes";
      case "innerMargin":
        return "Inner margin";
      case "outerMargin":
        return "Outer margin";
      default:
        return "Critical";
    }
  };

  useEffect(() => {
    if (!curLayout || !curSection || !dets.sectionType) return;

    const maxColumns =
      settingsLayout?.[curLayout]?.[curSection]?.columnDetails?.[
        dets.sectionType
      ]?.columnNr || 1;

    if ((dets.columns || 1) > maxColumns) {
      setDets((prev) => ({ ...prev, columns: 1 }));
    }
    const updateThumbnails = apparatusDetails.map((app) => ({
      ...app,
      columns: 1,
    }));
    setIncludedElements({
      type: "apparatusDetails",
      posi: curSection,
      payload: updateThumbnails,
    });
  }, [curLayout]);

  useEffect(() => {
    const updateThumbnails = apparatusDetails.map((app) =>
      app.id === dets.id ? dets : app
    );
    setIncludedElements({
      type: "apparatusDetails",
      posi: curSection,
      payload: updateThumbnails,
    });
  }, [dets]);

  useEffect(() => {
    setApparatusSectionTypes(Object.keys(sectionTypes).filter((type) => type !== "text"));
  }, [sectionTypes]);

  return (
    <div className="flex justify-start">
      <div className="flex items-start gap-1">
        {details.type !== 'text' ? (
          dragHandler(<DragHandle className="cursor-move" />)
        ) : (
          <div className="w-[24px] h-[24px]" />
        )}

        <Checkbox
          className={`${(index === 1 || dets.type === 'text') && "data-[state=checked]:bg-grey-70 data-[state=checked]:border-grey-70 data-[state=checked]:text-grey-30"} 
                mt-2 h-5 w-5 disabled:bg-grey-70 disabled:border-grey-70 disabled:text-grey-30`}
          defaultChecked={dets.visible}
          disabled={index === 1 || dets.type === 'text'}
          onCheckedChange={(checked) => {
            setDets((prev) => ({
              ...prev,
              visible: checked as boolean,
            }));
          }}
        />
        <div className="flex flex-col">
          <div>
            {edit ? (
              <Input
                className={`border-2 border-primary`}
                onChange={changeTitleValue}
                value={dets.title}
              />
            ) : (
              <Typogaphy component="label" className="font-semibold">
                {dets.title}
              </Typogaphy>
            )}
          </div>

          <div>
            <Select
              disabled={!edit}
              value={dets.sectionType}
              onValueChange={(val: string) => {
                setDets((prev) => {
                  if (val === 'outerMargin' || val === 'innerMargin') {
                    return ({
                      ...prev,
                      columns: 1,
                      sectionType: val,
                    })
                  }
                  return ({
                    ...prev,
                    sectionType: val,
                  })
                });
              }}
            >
              {details && details.type === "apparatus" && (
                <SelectTrigger
                  className="min-w-[140px]
                                    pl-[4px]
                                    pr-[2px]
                                    py-0
                                    h-auto
                                    border-none
                                    shadow-none
                                    focus:ring-0
                                    focus:ring-offset-0
                                "
                  aria-label="Select a value"
                >
                  <SelectValue placeholder="select column" />
                </SelectTrigger>
              )}
              <SelectContent className="rounded-xl">
                {apparatusSectionTypes.map((sectionType) => (
                  <SelectItem
                    className="
                                        hover:bg-primary
                                        hover:text-white
                                        active:bg-primary
                                        active:text-white
                                        focus-visible:bg-primary
                                        focus-visible:text-white
                                    "
                    value={sectionType}
                    key={sectionType}
                  >
                    {sectionTypeLabel(sectionType)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            {(dets.type === "apparatus" || dets.type === "text") && (
              <Select
                disabled={!edit}
                value={(dets?.columns || 1).toString()}
                onValueChange={(val) =>
                  setDets((prev) => ({ ...prev, columns: parseInt(val) }))
                }
              >
                <SelectTrigger
                  className="
                                    min-w-[140px]
                                    pl-[4px]
                                    pr-[2px]
                                    py-0
                                    h-auto
                                    border-none
                                    shadow-none
                                    focus:ring-0
                                    focus:ring-offset-0
                                "
                  aria-label="Select a value"
                >
                  <SelectValue placeholder="select column" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {curLayout &&
                    settingsLayout[curLayout][curSection].columnDetails &&
                    settingsLayout[curLayout][curSection].columnDetails[
                    dets.sectionType
                    ] &&
                    getArrayFromNumber(
                      settingsLayout[curLayout][curSection].columnDetails[
                        dets.sectionType
                      ].columnNr || 1
                    ).map((_, i) => (
                      <SelectItem
                        className="
                                        hover:bg-primary
                                        hover:text-white
                                        active:bg-primary
                                        active:text-white
                                        focus-visible:bg-primary
                                        focus-visible:text-white
                                    "
                        value={(i + 1).toString()}
                        key={i + 1}
                      >
                        {i + 1} {t("pageSetup.component.columns")}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </div>
      {edit && (
        <Button
          variant="icon"
          size="icon"
          onClick={() => editEndHandler(index, dets)}
        >
          <Check size={22} />
        </Button>
      )}

      {!readonly && !edit && (
        <div className="flex flex-row">
          <Button variant="icon" size="icon" onClick={() => setEdit(true)}>
            <Pencil size={22} />
          </Button>
          
          {(index !== 1) && (
            <Button
              variant="icon"
              size="icon"
              color="destructive"
              className="[&>svg]:fill-destructive-50"
              onClick={() => onDelete(index)}
            >
              <CloseBig size={22} />
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default LayoutPartElement;
