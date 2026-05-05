import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import '../../supabase/check-tables.js'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
