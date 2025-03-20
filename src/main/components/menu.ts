import { BrowserWindow, Menu, MenuItemConstructorOptions } from 'electron'
import i18next from 'i18next'
import path from 'path'
import { isDev } from '../utils/util.js'
import { mainLogger } from '../utils/logger.js'
import {
  changeCapitalization,
  changeCharacterSpacing,
  changeCharacterStyle,
  changeIndentLevel,
  changeLigature,
  changeListStyle,
  changeSpacing,
  changeSpacingSetting,
  changeTextAlignment,
  insertComment,
  setRedo,
  setUndo
} from '../webContentsHandler'
import { changeLanguageGlobal } from '../index'

export const BuildElectronMenu = (
  mainWindow: BrowserWindow,
  openRecentFile: (window: BrowserWindow, filePath: string) => void,
  newFile: (window: BrowserWindow) => void,
  openFile: (window: BrowserWindow) => void,
  // @ts-ignore
  clearStorageData: (window: BrowserWindow) => void,
  saveCurrentDocument: (window: BrowserWindow) => void,
  recentDocuments: string[]
) => {
  const taskId = mainLogger.startTask('BuildElectronMenu', 'Building the Electron menu.')
  const translations = i18next.t
  try {
    const devMenu: MenuItemConstructorOptions[] = [
      {
        label: 'Developer',
        submenu: [
          {
            label: translations('menu.reload'),
            accelerator: 'CmdOrCtrl+R',
            click: (_, focusedWindow) => {
              if (focusedWindow) (focusedWindow as BrowserWindow).reload()
            }
          },
          {
            label: translations('menu.toggleDevTools'),
            accelerator: 'Alt+CmdOrCtrl+I',
            click: (_, focusedWindow) => {
              if (focusedWindow) (focusedWindow as BrowserWindow).webContents.toggleDevTools()
            }
          }
        ]
      },
      {
        label: translations('menu.language.label'),
        submenu: [
          { label: translations('menu.language.en'), click: () => changeLanguageGlobal('en') },
          { label: translations('menu.language.it'), click: () => changeLanguageGlobal('it') }
        ]
      }
    ]

    const recentDocumentsMenu =
      recentDocuments.length > 0
        ? recentDocuments
            .slice()
            .reverse()
            .map((doc: string) => ({
              label: path.basename(doc),
              click: () => {
                openRecentFile(mainWindow, doc)
              }
            }))
        : [
            {
              label: 'No Recent Documents',
              enabled: false
            }
          ]

    const menuTemplate: MenuItemConstructorOptions[] = [
      {
        label: translations('menu.file'),
        submenu: [
          {
            label: translations('menu.new'),
            accelerator: 'CmdOrCtrl+N',
            click: () => {
              newFile(mainWindow)
            }
          },
          {
            label: translations('menu.open'),
            accelerator: 'CmdOrCtrl+O',
            click: () => {
              openFile(mainWindow)
            }
          },
          {
            label: translations('menu.openRecent'),
            submenu: recentDocumentsMenu
          },
          {
            label: translations('menu.save'),
            accelerator: 'CmdOrCtrl+S',
            click: () => {
              saveCurrentDocument(mainWindow)
            }
          },
          { type: 'separator' },
          {
            label: translations('menu.close'),
            accelerator: 'CmdOrCtrl+W'
          }
        ]
      },
      {
        label: translations('menu.edit.label'),
        submenu: [
          {
            label: translations('menu.undo'),
            accelerator: 'CmdOrCtrl+Z',
            click: () => {
              setUndo(mainWindow)
            }
          },
          {
            label: translations('menu.redo'),
            accelerator: 'CmdOrCtrl+Y',
            click: () => {
              setRedo(mainWindow)
            }
          }
        ]
      },
      {
        label: translations('menu.insert.label'),
        submenu: [
          {
            label: translations('menu.insert.comment'),
            accelerator: 'CmdOrCtrl+Alt+M',
            click: () => {
              insertComment(mainWindow)
            }
          }
        ]
      },
      {
        label: translations('menu.format.label'),
        submenu: [
          {
            label: translations('menu.format.font.label'),
            submenu: [
              {
                label: translations('menu.format.font.bold'),
                click: () => changeCharacterStyle(mainWindow, 'bold')
              },
              {
                label: translations('menu.format.font.italic'),
                click: () => changeCharacterStyle(mainWindow, 'italic')
              },
              {
                label: translations('menu.format.font.underline'),
                click: () => changeCharacterStyle(mainWindow, 'underline')
              },
              {
                label: translations('menu.format.font.strikethrough'),
                click: () => changeCharacterStyle(mainWindow, 'strikethrough')
              },
              { type: 'separator' },
              {
                label: translations('menu.format.font.captalization.label'),
                submenu: [
                  {
                    label: translations('menu.format.font.captalization.allCaps'),
                    click: () => changeCapitalization(mainWindow, 'allCaps')
                  },
                  {
                    label: translations('menu.format.font.captalization.smallCaps'),
                    click: () => changeCapitalization(mainWindow, 'smallCaps')
                  },
                  {
                    label: translations('menu.format.font.captalization.titleCase'),
                    click: () => changeCapitalization(mainWindow, 'titleCase')
                  },
                  {
                    label: translations('menu.format.font.captalization.startCase'),
                    click: () => changeCapitalization(mainWindow, 'startCase')
                  },
                  {
                    label: translations('menu.format.font.captalization.none'),
                    click: () => changeCapitalization(mainWindow, 'none')
                  }
                ]
              },
              {
                label: translations('menu.format.font.ligature.label'),
                submenu: [
                  {
                    label: translations('menu.format.font.ligature.default'),
                    click: () => changeLigature(mainWindow, 'standard')
                  },
                  {
                    label: translations('menu.format.font.ligature.none'),
                    click: () => changeLigature(mainWindow, 'none')
                  },
                  {
                    label: translations('menu.format.font.ligature.all'),
                    click: () => changeLigature(mainWindow, 'all')
                  }
                ]
              },
              {
                label: translations('menu.format.font.characterSpacing.label'),
                submenu: [
                  {
                    label: translations('menu.format.font.characterSpacing.normal'),
                    click: () => changeCharacterSpacing(mainWindow, 'normal')
                  },
                  {
                    label: translations('menu.format.font.characterSpacing.tighten'),
                    click: () => changeCharacterSpacing(mainWindow, 'tighten')
                  },
                  {
                    label: translations('menu.format.font.characterSpacing.loosen'),
                    click: () => changeCharacterSpacing(mainWindow, 'loosen')
                  }
                ]
              }
            ]
          },
          {
            label: translations('menu.format.text.label'),
            submenu: [
              {
                label: translations('menu.format.text.alignLeft'),
                click: () => changeTextAlignment(mainWindow, 'left')
              },
              {
                label: translations('menu.format.text.alignCenter'),
                click: () => changeTextAlignment(mainWindow, 'center')
              },
              {
                label: translations('menu.format.text.alignRight'),
                click: () => changeTextAlignment(mainWindow, 'right')
              },
              {
                label: translations('menu.format.text.justify'),
                click: () => changeTextAlignment(mainWindow, 'justify')
              },
              { type: 'separator' },
              {
                label: translations('menu.format.text.increaseIndent'),
                click: () => changeIndentLevel(mainWindow, true)
              },
              {
                label: translations('menu.format.text.decreaseIndent'),
                click: () => changeIndentLevel(mainWindow, false)
              },
              { type: 'separator' },
              {
                label: translations('menu.format.text.spacing.label'),
                submenu: [
                  {
                    label: translations('menu.format.text.spacing.single'),
                    click: () => changeSpacing(mainWindow, '1')
                  },
                  {
                    label: '1.5x',
                    click: () => changeSpacing(mainWindow, '1.5')
                  },
                  {
                    label: translations('menu.format.text.spacing.double'),
                    click: () => changeSpacing(mainWindow, '2')
                  },
                  { type: 'separator' },
                  {
                    label: translations('menu.format.text.spacing.customSpacing'),
                    click: () => changeSpacingSetting(mainWindow)
                  }
                ]
              }
            ]
          },
          {
            label: translations('menu.format.list.label'),
            submenu: [
              {
                label: translations('menu.format.list.bullet'),
                click: () => changeListStyle(mainWindow, 'bullet')
              },
              {
                label: translations('menu.format.list.numbering'),
                click: () => changeListStyle(mainWindow, 'numbering')
              }
            ]
          }
        ]
      },
      ...(isDev() ? devMenu : [])
    ]

    const menu = Menu.buildFromTemplate(menuTemplate)
    mainLogger.endTask(taskId, 'BuildElectronMenu', 'Electron menu built successfully.')
    return menu
  } catch (error) {
    mainLogger.error('BuildElectronMenu', 'Error building the Electron menu.', error as Error)
    return null
  }
}
