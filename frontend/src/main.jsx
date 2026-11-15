
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// REMOVE THIS BEFORE PUSHING TO PROD 
import { mockFetch } from "./api/mockFetch.js";
window.fetch = mockFetch;
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

import App from './App.jsx'


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
