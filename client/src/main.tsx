import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Extend window interface for Meta Pixel
declare global {
  interface Window {
    fbq: any;
    _fbq: any;
  }
}

// Initialize Meta Pixel
(function() {
  // Check if already loaded
  if ((window as any).fbq) return;

  // Initialize Facebook Pixel function
  const fbq = function(...args: any[]) {
    if (fbq.callMethod) {
      fbq.callMethod.apply(fbq, args);
    } else {
      fbq.queue.push(args);
    }
  };

  (window as any).fbq = fbq;
  if (!(window as any)._fbq) (window as any)._fbq = fbq;
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = '2.0';
  fbq.queue = [];

  // Load the Facebook Pixel script
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://connect.facebook.net/en_US/fbevents.js';
  const firstScript = document.getElementsByTagName('script')[0];
  if (firstScript && firstScript.parentNode) {
    firstScript.parentNode.insertBefore(script, firstScript);
  }

  // Initialize with your Pixel ID and track PageView
  (window as any).fbq('init', '1327769082180305');
  (window as any).fbq('track', 'PageView');

  // Add noscript fallback for users with JavaScript disabled
  const noscript = document.createElement('noscript');
  const img = document.createElement('img');
  img.height = 1;
  img.width = 1;
  img.style.display = 'none';
  img.src = 'https://www.facebook.com/tr?id=1327769082180305&ev=PageView&noscript=1';
  noscript.appendChild(img);
  document.body.appendChild(noscript);
})();

// Register service worker for PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
