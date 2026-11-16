
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { mockFetch } from "./api/mockFetch.js";
import App from './App.jsx'

import './index.css'


const VITE_TEST_API = import.meta.env.VITE_TEST_API ? import.meta.env.VITE_TEST_API : ""
if (VITE_TEST_API === "true") {
  window.fetch = mockFetch;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
