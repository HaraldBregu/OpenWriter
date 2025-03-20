import React from 'react';
import { EditorContent, Editor } from '@tiptap/react';
import styles from '../../index.module.css';

interface EditorWrapperProps {
  title: string;
  editor: Editor | null;
  setActiveEditor: (editor: Editor) => void;
}

const EditorTextArea: React.FC<EditorWrapperProps> = ({ title, editor, setActiveEditor }) => {
  return (
    <>
      <div className={styles["editor-content-wrapper"]}>
        <div className={styles["text-container"]}>
          <span className={styles["text-lg"]}>{title}</span>
        </div>
        <EditorContent editor={editor} className={styles["editor-content"]} onClick={() => setActiveEditor(editor!)} />
      </div>
    </>
  );
};

export default EditorTextArea;
