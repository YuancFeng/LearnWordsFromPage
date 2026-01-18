/**
 * LingoRecall AI - Options Page Entry Point
 * 独立的全屏复习和设置页面
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import '../../index.css';
// Options 页面专用样式，覆盖 popup 的固定宽度
import './options.css';
// 初始化 i18n（必须在 App 之前导入）
import '../i18n';
import { App } from './App';

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
