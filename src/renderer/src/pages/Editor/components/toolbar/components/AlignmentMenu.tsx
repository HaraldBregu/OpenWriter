import { memo } from 'react';
import { Editor } from '@tiptap/react';
import styles from '../../../index.module.css';


interface AlignmentMenuProps {
    show: boolean;
    onClose: () => void;
    editor: Editor | null;
}

const AlignmentMenu = memo(({ show, onClose, editor }: AlignmentMenuProps) => {
    if (!show) return null;

    const alignments = [
        { value: 'left', icon: 'format_align_left' },
        { value: 'center', icon: 'format_align_center' },
        { value: 'right', icon: 'format_align_right' },
        { value: 'justify', icon: 'format_align_justify' }
    ];

    const handleAlign = (alignment: string) => {
        editor?.chain().focus().setTextAlign(alignment).run();
        onClose();
    };

    return (
        <div className={styles["alignment-menu-container"]}>
            <div className={styles["alignment-menu"]}>
                {alignments.map(({ value, icon }) => (
                    <button
                        key={value}
                        onClick={() => handleAlign(value)}
                        style={{ textAlign: 'center', justifyContent: 'center', margin: 0 }}
                        className={editor?.isActive({ textAlign: value }) ? 'active' : ''}
                    >
                        <span className="material-outlined-symbol">{icon}</span>
                    </button>
                ))}
            </div>
        </div>
    );
});

export default AlignmentMenu;