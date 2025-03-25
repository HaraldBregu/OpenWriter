import React, { useState, MouseEvent, useCallback } from "react";
import { Popover } from "@mui/material";
import { Editor } from "@tiptap/react";
import { HistoryState } from "../../../hooks";
import { RecentActionsPanel } from "../../recentAction";
import styles from '../../../index.module.css';

interface UndoGroupProps {
    onSelect?: (color: string) => void;
    UndoInputRef: React.RefObject<HTMLInputElement>;
    activeEditor: Editor | null;
    historyState?: HistoryState | undefined;
    revertToAction?: (actionId: string) => void;
    trackHistoryActions?: (type: string, description: string) => void;
}

const UndoGroup: React.FC<UndoGroupProps> = ({
    UndoInputRef,
    activeEditor,
    historyState,
    revertToAction
}) => {
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

    const recents =  historyState?.recentActions || [];

    const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
        if(recents.length === 0) return;

        setAnchorEl(event.currentTarget);
        UndoInputRef.current?.click();
    };

    const handleClose = useCallback(() => {
        setAnchorEl(null);
    }, []);

    const revertActionHandler = (actionId: string) => {
        revertToAction?.(actionId);
        handleClose();
    }

    return (
        <div>
            <div className={styles["undo-group"]}>
                <button
                    onClick={() => {
                        activeEditor?.chain().focus().undo().run();
                    }}
                    disabled={!activeEditor?.can().undo()}
                    className={styles["undo-button"]}
                >
                    <span className="material-symbols-outlined">undo</span>
                </button>
                <button
                    className={styles["expand-button"]}
                    disabled={!activeEditor?.can().undo()}
                    onClick={handleClick}
                >
                    <span className="material-symbols-outlined">
                        {recents.length > 0 ? 'expand_more' : ''}
                    </span>
                </button>
            </div>
            <Popover
                open={Boolean(anchorEl)}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
            >
                <RecentActionsPanel
                    onClose={handleClose}
                    recentActions={recents}
                    onRevert={revertActionHandler}
                />
            </Popover>
        </div>
    );
};

export default UndoGroup;
