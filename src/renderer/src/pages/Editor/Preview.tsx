import { ForwardedRef, useImperativeHandle } from "react";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import Button from "@/components/ui/button";
import DragIndicator from "@/components/icons/DragIndicator";
import CloseBig from "@/components/icons/CloseBig";
import Expand_1 from "@/components/icons/Expand_1";
import Sync from "@/components/icons/Sync";
import { useDispatch } from "react-redux";
import { setPrintPreviewVisible } from "./store/editor/editor.slice";
import { useEditor } from "./hooks/useEditor";

interface EditorPreviewProps {
}

const Preview = forwardRef((
    { }: EditorPreviewProps,
    ref: ForwardedRef<unknown>
) => {
    useImperativeHandle(ref, () => {
        return {}
    }, []);

    const dispatch = useDispatch();

    const [stateEditor] = useEditor();

    return (
        <div className="flex flex-col h-full">
            <nav className={cn("h-8 px-2 flex items-center")}>
                <div className='cursor-pointer'>
                    <DragIndicator intent='primary' variant='tonal' size='small' />
                </div>
                <span className="ml-2 text-xs font-medium">Preview {stateEditor.activeEditor}</span>
                <div className="ml-auto relative space-x-1">
                    <Button
                        intent="secondary"
                        variant="icon"
                        size="iconSm"
                        icon={<Sync intent='primary' variant='tonal' size='small' />}
                    />
                    <Button
                        intent="secondary"
                        variant="icon"
                        size="iconSm"
                        icon={<Expand_1 intent='primary' variant='tonal' size='small' />}
                    />
                    <Button
                        intent="secondary"
                        variant="icon"
                        size="iconSm"
                        onClick={() => {
                            dispatch(setPrintPreviewVisible(false))
                        }}
                        icon={<CloseBig intent='primary' variant='tonal' size='small' />}
                    />
                </div>
            </nav>
            <div className="flex-1 p-4">
                <p>
                    This is where the preview will go
                </p>
            </div>
        </div>
    )
})

export default Preview;
