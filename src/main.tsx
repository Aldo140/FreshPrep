import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {CodeFinderPage} from './features/codefinder/CodeFinderPage.tsx';
import './index.css';

// No router library in this app — it's otherwise a single state-driven page.
// One extra real URL (/codefinder) doesn't justify pulling in react-router,
// so this is a minimal manual switch instead.
const isCodeFinder = /\/codefinder\/?$/.test(window.location.pathname);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isCodeFinder ? <CodeFinderPage /> : <App />}
  </StrictMode>,
);
