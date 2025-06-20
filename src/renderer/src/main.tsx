import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from "./App";
import store from "./store/store";
import { Provider } from "react-redux";
import { ThemeProvider } from "./providers/theme-provider";
import './index.css'

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error("Impossible to find the root element");
}

createRoot(rootElement).render(
  <Provider store={store}>
    <ThemeProvider defaultTheme="system" storageKey="criterion-ui-theme">
      <StrictMode>
        <App />
      </StrictMode>
    </ThemeProvider>
  </Provider>
)
