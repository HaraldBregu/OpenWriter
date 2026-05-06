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
const PERSIST_DEBOUNCE_MS = 300;

export interface EditorWidthContextValue {
	/** Current editor max-width as a whole-number percentage (1–100). */
	editorWidth: number;
	/** Update the width. Optimistic in-memory update + debounced persist to workspace.json. */
	setEditorWidth: (percentage: number) => void;
}

const EditorWidthContext = createContext<EditorWidthContextValue | undefined>(undefined);

interface EditorWidthProviderProps {
	readonly children: ReactNode;
}

function clamp(value: number): number {
	return Math.max(1, Math.min(100, Math.round(value)));
}

export function EditorWidthProvider({ children }: EditorWidthProviderProps): ReactElement {
	const [editorWidth, setEditorWidthState] = useState<number>(DEFAULT_EDITOR_WIDTH);
	const mountedRef = useRef(true);

	const refresh = useCallback(async () => {
		try {
			const info = await window.workspace.getProjectInfo();
			if (!mountedRef.current) return;
			const next = info?.editorWidth;
			setEditorWidthState(typeof next === 'number' ? clamp(next) : DEFAULT_EDITOR_WIDTH);
		} catch {
			if (mountedRef.current) setEditorWidthState(DEFAULT_EDITOR_WIDTH);
		}
	}, []);

	const persist = useMemo(
		() =>
			debounce(
				(value: number) => {
					void window.workspace.updateEditorWidth(value).catch(() => {
						// Validation failures are the only expected error; the optimistic
						// in-memory value is harmless if the IPC call rejects.
					});
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
			}
		});
		return () => {
			mountedRef.current = false;
			unsubscribeWorkspace();
			persist.flush();
			persist.cancel();
		};
	}, [refresh, persist]);

	const setEditorWidth = useCallback(
		(percentage: number) => {
			const next = clamp(percentage);
			setEditorWidthState(next);
			persist(next);
		},
		[persist]
	);

	const value = useMemo<EditorWidthContextValue>(
		() => ({ editorWidth, setEditorWidth }),
		[editorWidth, setEditorWidth]
	);

	return <EditorWidthContext.Provider value={value}>{children}</EditorWidthContext.Provider>;
}

export function useEditorWidthContext(): EditorWidthContextValue {
	const ctx = useContext(EditorWidthContext);
	if (!ctx) throw new Error('useEditorWidthContext must be used within EditorWidthProvider');
	return ctx;
}
