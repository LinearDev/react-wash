import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './Term.tsx'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App isLeftData={true} os={"linux"}/>
  </React.StrictMode>
)
