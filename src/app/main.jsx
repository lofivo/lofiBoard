import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import 'katex/dist/katex.min.css';
import '../styles.css';

const root = createRoot(document.querySelector('#app'));
root.render(<App />);
