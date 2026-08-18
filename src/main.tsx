import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Drop any stale /sw.js registration (old cached Workbox build) so the new
// /sw-v2.js push handler takes over for returning visitors.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((reg) => {
      const url = reg.active?.scriptURL || reg.installing?.scriptURL || reg.waiting?.scriptURL || '';
      if (url.endsWith('/sw.js')) reg.unregister();
    });
  }).catch(() => {});
}

createRoot(document.getElementById("root")!).render(<App />);
