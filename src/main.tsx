import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { seedIfEmpty } from './db/repository';
import './index.css';

seedIfEmpty();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
