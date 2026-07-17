import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { BcvRateProvider } from './hooks/useBcvRate'
import './index.css'
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><BcvRateProvider><App /></BcvRateProvider></React.StrictMode>)
