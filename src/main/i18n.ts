import path from 'node:path'
import { readFileSync } from 'node:fs'
import { is } from '@electron-toolkit/utils'

export type Translations = Record<string, Record<string, string> | string>

export function loadTranslations(lng: string): Translations {
  const filePath = is.dev
    ? path.join(__dirname, `../../resources/internationalization/${lng}/translation.json`)
    : path.join(process.resourcesPath, `resources/internationalization/${lng}/translation.json`)
  return JSON.parse(readFileSync(filePath, 'utf-8'))
}
