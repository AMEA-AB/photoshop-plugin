import '@babel/polyfill';
import { createRoot } from 'react-dom/client';
import React from 'react';

import App from './App';

// Render dialog to DOM, this will show the UI in the container, like a panel
const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);
