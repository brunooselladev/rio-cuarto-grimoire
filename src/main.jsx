import { createRoot } from 'react-dom/client';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { POIProvider } from './contexts/POIContext.jsx';
import App from './App.jsx';
import './index.css';

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <AuthProvider>
      <POIProvider>
        <App />
      </POIProvider>
    </AuthProvider>
  );
}
