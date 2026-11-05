import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles.css'
import { registerServiceWorker } from './registerServiceWorker'

const root = document.getElementById('root')

if (!root) {
  throw new Error('Die App konnte nicht initialisiert werden.')
}

createRoot(root).render(<App />)
registerServiceWorker()
