import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
	type ReactElement,
	type ReactNode,
} from 'react';
import { debounce } from 'lodash';

const DEFAULT_EDITOR_WIDTH = 70;
const DEFAULT_TEXT_SIZE = 100;
const PERSIST_DEBOUNCE_MS = 300;

export interface EditorPrefsContextValue {
	/** Current editor max-width as a whole-number percentage (1–100). */
	editorWidth: number;
	/** Current editor text size as a whole-number percentage (50–300). */
	textSize: number;
	/** Update the width. Optimistic in-memory update + debounced persist to workspace.json. */
	setEditorWidth: (percentage: number) => void;
	/** Update the text size. Optimistic in-memory update + debounced persist to workspace.json. */
	setTextSize: (percentage: number) => void;
}

const EditorPrefsContext = createContext<EditorPrefsContextValue | undefined>(undefined);

interface EditorPrefsProviderProps {
	readonly children: ReactNode;
}

function clampWidth(value: number): number {
	return Math.max(1, Math.min(100, Math.round(value)));
}

function clampTextSize(value: number): number {
	return Math.max(50, Math.min(300, Math.round(value)));
}

export function EditorPrefsProvider({ children }: EditorPrefsProviderProps): ReactElement {
	const [editorWidth, setEditorWidthState] = useState<number>(DEFAULT_EDITOR_WIDTH);
	const [textSize, setTextSizeState] = useState<number>(DEFAULT_TEXT_SIZE);
	const mountedRef = useRef(true);

	const refresh = useCallback(async () => {
		try {
			const info = await window.workspace.getProjectInfo();
			if (!mountedRef.current) return;
			const w = info?.editorWidth;
			const t = info?.textSize;
			setEditorWidthState(typeof w === 'number' ? clampWidth(w) : DEFAULT_EDITOR_WIDTH);
			setTextSizeState(typeof t === 'number' ? clampTextSize(t) : DEFAULT_TEXT_SIZE);
		} catch {
			if (!mountedRef.current) return;
			setEditorWidthState(DEFAULT_EDITOR_WIDTH);
			setTextSizeState(DEFAULT_TEXT_SIZE);
		}
	}, []);

	const persistWidth = useMemo(
		() =>
			debounce(
				(value: number) => {
					void window.workspace.updateEditorWidth(value).catch(() => {});
				},
				PERSIST_DEBOUNCE_MS,
				{ leading: false, trailing: true }
			),
		[]
	);

	const persistTextSize = useMemo(
		() =>
			debounce(
				(value: number) => {
					void window.workspace.updateTextSize(value).catch(() => {});
				},
				PERSIST_DEBOUNCE_MS,
				{ leading: false, trailing: true }
			),
		[]
	);

	useEffect(() => {
		mountedRef.current = true;
		void refresh();
		const unsubscribeWorkspace = window.workspace.onChange((event) => {
			if (event.currentPath) {
				void refresh();
			} else {
				setEditorWidthState(DEFAULT_EDITOR_WIDTH);
				setTextSizeState(DEFAULT_TEXT_SIZE);
			}
		});
		return () => {
			mountedRef.current = false;
			unsubscribeWorkspace();
			persistWidth.flush();
			persistWidth.cancel();
			persistTextSize.flush();
			persistTextSize.cancel();
		};
	}, [refresh, persistWidth, persistTextSize]);

	const setEditorWidth = useCallback(
		(percentage: number) => {
			const next = clampWidth(percentage);
			setEditorWidthState(next);
			persistWidth(next);
		},
		[persistWidth]
	);

	const setTextSize = useCallback(
		(percentage: number) => {
			const next = clampTextSize(percentage);
			setTextSizeState(next);
			persistTextSize(next);
		},
		[persistTextSize]
	);

	const value = useMemo<EditorPrefsContextValue>(
		() => ({ editorWidth, textSize, setEditorWidth, setTextSize }),
		[editorWidth, textSize, setEditorWidth, setTextSize]
	);

	return <EditorPrefsContext.Provider value={value}>{children}</EditorPrefsContext.Provider>;
}

export function useEditorPrefsContext(): EditorPrefsContextValue {
	const ctx = useContext(EditorPrefsContext);
	if (!ctx) throw new Error('useEditorPrefsContext must be used within EditorPrefsProvider');
	return ctx;
}
