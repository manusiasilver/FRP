import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { configureNetworkClient } from './services/network'
import './styles/color.css'
import './styles/templateComponents.css'
import './styles/style.css'
import './theme/theme.css'

configureNetworkClient()

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <App />
  </BrowserRouter>
)
