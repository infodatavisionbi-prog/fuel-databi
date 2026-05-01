import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const appVersion = window.__FUEL_APP_VERSION__ || __FUEL_APP_VERSION__ || 'dev'
const versionKey = 'fuel.datavision.appVersion'

const previousVersion = localStorage.getItem(versionKey)
localStorage.setItem(versionKey, appVersion)

if (previousVersion && previousVersion !== appVersion) {
  window.location.reload()
} else {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>
  )
}
