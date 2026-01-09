import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { loadGoogleMaps } from './utils/loadGoogleMaps'

// Prevent numeric input from changing values on scroll
document.addEventListener('wheel', (e) => {
  if (document.activeElement.type === 'number') {
    document.activeElement.blur();
  }
});

// Load Google Maps API before rendering the app
loadGoogleMaps()
  .then(() => {
    createRoot(document.getElementById('root')).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  })
  .catch((error) => {
    console.error('Failed to load Google Maps API:', error)
    // Still render the app, but Google Maps features won't work
    createRoot(document.getElementById('root')).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  })
