// electron.vite.config.ts
import { resolve } from "path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
var __electron_vite_injected_dirname = "C:\\Users\\ST-488\\Documents\\Projects\\criterion";
var electron_vite_config_default = defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        //'@renderer': resolve('src/renderer/src')
        "@": resolve(__electron_vite_injected_dirname, "./src/renderer/src"),
        "@utils": resolve(__electron_vite_injected_dirname, "./src/renderer/src/utils"),
        "@pages": resolve(__electron_vite_injected_dirname, "./src/renderer/src/pages"),
        "@store": resolve(__electron_vite_injected_dirname, "./src/renderer/src/store"),
        "@components": resolve(__electron_vite_injected_dirname, "./src/renderer/src/components")
      }
    },
    plugins: [react()]
  }
});
export {
  electron_vite_config_default as default
};
