import { useState } from "react";

interface TreeItemProps {
    title: string;
    children?: React.ReactNode;
}

export function TreeItem({ title, children }: TreeItemProps) {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div>
            <div className="text-sm" onClick={() => setIsOpen(!isOpen)}>
                <div>{children ? (isOpen ? "-" : "+") : ""}</div>
                <div>{title}</div>
            </div>
            {isOpen && <div className="text-sm">{children}</div>}
        </div>
    );
}

export function TreeView({ children }) {
    return <>{children}</>;
}
