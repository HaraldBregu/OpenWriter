import React, { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import Modal from "@/components/ui/modal";
import Button from "@/components/ui/button";
import TemplateSelection from "@/components/template-selection";
import { setDocumentTemplate } from "../store/editor/editor.slice";


/**
 * @todo 
 * - implement import from git folder (publishers template)
 */

/**
 * {/**<a
    href="*"
    className="text-xs font-bold leading-4 tracking-normal text-right underline underline-offset-4 font-sans"
  >
    {t("choose_template_dialog.browse_link")}
  </a> 
*/


interface ChooseTemplateModalProps {
  open: boolean;
  onClose: () => void;
  onContinue: (template: any) => void;
}

const ChooseTemplateModal: React.FC<ChooseTemplateModalProps> = ({
  open,
  onClose,
  onContinue,
}) => {
  const [templates, setTemplates] = useState<any | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);

  const { t } = useTranslation();
  const dispatch = useDispatch();


  const fetchTemplates = async () => {
    try {
      const templatesResponse = await window.doc.getTemplates();
      const templates = templatesResponse.map(
        ({ filename, content }: any) => ({
          ...JSON.parse(content),
          filename
        })
      );
      setTemplates(templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      setTemplates([]);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [])
  const recentTemplates = useMemo(() => {
    if (!templates) return [];

    const filtered = templates
      .filter((template) => template.type === "PROPRIETARY")
      .sort((a, b) => new Date(b.updatedDate).getTime() - new Date(a.updatedDate).getTime());

    const blankIndex = filtered.findIndex(t => t.filename === "blank.tml");

    if (blankIndex > -1) {
      const [blankTemplate] = filtered.splice(blankIndex, 1);
      filtered.unshift(blankTemplate);
    }
    return filtered;
  }, [templates]);

  const publishersTemplates = useMemo(() => {
    const filtered = templates?.filter((template) => template.type === "COMMUNITY")
      .sort((a, b) => new Date(b.updatedDate).getTime() - new Date(a.updatedDate).getTime());
    return filtered;
  }, [templates]);

  useEffect(() => {
    if (recentTemplates.length > 0) {
      setSelectedTemplate(recentTemplates[0])
    }
  }, [recentTemplates])

  const handleTemplateSelect = (filename: string) => {
    const found = [...recentTemplates, ...publishersTemplates].find(t => t.filename === filename);
    if (found) { setSelectedTemplate(found) };
  };


  const handleContinue = () => {
    if (selectedTemplate) {
      dispatch(setDocumentTemplate(selectedTemplate))
      onContinue(selectedTemplate);
    }
  };

  const handleImport = async () => {
    try {
      await window.doc.importTemplate()
      await fetchTemplates()
    } catch (err) {
      console.log("err:", err)
    }
  }

  return (
    <Modal
      isOpen={open}
      title={t("choose_template_dialog.title")}
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
          {t("choose_template_dialog.buttons.cancel")}
        </Button>,
        <Button
          key="import_template"
          className="w-32"
          size="mini"
          intent="primary"
          variant="tonal"
          onClick={handleImport}
        >
          {t("choose_template_dialog.buttons.import")}
        </Button>,
        <Button
          key="continue"
          className="w-24"
          size="mini"
          intent={"primary"}
          onClick={handleContinue}
        >
          {t("choose_template_dialog.buttons.continue")}
        </Button>,
      ]}
    >
      <TemplateSelection value={selectedTemplate?.filename ?? recentTemplates[0]?.filename ?? ""} onChange={handleTemplateSelect}>
        <TemplateSelection.Category title={t("choose_template_dialog.sections.recent")}>
          {recentTemplates?.map(({ filename }) => (
            <TemplateSelection.Item
              id={filename}
              key={filename}
              name={filename?.split('.')[0]}
              value={filename}
              icon={filename?.split('.')[0].toLowerCase() === "blank" ? "blank" : "other"}
            />
          ))}
        </TemplateSelection.Category>
        <TemplateSelection.Category title={t("choose_template_dialog.sections.publishers")}>
          {publishersTemplates?.map(({ filename }) => (
            <TemplateSelection.Item
              id={filename}
              key={filename}
              name={filename}
              value={filename}
            />
          ))}
        </TemplateSelection.Category>
      </TemplateSelection>
    </Modal>
  );
};

export default ChooseTemplateModal;