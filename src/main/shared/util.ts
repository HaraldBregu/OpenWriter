import { is } from "@electron-toolkit/utils";
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
