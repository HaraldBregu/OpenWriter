import { dialog, BrowserWindow } from 'electron'

export interface DialogResult {
  type: 'open' | 'save' | 'message' | 'error'
  timestamp: number
  data: Record<string, unknown>
}

export class DialogService {
  private getParent(): BrowserWindow | undefined {
    return BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0] || undefined
  }

  async showOpenDialog(): Promise<DialogResult> {
    const result = await dialog.showOpenDialog(this.getParent()!, {
      properties: ['openFile'],
      filters: [
        { name: 'All Files', extensions: ['*'] }
      ]
    })

    return {
      type: 'open',
      timestamp: Date.now(),
      data: {
        canceled: result.canceled,
        filePaths: result.filePaths
      }
    }
  }

  async showSaveDialog(): Promise<DialogResult> {
    const result = await dialog.showSaveDialog(this.getParent()!, {
      defaultPath: 'untitled.txt',
      filters: [
        { name: 'Text Files', extensions: ['txt', 'md', 'json'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })

    return {
      type: 'save',
      timestamp: Date.now(),
      data: {
        canceled: result.canceled,
        filePath: result.filePath || null
      }
    }
  }

  async showMessageBox(
    message: string,
    detail: string,
    buttons: string[]
  ): Promise<DialogResult> {
    const result = await dialog.showMessageBox(this.getParent()!, {
      type: 'info',
      title: 'Message',
      message,
      detail,
      buttons: buttons.length > 0 ? buttons : ['OK'],
      defaultId: 0
    })

    return {
      type: 'message',
      timestamp: Date.now(),
      data: {
        response: result.response,
        buttonClicked: (buttons.length > 0 ? buttons : ['OK'])[result.response] || 'Unknown',
        checkboxChecked: result.checkboxChecked
      }
    }
  }

  async showErrorDialog(title: string, content: string): Promise<DialogResult> {
    dialog.showErrorBox(title, content)

    return {
      type: 'error',
      timestamp: Date.now(),
      data: {
        title,
        content
      }
    }
  }
}
