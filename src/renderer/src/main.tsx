import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from "./App";
import './i18n'
import '@fontsource/merriweather/300.css'
import '@fontsource/merriweather/400.css'
import '@fontsource/merriweather/700.css'
import '@fontsource/merriweather/900.css'
import '@fontsource/merriweather/300-italic.css'
import '@fontsource/merriweather/400-italic.css'
import '@fontsource/merriweather/700-italic.css'
import '@fontsource/merriweather/900-italic.css'
import './index.css'

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error("Impossible to find the root element");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
)