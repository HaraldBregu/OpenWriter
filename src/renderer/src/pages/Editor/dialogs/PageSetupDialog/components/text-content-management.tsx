import Typography from "@/components/Typography";
import { useTranslation } from "react-i18next";
import LayoutPartElement from "./layout-part-element";
import Button from "@/components/ui/button";
import { useArray } from "@/hooks/use-array";
import { useEffect, useState } from "react";
import { SortableArea } from "@/components/drag-drop-area";
import { useCounter } from "@/hooks/use-counter";
import { PlusCircle } from "lucide-react";
import {
  ApparatusTypes,
  ColDetailsType,
  TElement,
} from "@/pages/editor/store/layout/layout.state";
import { cn } from "@/lib/utils";
import { MAX_APPARATUS_NUMBER } from "../constants";
import ConfirmationModal from "./confirmation-modal";
import { v4 as uuidv4 } from 'uuid'

interface TextContentManagementProps {
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
  readonly: boolean;
  availableApparatusTypes: { [key in ApparatusTypes]: ColDetailsType };
  iconClassName?: string;
  textColor?: string;
  curLayout?: string;
}

const TextContentManagement = ({
  curSection,
  curLayout,
  setIncludedElements,
  apparatusDetails,
  readonly,
  availableApparatusTypes,
  iconClassName,
  textColor,
}: TextContentManagementProps) => {
  const { t } = useTranslation();

  const [apparatus, setApparatus] = useArray<TElement>([]);
  const [counter, setCounter] = useCounter(apparatusDetails.length);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  useEffect(() => {
    setApparatus.replace(apparatusDetails);
  }, [curSection]);

  useEffect(() => {
    setIncludedElements({
      type: "apparatusDetails",
      posi: curSection,
      payload: apparatus,
    });
  }, [apparatus]);
  
  const clickHandler = () => {
  const newElement:TElement = {
    id: uuidv4(),
    columns: 1,
    title: `Apparatus ${counter}`,
    sectionType: "critical",
    type: "apparatus",
    disabled: false,
    visible:true,
  };
  setApparatus.add(newElement);
    setCounter.increment();
  };

  const handleDeleteClick = (index: number) => {
    setDeleteIndex(index);
    setShowConfirmModal(true);
  };

  const handleConfirmDelete = () => {
    if (deleteIndex !== null) {
      setApparatus.remove(deleteIndex);
      setShowConfirmModal(false);
      setDeleteIndex(null);
    }
  };

  const defaultDetails: TElement = {
    id: "",
    title: "",
    columns: 1,
    sectionType: "critical",
    disabled: false,
    type: "apparatus",
    visible:false,
  };

  
  return (
    <div className="text-[13px] flex flex-col justify-between h-full">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          <Typography
            component="label"
            className={cn("ml-1 font-normal text-[13px]")}
          >
            {t(`pageSetup.component.sectionInclude`)}
          </Typography>
          
          <SortableArea<string>
            itemLs={apparatus?.map((x) => x?.id)}
            readonly={readonly}
            wrapper={(els) => <div className="flex flex-col gap-2">{els}</div>}
            iconClassName={iconClassName}
            item={(payload, i, drag) => (
              <LayoutPartElement
                curLayout={curLayout}
                key={payload}
                index={i}
                setIncludedElements={setIncludedElements}
                apparatusDetails={apparatusDetails}
                details={
                  apparatus.find((x) => x.id === payload) || defaultDetails
                }
                onDelete={() => handleDeleteClick(i)}
                onChangeColumnNr={(_, details) =>
                  setApparatus.update(i, details)
                }
                readonly={readonly}
                sectionTypes={availableApparatusTypes}
                dragHandler={drag}
                curSection={curSection}
              />
            )}
            readSorted={(result) =>
              setApparatus.replace(
                result.map(id => apparatus.find(x => x.id === id)).filter((x): x is TElement => x !== undefined)
              )
            }
          />

          {apparatus.length < MAX_APPARATUS_NUMBER + 1 && (
            <div>
              <Button
                disabled={readonly}
                variant="outline"
                className="rounded-[6px] flex flex-row justify-between gap-1 items-center border-secondary"
                size="small"
                onClick={clickHandler}
              >
                <PlusCircle color={`${textColor}`} />
                <span
                  style={{ color: `${textColor}` }}
                  className="inline-flex flex-1 text-[13px]"
                >
                  {t("pageSetup.component.add")}
                </span>
              </Button>
            </div>
          )}
        </div>
      </div>

      <ConfirmationModal
        open={showConfirmModal}
        onOpenChange={setShowConfirmModal}
        onConfirm={handleConfirmDelete}
        apparatus={deleteIndex && apparatus[deleteIndex].title}
      />
    </div>
  );
};

export default TextContentManagement;
