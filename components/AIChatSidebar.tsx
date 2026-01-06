
import React, { useState, useEffect, useRef } from 'react';
import { Send, X, Bot, User, Loader2 } from 'lucide-react';
import { getChatResponse } from '../services/geminiService';
import { ChatMessage, AIConfig } from '../types';

interface AIChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
  aiConfig: AIConfig;
}

const AIChatSidebar: React.FC<AIChatSidebarProps> = ({ isOpen, onClose, initialQuery, aiConfig }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialQuery && isOpen) {
      handleSend(`Tell me more about the term: "${initialQuery}"`);
    }
  }, [initialQuery, isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (text: string) => {
    const userText = text || input;
    if (!userText.trim()) return;

    const userMessage: ChatMessage = { role: 'user', content: userText };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await getChatResponse(messages, userText, aiConfig);
      setMessages(prev => [...prev, { role: 'model', content: response }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', content: "Sorry, I encountered an error. Please verify your AI connection settings." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const getProviderLabel = () => {
    if (aiConfig.provider === 'gemini') return 'Gemini Cloud';
    return `${aiConfig.provider.toUpperCase()}: ${aiConfig.modelId}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed top-0 right-0 h-full w-80 md:w-96 bg-white shadow-2xl border-l border-gray-200 z-[100] flex flex-col animate-in slide-in-from-right duration-300">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
        <div className="flex items-center gap-2">
          <Bot className="text-blue-600" size={20} />
          <div>
            <h2 className="font-bold text-gray-800 text-sm">AI Tutor</h2>
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">{getProviderLabel()}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200 transition-colors">
          <X size={20} />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-10 px-4">
            <Bot size={40} className="mx-auto text-gray-300 mb-4" />
            <p className="text-sm text-gray-500">I'm here to help you with definitions, grammar, and usage contexts. What can I explain for you today?</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-3 text-sm ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-none' 
                : 'bg-gray-100 text-gray-800 rounded-tl-none border border-gray-200'
            }`}>
              <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl p-3 rounded-tl-none border border-gray-200">
              <Loader2 size={16} className="animate-spin text-blue-600" />
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-100">
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
          className="relative"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your question..."
            className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
          />
          <button 
            type="submit"
            disabled={isLoading}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default AIChatSidebar;
