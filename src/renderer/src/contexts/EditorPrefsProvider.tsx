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
import type { EditorMaxWidthType, EditorFontType } from '../../../shared/types';

const MAX_WIDTH_TYPES: readonly EditorMaxWidthType[] = ['small', 'medium', 'large', 'full'];
const DEFAULT_MAX_WIDTH_TYPE: EditorMaxWidthType = 'medium';
const FONT_TYPES: readonly EditorFontType[] = ['default', 'sans', 'serif', 'writer'];
const DEFAULT_FONT_TYPE: EditorFontType = 'default';
const DEFAULT_TEXT_SIZE = 100;
const PERSIST_DEBOUNCE_MS = 300;

export interface EditorPrefsContextValue {
	/** Current editor max-width preset. */
	maxWidthType: EditorMaxWidthType;
	/** Current editor text size as a whole-number percentage (50–300). */
	textSize: number;
	/** Current editor font preset. */
	fontType: EditorFontType;
	/** Update the max-width preset. Optimistic in-memory update + debounced persist to workspace.json. */
	setMaxWidthType: (value: EditorMaxWidthType) => void;
	/** Update the text size. Optimistic in-memory update + debounced persist to workspace.json. */
	setTextSize: (percentage: number) => void;
	/** Update the font preset. Optimistic in-memory update + debounced persist to workspace.json. */
	setFontType: (value: EditorFontType) => void;
}

const EditorPrefsContext = createContext<EditorPrefsContextValue | undefined>(undefined);

interface EditorPrefsProviderProps {
	readonly children: ReactNode;
}

function isValidMaxWidthType(value: unknown): value is EditorMaxWidthType {
	return typeof value === 'string' && (MAX_WIDTH_TYPES as readonly string[]).includes(value);
}

function clampTextSize(value: number): number {
	return Math.max(50, Math.min(300, Math.round(value)));
}

export function EditorPrefsProvider({ children }: EditorPrefsProviderProps): ReactElement {
	const [maxWidthType, setMaxWidthTypeState] = useState<EditorMaxWidthType>(DEFAULT_MAX_WIDTH_TYPE);
	const [textSize, setTextSizeState] = useState<number>(DEFAULT_TEXT_SIZE);
	const mountedRef = useRef(true);

	const refresh = useCallback(async () => {
		try {
			const info = await window.workspace.getProjectInfo();
			if (!mountedRef.current) return;
			const w = info?.maxWidthType;
			const t = info?.textSize;
			setMaxWidthTypeState(isValidMaxWidthType(w) ? w : DEFAULT_MAX_WIDTH_TYPE);
			setTextSizeState(typeof t === 'number' ? clampTextSize(t) : DEFAULT_TEXT_SIZE);
		} catch {
			if (!mountedRef.current) return;
			setMaxWidthTypeState(DEFAULT_MAX_WIDTH_TYPE);
			setTextSizeState(DEFAULT_TEXT_SIZE);
		}
	}, []);

	const persistMaxWidth = useMemo(
		() =>
			debounce(
				(value: EditorMaxWidthType) => {
					void window.workspace.updateMaxWidthType(value).catch(() => {});
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
				setMaxWidthTypeState(DEFAULT_MAX_WIDTH_TYPE);
				setTextSizeState(DEFAULT_TEXT_SIZE);
			}
		});
		return () => {
			mountedRef.current = false;
			unsubscribeWorkspace();
			persistMaxWidth.flush();
			persistMaxWidth.cancel();
			persistTextSize.flush();
			persistTextSize.cancel();
		};
	}, [refresh, persistMaxWidth, persistTextSize]);

	const setMaxWidthType = useCallback(
		(value: EditorMaxWidthType) => {
			if (!isValidMaxWidthType(value)) return;
			setMaxWidthTypeState(value);
			persistMaxWidth(value);
		},
		[persistMaxWidth]
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
		() => ({ maxWidthType, textSize, setMaxWidthType, setTextSize }),
		[maxWidthType, textSize, setMaxWidthType, setTextSize]
	);

	return <EditorPrefsContext.Provider value={value}>{children}</EditorPrefsContext.Provider>;
}

export function useEditorPrefsContext(): EditorPrefsContextValue {
	const ctx = useContext(EditorPrefsContext);
	if (!ctx) throw new Error('useEditorPrefsContext must be used within EditorPrefsProvider');
	return ctx;
}
