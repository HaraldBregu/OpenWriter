import {
  Dialog,
  DialogContent
} from "@/components/ui/dialog"
import Typography from "@components/Typography"
import { Accordion } from "../components/ui/accordion"
import { AccordionContent, AccordionItem, AccordionTrigger } from "@radix-ui/react-accordion"
import { Checkbox } from "../components/ui/checkbox"
import { useReducer, useState } from "react"
import { SortableArea } from "@/components/drag-drop-area"

interface PageSetupDialogProps {
  open: boolean
  onClose: () => void
}

export function PageSetupDialog({ open, onClose }: PageSetupDialogProps) {
  const [orderedItms, setOrderedItms] = useState<string[]>([])
  const [includedElements, setIncludedElements] = useReducer((state, action) => ({
    ...state,
    [action.type]: {...state[action.type], visible: action.payload}
  }), {
        toc: {
            name: 'Table of contents',
            value: 'toc' ,
            visible: false
        },
        intro: {
            name: 'Introduction',
            value: 'intro' ,
            visible: false
        },
        critical: {
            name: 'Critical Text',
            value: 'critical' ,
            visible: false
        },
        bibliography: {
            name: 'Bibliography',
            value: 'bibliography',
            visible: false
        }
    });

  const checkboxChangeHdlr = (type, payload) => {
    setIncludedElements({ type, payload });
  }

  const removeElement = (e, type) => {
    e.stopPropagation();
    setIncludedElements({ type, payload: false });
}

  console.log('davidlog', {orderedItms})

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="min-w-[90%]  h-[80%]">
        <div className={'flex flex-row justify-between w-full bg-gray-100 overflow-auto max-h-[70%]'}>
            <div className={'flex flex-col gap-2 basis-1/6 bg-white'}>
                <div>
                    <Typography component="h4">Document setup</Typography>
                </div>
                <div className="pb-2 mb-2 border-b border-gray-200">
                    <Accordion type="single" collapsible>
                        <AccordionItem value="item-1">
                            <AccordionTrigger>Include</AccordionTrigger>
                            <AccordionContent>
                                {Object.keys(includedElements).map((v) => (
                                    <div key={v}>
                                        <Checkbox
                                            onCheckedChange={(e) => {checkboxChangeHdlr(v, e)}}
                                            checked={includedElements[v].visible}
                                        /> {includedElements[v].name}
                                    </div>))}
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>
                <div className="basis-1/5 bg-white">
                    <Accordion type="single" collapsible>
                        <AccordionItem value="item-1">
                            <AccordionTrigger>Page setup</AccordionTrigger>
                            <AccordionContent>
                               sara quel che sara
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>
            </div>
            <div className="basis-3/5 overflow-auto">
              <SortableArea
                itemLs={Object.keys(includedElements)}
                readSorted={setOrderedItms}
                wrapper={
                  x => (
                    <Accordion type="single" className="p-12 py-2 flex flex-col gap-3" collapsible>
                      {x}
                    </Accordion>
                  )
                }
                item={(value) =>
                  <AccordionItem value={value}>
                    <AccordionTrigger className="flex flex-row justify-between w-full p-3 bg-white cursor-move">
                      <div>...</div>
                      <div>{value}</div>
                      <div onClick={(e) => removeElement(e, value)}>X</div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="bg-white mt-1 w-full h-[600px]">
                        {value}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                }
              />
            </div>
            <div className="basis-1/5 bg-white"></div>
        </div>
      </DialogContent>
    </Dialog>
  )
}