/**
 * LingoRecall AI - i18n Configuration
 *
 * 国际化配置，支持 21 种语言
 * 使用 react-i18next 进行 React 组件的国际化
 *
 * @module i18n
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// 导入所有语言文件
import en from './locales/en.json';
import zhCN from './locales/zh-CN.json';
import zhTW from './locales/zh-TW.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import de from './locales/de.json';
import es from './locales/es.json';
import ru from './locales/ru.json';
import az from './locales/az.json';
import tr from './locales/tr.json';
import fr from './locales/fr.json';
import it from './locales/it.json';
import pt from './locales/pt.json';
import pl from './locales/pl.json';
import vi from './locales/vi.json';
import th from './locales/th.json';
import ar from './locales/ar.json';
import hi from './locales/hi.json';
import nl from './locales/nl.json';
import uk from './locales/uk.json';
import id from './locales/id.json';

// 语言资源配置
const resources = {
  en: { translation: en },
  'zh-CN': { translation: zhCN },
  'zh-TW': { translation: zhTW },
  ja: { translation: ja },
  ko: { translation: ko },
  de: { translation: de },
  es: { translation: es },
  ru: { translation: ru },
  az: { translation: az },
  tr: { translation: tr },
  fr: { translation: fr },
  it: { translation: it },
  pt: { translation: pt },
  pl: { translation: pl },
  vi: { translation: vi },
  th: { translation: th },
  ar: { translation: ar },
  hi: { translation: hi },
  nl: { translation: nl },
  uk: { translation: uk },
  id: { translation: id },
};

// RTL 语言列表
export const RTL_LANGUAGES = ['ar', 'he', 'fa'] as const;

/**
 * 检查语言是否为 RTL
 */
export function isRTL(lang: string): boolean {
  return RTL_LANGUAGES.includes(lang as typeof RTL_LANGUAGES[number]);
}

/**
 * Chrome 扩展语言检测器
 * 优先使用 Chrome 的 i18n API 检测语言
 */
const chromeExtensionDetector = {
  name: 'chromeExtension',
  lookup(): string | undefined {
    try {
      // Chrome 扩展环境
      if (typeof chrome !== 'undefined' && chrome.i18n?.getUILanguage) {
        return chrome.i18n.getUILanguage();
      }
    } catch {
      // 忽略错误，回退到其他检测方法
    }
    return undefined;
  },
};

// 初始化 i18n
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development',

    interpolation: {
      escapeValue: false, // React 已经处理了 XSS
    },

    detection: {
      // 检测顺序：自定义检测器 -> localStorage -> navigator
      order: ['chromeExtension', 'localStorage', 'navigator'],
      lookupLocalStorage: 'lingorecall_ui_language',
      caches: ['localStorage'],
    },
  });

// 注册自定义检测器
const languageDetector = i18n.services.languageDetector as {
  addDetector: (detector: typeof chromeExtensionDetector) => void;
};
if (languageDetector?.addDetector) {
  languageDetector.addDetector(chromeExtensionDetector);
}

// 设置初始文档方向
function updateDocumentDirection(lang: string): void {
  if (typeof document !== 'undefined') {
    document.documentElement.dir = isRTL(lang) ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }
}

// 初始化时设置方向
updateDocumentDirection(i18n.language);

// 监听语言变化事件
i18n.on('languageChanged', (lang) => {
  updateDocumentDirection(lang);
});

/**
 * 切换 UI 语言
 * @param lang - 目标语言代码
 */
export async function changeLanguage(lang: string): Promise<void> {
  await i18n.changeLanguage(lang);
  // 更新文档方向（RTL 支持）
  document.documentElement.dir = isRTL(lang) ? 'rtl' : 'ltr';
  document.documentElement.lang = lang;
  // 保存到 localStorage
  localStorage.setItem('lingorecall_ui_language', lang);
}

/**
 * 获取当前语言
 */
export function getCurrentLanguage(): string {
  return i18n.language;
}

export { useTranslation } from 'react-i18next';
export default i18n;
