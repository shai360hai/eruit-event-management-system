import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { supabase } from './supabase'

async function init() {
  // Handle OAuth callback - look for hash or code in URL
  const hash = window.location.hash
  const search = window.location.search

  if (hash.includes('access_token') || search.includes('code=')) {
    const { data, error } = await supabase.auth.getSessionFromUrl()
    if (!error && data.session) {
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }

  ReactDOM.createRoot(document.getElementById('root')).render(<App />)
}

init()
