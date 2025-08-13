import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { ThemeProvider } from 'next-themes'
import { AuthProvider } from './hooks/useAuth.tsx'

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
    <AuthProvider>
      <App />
    </AuthProvider>
  </ThemeProvider>
);

