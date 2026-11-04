import React from 'react'
import ReactDOM from 'react-dom/client'
import axios from 'axios'
import App from './App.jsx'
import './index.css'

const apiUrl = import.meta.env.VITE_API_URL;
if (apiUrl) {
  axios.defaults.baseURL = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
