import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Only load pwa-elements in web browser, not in native WebView
// This prevents crashes on older Android WebViews
try {
  const { defineCustomElements } = await import('@ionic/pwa-elements/loader');
  defineCustomElements(window);
} catch (e) {
  console.warn('pwa-elements failed to load:', e);
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
