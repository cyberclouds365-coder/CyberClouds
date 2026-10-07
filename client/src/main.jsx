import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
import './portal.css';
import './reading.css';
import './reading-enhancements.css';
import './admin-management.css';
import './cyberclouds.css';
import './admin-addons.css';
import './type-scale.css';
import './cyberclouds-polish.css';
import './payment.css';
import './content-view.css';
import './library-layout.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
