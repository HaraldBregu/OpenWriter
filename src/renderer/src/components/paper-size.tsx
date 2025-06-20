import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { StandardPageDimensionsState } from "@/pages/editor/store/layout/layout.state"
import { Dispatch, SetStateAction } from "react"

interface IPaperSize {
    label: string
    setPaperSizeData: Dispatch<SetStateAction<string>>
    paperSizeData: string
    placeholder?: string
    standardPageDimensions: StandardPageDimensionsState[]
    setOpenCustomWidthHeight: Dispatch<SetStateAction<boolean>>
    setPaperSizeDataCustom: Dispatch<SetStateAction<{
        name: string;
        height: number;
        width: number;
}>>
   
}

const PaperSize = ({ label, setPaperSizeData, paperSizeData, placeholder, standardPageDimensions, setOpenCustomWidthHeight, setPaperSizeDataCustom }: IPaperSize) => {

    return (
        <div>
            <Label className="font-600 text-[13px] leading-[15px]">{label}</Label>
            <Select onValueChange={(e) => {setPaperSizeDataCustom({name:'', height:0, width:0}); 
            if(e==='custom'){setOpenCustomWidthHeight(true)} 
            setPaperSizeData(e)}
            } 
            defaultValue={paperSizeData}>
                <SelectTrigger className='bg-grey-95'>
                    <SelectValue placeholder={placeholder}> {paperSizeData}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                    {standardPageDimensions.map(({ name, width, height }) => (
                        <SelectItem key={name} value={name}>
                            {name} {name!=='custom' && `${width} x ${height}`} 
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    )
}

export default PaperSize