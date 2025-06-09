import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "@/components/ui/modal"
import Button from "@/components/ui/button";
import TemplateSelection from "@/components/template-selection";

interface SaveAsTemplateModalProps {
  open: boolean;
  onClose: () => void;
  onSaveTemplate: (templateName: string) => void;
}

const SaveAsTemplateModal: React.FC<SaveAsTemplateModalProps> = ({
  open,
  onClose,
  onSaveTemplate
}) => {
  const [templates, setTemplates] = useState<any[] | null>(null);
  const [templateName, setTemplateName] = useState<string>("");

  const { t } = useTranslation();

  const fetchTemplates = async () => {
    try {
      const templates = (await window.doc.getTemplates()).map((t) => JSON.parse(t));
      setTemplates(templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      setTemplates([]);
    }
  };

  useEffect(() => {
    fetchTemplates()
  }, [])

  const publishersTemplates = useMemo(() => {
    const filtered = templates?.filter((template) => template.type === "COMMUNITY")
      .sort((a, b) => new Date(b.updatedDate).getTime() - new Date(a.updatedDate).getTime());
    return filtered;
  }, [templates]);

  const recentTemplates = useMemo(() => {
    if (!templates) return [];

    return templates
      .filter((template) => template.type === "PROPRIETARY" && template.name !== "Blank")
      .sort((a, b) => new Date(b.updatedDate).getTime() - new Date(a.updatedDate).getTime());
  }, [templates]);

  return (
    <Modal
      isOpen={open}
      title={t('save_as_template_dialog.title')}
      className="max-w-[880px] h-auto max-h-[90%] flex-1 flex flex-col"
      contentClassName="flex-1 overflow-y-auto"
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
          {t('save_as_template_dialog.buttons.cancel')}
        </Button>,
        <Button
          key="continue"
          className="w-24"
          size="mini"
          intent={"primary"}
          onClick={() => onSaveTemplate(templateName)}
          disabled={!templateName}
        >

          {t('save_as_template_dialog.buttons.done')}
        </Button>
      ]}>
      <TemplateSelection defaultValue="new-template" onChange={() => { }} disabled={true}>
        <TemplateSelection.Category
          title={t('save_as_template_dialog.sections.publishers')}
        >
          {publishersTemplates?.map((props) =>
            <TemplateSelection.Item
              key={props.id}
              value={props.name}
              {...props} />)}
        </TemplateSelection.Category>
        <TemplateSelection.Category
          title={t('save_as_template_dialog.sections.myTemplates')}
        >
          <TemplateSelection.Item
            id="new"
            value=""
            as={{ type: "input", onChange: (e) => setTemplateName(e.target.value), value: templateName }} />
          {recentTemplates?.map(({ name }) => <TemplateSelection.Item
            id={name}
            key={name}
            name={name}
            value={name} />)}
        </TemplateSelection.Category>
      </TemplateSelection>
    </Modal>

  );
};

export default SaveAsTemplateModal;