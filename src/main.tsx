// import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import '@mantine/core/styles.css'
import QA from './QA.tsx'
import { MantineProvider } from '@mantine/core'

createRoot(document.getElementById('root')!).render(
  // <StrictMode>
  <MantineProvider>
    <QA />
  </MantineProvider>,
  // </StrictMode>,
)
