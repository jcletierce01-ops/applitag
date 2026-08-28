import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ErrorBoundary } from './shared/ErrorBoundary.jsx'
import { assertEnv } from './config/validateEnv.js'

assertEnv()

createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
)