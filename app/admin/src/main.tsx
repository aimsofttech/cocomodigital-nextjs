import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { store } from './app/store';
import './index.css';

const rootEl = document.getElementById('root')!;

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: { background: '#1a1a1a', color: '#fff', borderRadius: '8px' },
          }}
        />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);

// Hide the HTML-level initial loader once React has painted the first frame.
// Double rAF = "wait for the browser to actually commit the paint."
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    const loader = document.getElementById('ail');
    if (!loader) return;
    loader.classList.add('ail-hide');
    setTimeout(() => {
      loader.remove();
      document.getElementById('ail-styles')?.remove();
    }, 400);
  });
});
