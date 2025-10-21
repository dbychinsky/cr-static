import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import * as serviceWorkerRegistration from './serviceWorkerRegistration'
import { ThemeProvider, CssBaseline, createTheme } from '@mui/material'

// Создаём MUI тёмную тему
const darkTheme = createTheme({
    palette: {
        mode: 'dark',
        primary: { main: '#1976d2' },
        background: { default: '#1E1E1E', paper: '#2A2A2A' },
    },
    typography: {
        fontFamily: 'Roboto, sans-serif',
    },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ThemeProvider theme={darkTheme}>
            <CssBaseline />
            <App />
        </ThemeProvider>
    </React.StrictMode>
)

// Корректная регистрация Service Worker
if ('serviceWorker' in navigator) {
    try {
        serviceWorkerRegistration.register()
    } catch (err) {
        console.error('Service Worker registration failed:', err)
    }
}
