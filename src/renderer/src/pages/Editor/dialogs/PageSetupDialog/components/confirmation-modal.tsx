import Button from "@/components/ui/button";
import { DialogHeader } from "@/components/ui/dialog";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@radix-ui/react-dialog";
import { useTranslation } from "react-i18next";

export interface IConfirmationModal {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  apparatus?:string | 0 | null
}

const ConfirmationModal = ({
  open,
  onOpenChange,
  onConfirm,
  apparatus
}: IConfirmationModal) => {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed inset-0 m-0 p-6 flex items-center justify-center bg-black/50 z-50 w-full">
        <div className="bg-white rounded-lg max-w-sm w-[21rem] max-h-full overflow-auto p-6">
          <DialogHeader className="flex gap-2">
            <DialogTitle className="font-semibold text-[15px] text-center">
              {t("pageSetup.confirmationModal.title", {apparatus: apparatus})}
            </DialogTitle>
            <DialogDescription className="text-center">
              {t("pageSetup.confirmationModal.description", {apparatus: apparatus})}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6 flex justify-between gap-2 ">
            <Button
              className="btn btn-outline w-full items-center justify-center"
              onClick={() => onOpenChange(false)}
              size="mini"
              intent={"secondary"}
              variant={"tonal"}
            >
                          {t("buttons.cancel")}
            </Button>
            <Button
              className="btn bg-destructive-90 text-destructive w-full items-center justify-center"
              size="mini"
              intent={"primary"}
              onClick={() => onConfirm()}
            >
              {t("pageSetup.buttons.delete")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmationModal;
