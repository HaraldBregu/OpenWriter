import { is, platform } from "@electron-toolkit/utils";
import { app } from "electron";
import path from "path";
import url from 'url'

// Helpers
export const getLocalesPath = (): string => {
  return is.dev
    ? path.join(app.getAppPath(), "i18n")
    : path.join(process.resourcesPath, "i18n");
};

export function getTemplatesPath(): string {
  return is.dev
    ? path.join(app.getAppPath(), 'buildResources', 'templates')
    : path.join(process.resourcesPath, 'buildResources', 'templates')
}

export function getCachePath(): string {
  return is.dev
    ? path.join(app.getAppPath(), '.cache')
    : path.join(process.resourcesPath, '.cache')
}

export function getStylesPath(): string {
  return is.dev
    ? path.join(app.getAppPath(), 'buildResources', 'styles')
    : path.join(process.resourcesPath, 'buildResources', 'styles')
}

export function getRootUrl(): string {
  // Must add a # because we are using hash routing.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    return process.env['ELECTRON_RENDERER_URL']! + '#'
  } else {
    return (
      url.format({
        pathname: path.join(__dirname, '../renderer/index.html'),
        protocol: 'file:',
        slashes: true
      }) + '#'
    )
  }
}

export const getShortcutLabel = (shortcut: string): string => {
  const isMacOS = platform.isMacOS

  return shortcut
    .replace(/CmdOrCtrl/g, isMacOS ? '⌘' : 'Ctrl')
    .replace(/Alt/g, isMacOS ? '⌥' : 'Alt')
    .replace(/Shift/g, isMacOS ? '⇧' : 'Shift')
    .replace(/Del/g, isMacOS ? '⌫' : 'Del')
    .replace(/Enter/g, isMacOS ? '⏎' : 'Enter')
    .replace(/Fn/g, isMacOS ? 'fn' : 'Fn')
    .replace(/\+/g, '+'); // Keep "+" signs
};