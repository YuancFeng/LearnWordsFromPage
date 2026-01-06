
export interface Tag {
  id: string;
  name: string;
  color: string; // Tailwind color class like 'bg-yellow-200'
}

export interface WordRecord {
  id: string;
  text: string;
  meaning: string;
  pronunciation: string;
  exampleSentence: string;
  sourceUrl: string;
  sourceTitle: string;
  tagId: string;
  createdAt: number;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export type AIProvider = 'gemini' | 'cli-proxy' | 'ollama' | 'custom';

export interface AIConfig {
  provider: AIProvider;
  proxyUrl: string;
  modelId: string;
}

export type View = 'reader' | 'vocabulary' | 'settings';
