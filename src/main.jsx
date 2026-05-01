import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const appVersion = window.__FUEL_APP_VERSION__ || __FUEL_APP_VERSION__ || 'dev'
const versionKey = 'fuel.datavision.appVersion'
const reloadKey = 'fuel.datavision.reloadVersion'

async function clearBrowserCaches() {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations().catch(() => [])
    await Promise.all(registrations.map(reg => reg.unregister().catch(() => false)))
  }

  if ('caches' in window) {
    const names = await caches.keys().catch(() => [])
    await Promise.all(names.map(name => caches.delete(name).catch(() => false)))
  }
}

const previousVersion = localStorage.getItem(versionKey)
if (previousVersion && previousVersion !== appVersion && sessionStorage.getItem(reloadKey) !== appVersion) {
  localStorage.setItem(versionKey, appVersion)
  sessionStorage.setItem(reloadKey, appVersion)
  clearBrowserCaches().finally(() => window.location.reload())
} else {
  localStorage.setItem(versionKey, appVersion)
  sessionStorage.removeItem(reloadKey)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
