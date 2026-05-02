import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { ContentProvider, useContentContext } from './Provider';
import { useAppSelector } from '@/store';
import { selectCurrentWorkspacePath } from '@/store/workspace';
function Bootstrap() {
    const { setContents, setIsLoading } = useContentContext();
    const workspacePath = useAppSelector(selectCurrentWorkspacePath);
    useEffect(() => {
        let active = true;
        const loadContents = async () => {
            setIsLoading(true);
            try {
                const items = await window.workspace.getContents();
                if (!active)
                    return;
                setContents(items);
            }
            catch {
                if (!active)
                    return;
                setContents([]);
            }
            finally {
                if (active) {
                    setIsLoading(false);
                }
            }
        };
        void loadContents();
        return () => {
            active = false;
        };
    }, [setContents, setIsLoading, workspacePath]);
    return null;
}
export default function Layout({ children }) {
    return (_jsxs(ContentProvider, { children: [_jsx(Bootstrap, {}), children] }));
}
