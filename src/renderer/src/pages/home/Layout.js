import { jsx as _jsx } from "react/jsx-runtime";
import { Provider } from './Provider';
export default function Layout({ children }) {
    return _jsx(Provider, { children: children });
}
