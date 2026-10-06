import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Шрифты подключаются локально (без Google Fonts): быстрее, без сдвигов и без передачи IP посетителей третьим лицам
import '@fontsource-variable/inter'
import '@fontsource-variable/manrope'
import App from './routes/App'
import './styles/index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
