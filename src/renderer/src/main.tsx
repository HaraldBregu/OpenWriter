import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from "./App";
import store from "./store/store";
import { Provider } from "react-redux";
import './index.css'
import '@material-symbols/font-400/outlined.css'
import '@material-design-icons/font/index.css'

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error("Impossible to find the root element");
}

createRoot(rootElement).render(
  <Provider store={store}>
    <StrictMode>
      <App />
    </StrictMode>
  </Provider>
)
