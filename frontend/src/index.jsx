import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { cornerRadius, cornerRadiusTheme } from './theme/cornerRadius';

for (const [name, value] of Object.entries(cornerRadius)) {
  document.documentElement.style.setProperty(`--ui-radius-${name}`, `${value}px`);
}

// Static Ant Design dialogs and notifications render outside the app tree.
ConfigProvider.config({
  holderRender: children => <ConfigProvider theme={cornerRadiusTheme}>{children}</ConfigProvider>,
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ConfigProvider theme={cornerRadiusTheme}>
      <App />
    </ConfigProvider>
  </React.StrictMode>
);
reportWebVitals();
