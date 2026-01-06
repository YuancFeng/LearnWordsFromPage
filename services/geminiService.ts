
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { AIConfig } from "../types";

/**
 * Helper to fetch from a proxy API (OpenAI compatible)
 */
async function fetchFromProxy(config: AIConfig, prompt: string, isJson: boolean = false) {
  const url = `${config.proxyUrl}/chat/completions`.replace(/\/+$/, '');
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.modelId,
      messages: [{ role: 'user', content: prompt }],
      response_format: isJson ? { type: "json_object" } : undefined
    })
  });

  if (!response.ok) {
    throw new Error(`Proxy API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * Tests if the selected AI provider is reachable.
 */
export async function testConnection(config: AIConfig): Promise<boolean> {
  if (config.provider === 'gemini') return true; // Pre-configured in Google AI Studio
  
  if (!config.proxyUrl || !config.proxyUrl.startsWith('http')) return false;

  try {
    const url = `${config.proxyUrl}/models`.replace(/\/+$/, '');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response.ok;
  } catch (e) {
    return false;
  }
}

/**
 * Fetches available models from a proxy endpoint.
 * Returns an empty array if the endpoint is unreachable or doesn't support the /models call.
 */
export async function getProxyModels(proxyUrl: string): Promise<string[]> {
  if (!proxyUrl || !proxyUrl.startsWith('http')) return [];
  
  try {
    const url = `${proxyUrl}/models`.replace(/\/+$/, '');
    // Using a controller to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) return [];
    
    const data = await response.json();
    
    // OpenAI standard is { data: [{ id: "model-name", ... }] }
    if (data && Array.isArray(data.data)) {
      return data.data.map((m: any) => m.id);
    } else if (Array.isArray(data)) {
      // Some simple proxies just return an array of strings or objects
      return data.map((m: any) => (typeof m === 'string' ? m : m.id || m.name)).filter(Boolean);
    }
    return [];
  } catch (error) {
    // Silently handle "Failed to fetch" which occurs if server is down or CORS is blocked
    console.debug("Proxy model detection skipped:", error);
    return [];
  }
}

export async function explainWord(word: string, context: string, config: AIConfig) {
  const prompt = `Explain the word "${word}" found in this context: "${context}". 
               Provide a concise meaning in Mandarin, its pronunciation (IPA), and a simple English example sentence.
               Your response MUST be a raw JSON object with keys: "meaning", "pronunciation", and "example".`;

  if (config.provider !== 'gemini') {
    const text = await fetchFromProxy(config, prompt, true);
    // Cleanup potential markdown blocks if proxy returns them
    const cleaned = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          meaning: { type: Type.STRING },
          pronunciation: { type: Type.STRING },
          example: { type: Type.STRING }
        },
        required: ["meaning", "pronunciation", "example"]
      }
    }
  });

  return JSON.parse(response.text);
}

export async function generateSpeech(text: string) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Say clearly: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  } catch (e) {
    console.warn("TTS failed, cloud service might be unavailable", e);
    return null;
  }
}

export async function getChatResponse(history: {role: 'user'|'model', content: string}[], message: string, config: AIConfig) {
  if (config.provider !== 'gemini') {
    const url = `${config.proxyUrl}/chat/completions`.replace(/\/+$/, '');
    const messages = [
      { role: 'system', content: "You are a helpful language learning assistant. Help the user understand complex technical terms and provide clear explanations in both English and Mandarin." },
      ...history.map(h => ({ role: h.role === 'model' ? 'assistant' : 'user', content: h.content })),
      { role: 'user', content: message }
    ];

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: config.modelId, messages })
    });

    const data = await response.json();
    return data.choices[0].message.content;
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const chat = ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: "You are a helpful language learning assistant. Help the user understand complex technical terms and provide clear explanations in both English and Mandarin."
    }
  });

  const response = await chat.sendMessage({ message });
  return response.text;
}
