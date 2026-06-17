import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { BusinessProvider } from './context/BusinessContext'
import App from './App.jsx'

// Register service worker for PWA support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BusinessProvider>
      <App />
    </BusinessProvider>
  </StrictMode>,
)
