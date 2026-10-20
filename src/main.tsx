import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from 'next-themes'
import { TooltipProvider } from '@/components/ui/tooltip'
import './index.css'
import App from './App.tsx'

// After a new deploy, an open tab can still point at page files that no longer exist. Reload once to pick up the new build.
window.addEventListener('vite:preloadError', () => {
  if (sessionStorage.getItem('workmate-reloaded')) return
  sessionStorage.setItem('workmate-reloaded', '1')
  window.location.reload()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="workmate-theme">
      <TooltipProvider delayDuration={200}>
        <App />
      </TooltipProvider>
    </ThemeProvider>
  </StrictMode>,
)
