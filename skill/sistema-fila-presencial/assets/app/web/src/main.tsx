import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/plus-jakarta-sans/500.css';
import '@fontsource/plus-jakarta-sans/600.css';
import '@fontsource/plus-jakarta-sans/700.css';
import '@fontsource/plus-jakarta-sans/800.css';
import '@fontsource-variable/jetbrains-mono';
import App from './App';
import './index.css';

function montar() {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

// Demonstração (vite build --mode demo): troca o servidor por uma API simulada no navegador.
// Fora do modo demo este trecho é removido do build.
if (import.meta.env.MODE === 'demo') {
  void import('./demo/demoApi').then(({ instalarDemo }) => {
    instalarDemo();
    montar();
  });
} else {
  montar();
}
