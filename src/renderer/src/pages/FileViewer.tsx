import { useIpcRenderer } from "@/hooks/use-ipc-renderer"
import { useState } from "react"

export default function FileViewer() {
    const [filePath, setFilePath] = useState<string | null>(null)

    useIpcRenderer((ipc) => {
        ipc.on('load-file-at-path', async (_: any, filepath: string) => {
            setFilePath(filepath)
        })
    })

    return (
        <iframe
            src={`local-resource:///${filePath}`}
            style={{
                width: '100%',
                height: '100vh',
                border: 'none'
            }}
            title="File Viewer"
        />
    )
}