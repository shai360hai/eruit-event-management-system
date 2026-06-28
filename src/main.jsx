import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { supabase } from './supabase'

// Handle OAuth redirect — exchange code for session
const params = new URLSearchParams(window.location.search)
const code = params.get('code')

if (code) {
  supabase.auth.exchangeCodeForSession(code).then(() => {
    // Clean URL and reload
    window.history.replaceState({}, '', window.location.pathname)
    window.location.reload()
  })
} else {
  ReactDOM.createRoot(document.getElementById('root')).render(<App />)
}
