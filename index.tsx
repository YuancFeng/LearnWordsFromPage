/**
 * LingoRecall AI - Popup Entry Point
 * Story 3.3 - 集成复习功能入口
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
// 初始化 i18n（必须在 App 之前导入）
import './src/i18n';
import { App } from './src/popup/App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
