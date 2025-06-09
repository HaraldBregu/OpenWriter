import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useSelector } from "react-redux"
import { selectWords } from "./store/editor/editor.selector"

const EditorFooterLayout = ({ children }: { children: React.ReactNode }) => {
    return (
        <footer className="sticky bottom-0 z-50 flex h-8 shrink-0 items-center gap-2 border-t bg-background px-3">
            <div className="flex items-center w-full">
                {children}
            </div>
        </footer>
    )
}

export const EditorFooter = () => {
    const words = useSelector(selectWords)

    return (
        <>
            <EditorFooterLayout>
                <div className="flex items-center gap-4 text-xs text-muted-foreground float-left font-medium">
                    <span>Page 1 of 2</span>
                    <span>{words} words</span>
                </div>
                <div className="flex items-center gap-4 ml-auto float-right">
                    <div className="flex items-center gap-2">
                        <Select defaultValue="100">
                            <SelectTrigger className="h-6 w-auto">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="50">50%</SelectItem>
                                <SelectItem value="75">75%</SelectItem>
                                <SelectItem value="100">100%</SelectItem>
                                <SelectItem value="125">125%</SelectItem>
                                <SelectItem value="150">150%</SelectItem>
                                <SelectItem value="200">200%</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </EditorFooterLayout>
        </>
    )
}