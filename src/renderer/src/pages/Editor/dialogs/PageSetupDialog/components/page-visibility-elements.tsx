import AppCheckbox from "@/components/app-checkbox"
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useTranslation } from "react-i18next";

type TIncludedElement = {}

interface PageVisibilityElementsProps {
    orderedItms: string[],
    includedElements: TIncludedElement,
    checkboxChangeHdlr: (v: string, e: boolean) => void,
    readonly: boolean
}

const PageVisibilityElements = ({orderedItms, includedElements, checkboxChangeHdlr, readonly}: PageVisibilityElementsProps) => {
    const { t } = useTranslation();

    return (
            <AccordionItem value="item-1" className={'text-[13px]'}>
                <AccordionTrigger className={'text-[13px]'}>
                    {t('pageSetup.component.sectionInclude')}
                </AccordionTrigger>
                <AccordionContent className="flex flex-col gap-2 text-[13px] font-normal">
                {orderedItms.map((v) => (
                    <AppCheckbox
                        key={v}
                        id={v}
                        checked={includedElements[v].visible}
                        label={t(`pageSetup.component.section.${v}`)}
                        onCheckedChange={(e) => { checkboxChangeHdlr(v, e) }}
                        disabled={readonly || includedElements[v].required}
                    />
                ))}
                </AccordionContent>
            </AccordionItem>
    )
}

export default PageVisibilityElements