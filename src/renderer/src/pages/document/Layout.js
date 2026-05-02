import { jsx as _jsx } from "react/jsx-runtime";
import { useParams } from 'react-router-dom';
import { Provider } from './Provider';
export default function Layout({ children }) {
    const { id } = useParams();
    return (_jsx(Provider, { documentId: id, children: children }, id));
}
