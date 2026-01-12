module.exports = {
  // 使用 class 策略：通过 document.documentElement 上的 'dark' class 控制
  darkMode: 'class',
  content: [
    './popup.html',
    './index.html',
    './index.tsx',
    './components/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
