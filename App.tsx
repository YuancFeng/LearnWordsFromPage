
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { BookOpen, GraduationCap, Layout, Settings as SettingsIcon, Search, PlusCircle, Trash2, ArrowLeft, Filter, Edit2, Check, X, Plus, Cpu, Globe, Server, RefreshCw, AlertCircle, ChevronDown, ChevronRight, Zap, Database, Wifi, WifiOff } from 'lucide-react';
import SelectionPopup from './components/SelectionPopup';
import AIChatSidebar from './components/AIChatSidebar';
import WordCard from './components/WordCard';
import { explainWord, getProxyModels, testConnection } from './services/geminiService';
import { INITIAL_TAGS, MOCK_BLOG_POST } from './constants';
import { WordRecord, Tag, View, AIConfig, AIProvider } from './types';

const TAG_COLORS = [
  'bg-blue-100 text-blue-700 border-blue-200',
  'bg-green-100 text-green-700 border-green-200',
  'bg-purple-100 text-purple-700 border-purple-200',
  'bg-yellow-100 text-yellow-700 border-yellow-200',
  'bg-orange-100 text-orange-700 border-orange-200',
  'bg-pink-100 text-pink-700 border-pink-200',
  'bg-cyan-100 text-cyan-700 border-cyan-200',
  'bg-indigo-100 text-indigo-700 border-indigo-200'
];

type SettingsTab = 'ai' | 'tags';

const App: React.FC = () => {
  const [view, setView] = useState<View>('reader');
  const [activeSettingsTab, setActiveSettingsTab] = useState<SettingsTab>('ai');
  const [vocabulary, setVocabulary] = useState<WordRecord[]>([]);
  const [tags, setTags] = useState<Tag[]>(INITIAL_TAGS);
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('all');
  
  // AI Configuration
  const [aiConfig, setAiConfig] = useState<AIConfig>({
    provider: 'gemini',
    proxyUrl: 'http://localhost:8080/v1',
    modelId: 'gpt-4o'
  });

  // Connection State
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [isCheckingConnection, setIsCheckingConnection] = useState<boolean>(false);

  // Proxy Model Detection
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const checkConnection = useCallback(async () => {
    setIsCheckingConnection(true);
    const connected = await testConnection(aiConfig);
    setIsConnected(connected);
    setIsCheckingConnection(false);
  }, [aiConfig]);

  useEffect(() => {
    checkConnection();
  }, [aiConfig.provider, aiConfig.proxyUrl, checkConnection]);

  const fetchAvailableModels = useCallback(async () => {
    if (aiConfig.provider === 'gemini') return;
    setIsFetchingModels(true);
    setFetchError(null);
    try {
      const models = await getProxyModels(aiConfig.proxyUrl);
      setAvailableModels(models);
      if (models.length > 0 && !models.includes(aiConfig.modelId)) {
        setAiConfig(prev => ({ ...prev, modelId: models[0] }));
      }
      if (models.length === 0) {
        setFetchError("No models found at this endpoint.");
      }
    } catch (err) {
      setFetchError("Could not connect to proxy /models endpoint.");
    } finally {
      setIsFetchingModels(false);
    }
  }, [aiConfig.provider, aiConfig.proxyUrl, aiConfig.modelId]);

  useEffect(() => {
    if (aiConfig.provider !== 'gemini' && view === 'settings' && activeSettingsTab === 'ai') {
      fetchAvailableModels();
    }
  }, [aiConfig.provider, aiConfig.proxyUrl, view, activeSettingsTab, fetchAvailableModels]);

  const [selection, setSelection] = useState({ text: '', x: 0, y: 0, context: '' });
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatQuery, setChatQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [targetHighlightWord, setTargetHighlightWord] = useState<string | null>(null);

  // Editing state for tags
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editTagName, setEditTagName] = useState('');
  const [editTagColor, setEditTagColor] = useState('');

  // Creation state for tags
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);

  // Filter and Sort Vocabulary
  const filteredVocabulary = useMemo(() => {
    let list = [...vocabulary];
    list.sort((a, b) => b.createdAt - a.createdAt);
    if (selectedTagFilter === 'all') return list;
    return list.filter(word => word.tagId === selectedTagFilter);
  }, [vocabulary, selectedTagFilter]);

  const handleStartAddTag = () => {
    setIsAddingTag(true);
    setNewTagName('');
    setNewTagColor(TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)]);
  };

  const handleCreateTag = () => {
    if (!newTagName.trim()) return;
    const newTag: Tag = {
      id: Math.random().toString(36).substr(2, 9),
      name: newTagName.trim(),
      color: newTagColor
    };
    setTags([...tags, newTag]);
    setIsAddingTag(false);
    setNewTagName('');
  };

  const handleStartEditTag = (tag: Tag) => {
    setEditingTagId(tag.id);
    setEditTagName(tag.name);
    setEditTagColor(tag.color);
  };

  const handleSaveEditTag = () => {
    if (!editTagName.trim()) return;
    setTags(tags.map(t => t.id === editingTagId ? { ...t, name: editTagName.trim(), color: editTagColor } : t));
    setEditingTagId(null);
  };

  const handleDeleteTag = (id: string) => {
    if (tags.length <= 1) {
      alert("You must keep at least one category.");
      return;
    }
    if (confirm("Are you sure you want to delete this category? Words using this tag will remain but lose their category info.")) {
      setTags(tags.filter(t => t.id !== id));
      if (selectedTagFilter === id) setSelectedTagFilter('all');
    }
  };

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    const activeSelection = window.getSelection();
    const text = activeSelection?.toString().trim();

    if (text && text.length > 0 && text.length < 50) { 
      const container = e.currentTarget as HTMLElement;
      const fullText = container.innerText;
      const index = fullText.indexOf(text);
      let context = text;
      
      if (index !== -1) {
        const sentences = fullText.split(/(?<=[.!?])\s+/);
        context = sentences.find(s => s.includes(text))?.trim() || text;
      }

      setSelection({
        text,
        x: e.clientX,
        y: e.clientY,
        context
      });
    } else {
      setSelection({ text: '', x: 0, y: 0, context: '' });
    }
  }, []);

  const handleExplain = async (tagId: string) => {
    setIsProcessing(true);
    const selectedWord = selection.text;
    const selectedContext = selection.context;
    
    try {
      const { meaning, pronunciation, example } = await explainWord(selectedWord, selectedContext, aiConfig);
      
      const newWord: WordRecord = {
        id: Math.random().toString(36).substr(2, 9),
        text: selectedWord,
        meaning,
        pronunciation,
        exampleSentence: selectedContext,
        sourceUrl: MOCK_BLOG_POST.url,
        sourceTitle: MOCK_BLOG_POST.title,
        tagId,
        createdAt: Date.now()
      };

      setVocabulary(prev => {
        if (prev.some(w => w.text.toLowerCase() === selectedWord.toLowerCase())) return prev;
        return [newWord, ...prev];
      });
      
      setSelection({ text: '', x: 0, y: 0, context: '' });
      setView('vocabulary');
      setSelectedTagFilter('all');
    } catch (error) {
      console.error("AI Error:", error);
      alert("AI analysis failed. Please check your connection or Provider configuration.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleChat = () => {
    setChatQuery(selection.text);
    setIsChatOpen(true);
    setSelection({ text: '', x: 0, y: 0, context: '' });
  };

  const jumpToSource = (wordText: string) => {
    setTargetHighlightWord(wordText);
    setView('reader');
    setTimeout(() => setTargetHighlightWord(null), 3000);
  };

  const renderContentWithHighlights = (content: string) => {
    if (!targetHighlightWord) return content;
    const parts = content.split(new RegExp(`(${targetHighlightWord})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === targetHighlightWord.toLowerCase() ? (
        <mark key={i} className="bg-yellow-300 text-gray-900 px-1 rounded animate-pulse font-bold shadow-sm">
          {part}
        </mark>
      ) : part
    );
  };

  const handleProviderChange = (provider: AIProvider) => {
    let proxyUrl = aiConfig.proxyUrl;
    let modelId = aiConfig.modelId;

    if (provider === 'ollama') {
      proxyUrl = 'http://localhost:11434/v1';
      modelId = 'llama3';
    } else if (provider === 'cli-proxy') {
      proxyUrl = 'http://localhost:8080/v1';
      modelId = 'gpt-4o';
    }

    setAiConfig({
      provider,
      proxyUrl,
      modelId
    });
    setAvailableModels([]);
  };

  const Navigation = () => (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md shadow-2xl border border-gray-200 px-6 py-3 rounded-2xl flex items-center gap-10 z-[90]">
      <button 
        onClick={() => setView('reader')}
        className={`flex flex-col items-center gap-1 transition-all ${view === 'reader' ? 'text-blue-600 scale-110' : 'text-gray-400 hover:text-gray-600'}`}
      >
        <Layout size={22} />
        <span className="text-[9px] font-bold uppercase tracking-widest">Reader</span>
      </button>
      <button 
        onClick={() => setView('vocabulary')}
        className={`flex flex-col items-center gap-1 transition-all ${view === 'vocabulary' ? 'text-blue-600 scale-110' : 'text-gray-400 hover:text-gray-600'}`}
      >
        <div className="relative">
          <BookOpen size={22} />
          {vocabulary.length > 0 && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
          )}
        </div>
        <span className="text-[9px] font-bold uppercase tracking-widest">Vault</span>
      </button>
      <button 
        onClick={() => setView('settings')}
        className={`flex flex-col items-center gap-1 transition-all ${view === 'settings' ? 'text-blue-600 scale-110' : 'text-gray-400 hover:text-gray-600'}`}
      >
        <SettingsIcon size={22} />
        <span className="text-[9px] font-bold uppercase tracking-widest">Settings</span>
      </button>
    </nav>
  );

  const getProviderName = () => {
    switch(aiConfig.provider) {
      case 'gemini': return 'Gemini';
      case 'ollama': return 'Ollama';
      case 'cli-proxy': return 'CLI Proxy';
      case 'custom': return 'Custom';
      default: return 'AI';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-32">
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-[80] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-blue-200">
            LR
          </div>
          <div>
            <h1 className="text-lg font-black text-gray-900 tracking-tight">LingoRecall</h1>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 ${
                isConnected ? 'text-green-600' : 'text-red-500'
              }`}>
                {isCheckingConnection ? (
                  <RefreshCw size={10} className="animate-spin text-gray-400" />
                ) : isConnected ? (
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                ) : (
                  <WifiOff size={10} />
                )}
                {getProviderName()} {isConnected ? 'Active' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
        
        {isProcessing && (
          <div className="px-4 py-2 bg-blue-50 rounded-full flex items-center gap-3 border border-blue-100 animate-pulse">
             <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
             <span className="text-xs font-bold text-blue-700 uppercase tracking-tighter">AI Processing...</span>
          </div>
        )}
      </header>

      <main className="max-w-6xl mx-auto pt-8 px-6">
        {view === 'reader' && (
          <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-gray-100 relative overflow-hidden min-h-[600px]">
               <div className="flex items-center gap-3 mb-10 bg-gray-50/80 p-3 rounded-2xl border border-gray-200/50">
                 <div className="flex gap-2 px-1">
                   <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                   <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                   <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                 </div>
                 <div className="flex-1 bg-white border border-gray-200 px-4 py-1.5 rounded-xl flex items-center justify-between">
                   <span className="text-xs text-gray-400 font-mono truncate max-w-[400px]">{MOCK_BLOG_POST.url}</span>
                   <Search size={14} className="text-gray-300" />
                 </div>
               </div>

               <article className="max-w-2xl mx-auto" onMouseUp={handleMouseUp}>
                 <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-8 leading-[1.15] tracking-tight">
                   {renderContentWithHighlights(MOCK_BLOG_POST.title)}
                 </h2>
                 <div className="prose prose-xl text-gray-700 leading-relaxed selection:bg-blue-600 selection:text-white">
                   {MOCK_BLOG_POST.content.split('\n\n').map((para, idx) => (
                     <p key={idx} className="mb-6 whitespace-pre-wrap text-lg md:text-xl">
                       {renderContentWithHighlights(para)}
                     </p>
                   ))}
                 </div>
               </article>

               <SelectionPopup 
                 position={{ x: selection.x, y: selection.y }}
                 selectedText={selection.text}
                 tags={tags}
                 onExplain={handleExplain}
                 onChat={handleChat}
                 onClose={() => setSelection({ text: '', x: 0, y: 0, context: '' })}
               />
            </div>
          </div>
        )}

        {view === 'vocabulary' && (
          <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
               <div>
                 <h2 className="text-4xl font-black text-gray-900 mb-1">Knowledge Vault</h2>
                 <p className="text-gray-500 font-medium">Reviewing {filteredVocabulary.length} captured terms.</p>
               </div>
               <div className="flex flex-wrap items-center gap-2">
                 <div className="flex items-center gap-2 mr-2 text-gray-400">
                    <Filter size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Filter:</span>
                 </div>
                 <button 
                   onClick={() => setSelectedTagFilter('all')}
                   className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                     selectedTagFilter === 'all' 
                       ? 'bg-gray-900 text-white border-gray-900 shadow-md scale-105' 
                       : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                   }`}
                 >
                   All
                 </button>
                 {tags.map(tag => (
                   <button 
                     key={tag.id} 
                     onClick={() => setSelectedTagFilter(tag.id)}
                     className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                       selectedTagFilter === tag.id 
                         ? `${tag.color} ring-2 ring-offset-2 ring-gray-100 shadow-md scale-105 opacity-100` 
                         : `${tag.color} opacity-60 hover:opacity-100`
                     }`}
                   >
                     {tag.name}
                   </button>
                 ))}
               </div>
             </div>

             {filteredVocabulary.length === 0 ? (
               <div className="text-center py-32 bg-white rounded-3xl border-2 border-dashed border-gray-200">
                 <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                   <BookOpen size={40} className="text-gray-300" />
                 </div>
                 <h3 className="text-xl font-bold text-gray-900 mb-2">No words found</h3>
                 <p className="text-gray-400 max-w-xs mx-auto">Try selecting a different filter or head back to the reader to capture more words.</p>
                 <button onClick={() => { setSelectedTagFilter('all'); setView('reader'); }} className="mt-8 px-8 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-colors">
                   Start Reading
                 </button>
               </div>
             ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 {filteredVocabulary.map(word => (
                   <WordCard 
                     key={word.id} 
                     word={word} 
                     tag={tags.find(t => t.id === word.tagId)}
                     onNavigate={() => jumpToSource(word.text)}
                   />
                 ))}
               </div>
             )}
          </div>
        )}

        {view === 'settings' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col md:flex-row gap-8 items-start">
            {/* Settings Sidebar */}
            <div className="w-full md:w-72 bg-white rounded-3xl border border-gray-100 p-3 shadow-sm md:sticky md:top-24">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-4 py-3 mb-1 text-center md:text-left">Preferences</p>
              <div className="space-y-1">
                <button 
                  onClick={() => setActiveSettingsTab('ai')}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all group ${activeSettingsTab === 'ai' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'}`}
                >
                  <div className="flex items-center gap-3">
                    <Cpu size={20} className={activeSettingsTab === 'ai' ? 'text-blue-600' : 'text-gray-400'} />
                    <span className="text-sm">AI Connectivity</span>
                  </div>
                  {activeSettingsTab === 'ai' && <ChevronRight size={16} className="text-blue-400" />}
                </button>
                <button 
                  onClick={() => setActiveSettingsTab('tags')}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all group ${activeSettingsTab === 'tags' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'}`}
                >
                  <div className="flex items-center gap-3">
                    <Layout size={20} className={activeSettingsTab === 'tags' ? 'text-indigo-600' : 'text-gray-400'} />
                    <span className="text-sm">Knowledge Domains</span>
                  </div>
                  {activeSettingsTab === 'tags' && <ChevronRight size={16} className="text-indigo-400" />}
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 w-full animate-in fade-in slide-in-from-right-4 duration-300">
              {activeSettingsTab === 'ai' && (
                <section>
                  <h2 className="text-3xl font-black text-gray-900 mb-6 flex items-center gap-3">
                    <Cpu className="text-blue-600" /> AI Connectivity
                  </h2>
                  <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
                    <p className="text-gray-500 font-medium mb-8">Select your preferred AI model provider. We support direct cloud services and various local or custom proxies.</p>
                    
                    <div className="space-y-10">
                      {/* Provider Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                          { id: 'gemini', label: 'Gemini Cloud', icon: Globe, color: 'text-blue-600' },
                          { id: 'cli-proxy', label: 'CLI Proxy API', icon: Zap, color: 'text-yellow-600' },
                          { id: 'ollama', label: 'Ollama', icon: Database, color: 'text-indigo-600' },
                          { id: 'custom', label: 'Custom Endpoint', icon: Server, color: 'text-gray-600' }
                        ].map(prov => (
                          <button
                            key={prov.id}
                            onClick={() => handleProviderChange(prov.id as AIProvider)}
                            className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all ${
                              aiConfig.provider === prov.id 
                                ? `border-blue-500 bg-blue-50/50 shadow-md scale-105` 
                                : 'border-gray-100 hover:border-blue-200 bg-white hover:bg-blue-50/20'
                            }`}
                          >
                            <prov.icon size={24} className={aiConfig.provider === prov.id ? prov.color : 'text-gray-400'} />
                            <span className={`text-xs font-bold text-center ${aiConfig.provider === prov.id ? 'text-gray-900' : 'text-gray-500'}`}>{prov.label}</span>
                          </button>
                        ))}
                      </div>

                      {aiConfig.provider !== 'gemini' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300 border-t border-gray-100 pt-8">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Proxy Endpoint URL</label>
                                {isCheckingConnection && <span className="text-[10px] text-blue-500 animate-pulse font-bold">Checking...</span>}
                                {!isCheckingConnection && !isConnected && <span className="text-[10px] text-red-500 font-bold flex items-center gap-1"><WifiOff size={10} /> Not Reachable</span>}
                                {!isCheckingConnection && isConnected && <span className="text-[10px] text-green-500 font-bold flex items-center gap-1"><Wifi size={10} /> Connected</span>}
                            </div>
                            <input 
                              type="text" 
                              value={aiConfig.proxyUrl}
                              onChange={(e) => setAiConfig(prev => ({...prev, proxyUrl: e.target.value}))}
                              className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium text-sm transition-colors ${
                                !isConnected ? 'border-red-200 bg-red-50/10' : 'border-gray-200'
                              }`}
                              placeholder="e.g. http://localhost:8080/v1"
                            />
                            {aiConfig.provider === 'ollama' && (
                                <p className="mt-2 text-[10px] text-indigo-500 font-bold">Standard Ollama OpenAI-compat URL: http://localhost:11434/v1</p>
                            )}
                          </div>
                          
                          <div className="relative">
                            <div className="flex items-center justify-between mb-2">
                               <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Target Model ID</label>
                               <button 
                                 onClick={fetchAvailableModels} 
                                 className={`flex items-center gap-1.5 text-[10px] font-bold text-blue-600 hover:text-blue-800 transition-colors uppercase tracking-widest ${isFetchingModels ? 'opacity-50 cursor-not-allowed' : ''}`}
                                 disabled={isFetchingModels || !isConnected}
                               >
                                 <RefreshCw size={12} className={isFetchingModels ? 'animate-spin' : ''} />
                                 Detect Models
                               </button>
                            </div>
                            
                            <div className="relative group">
                              {availableModels.length > 0 ? (
                                <div className="relative">
                                  <select 
                                    value={aiConfig.modelId}
                                    onChange={(e) => setAiConfig(prev => ({...prev, modelId: e.target.value}))}
                                    className="w-full appearance-none px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm text-gray-800 pr-10"
                                  >
                                    {availableModels.map(model => (
                                      <option key={model} value={model}>{model}</option>
                                    ))}
                                  </select>
                                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-hover:text-blue-500 transition-colors">
                                    <ChevronDown size={18} />
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  <input 
                                    type="text" 
                                    value={aiConfig.modelId}
                                    onChange={(e) => setAiConfig(prev => ({...prev, modelId: e.target.value}))}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium text-sm italic text-gray-400"
                                    placeholder="e.g. llama3"
                                  />
                                  {!isConnected && (
                                    <div className="flex items-start gap-2 p-3 bg-orange-50 rounded-xl border border-orange-100 text-[11px] text-orange-700 leading-tight">
                                      <AlertCircle size={14} className="shrink-0 mt-0.5" />
                                      <span>The proxy server at "{aiConfig.proxyUrl}" is currently unreachable. Please make sure your local provider (Ollama or CLI Proxy) is running and accessible.</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                            <p className="text-xs text-blue-700 leading-relaxed font-medium">
                              Note: When using a Proxy or Ollama, ensure they support the OpenAI-compatible API format. Local models like Llama 3 or Mistral work great for language analysis.
                            </p>
                          </div>
                        </div>
                      )}

                      {aiConfig.provider === 'gemini' && (
                        <div className="animate-in fade-in slide-in-from-top-4 duration-300 border-t border-gray-100 pt-8">
                           <div className="p-6 bg-blue-600 rounded-3xl text-white shadow-xl shadow-blue-100 relative overflow-hidden">
                              <div className="relative z-10">
                                <h4 className="text-lg font-bold mb-2">Cloud-Powered with Gemini 3</h4>
                                <p className="text-xs text-blue-100 leading-relaxed mb-4">Direct connection to Google's most capable models for fast and accurate professional language analysis. No setup required.</p>
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-white/20 w-fit px-3 py-1 rounded-full">
                                  <Zap size={10} fill="currentColor" />
                                  Fastest Inference
                                </div>
                              </div>
                              <Globe size={120} className="absolute -right-8 -bottom-8 text-blue-500/30 rotate-12" />
                           </div>
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              )}

              {activeSettingsTab === 'tags' && (
                <section>
                  <h2 className="text-3xl font-black text-gray-900 mb-6 flex items-center gap-3">
                    <Layout className="text-indigo-600" /> Knowledge Domains
                  </h2>
                  <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
                    <p className="text-gray-500 font-medium mb-8">Customize how you categorize your vocabulary. Professional domains help with contextual recall.</p>
                    
                    <div className="space-y-4 mb-6">
                      {tags.map(tag => (
                        <div key={tag.id} className="group flex flex-col p-5 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:shadow-md transition-all">
                          {editingTagId === tag.id ? (
                            <div className="space-y-4 w-full">
                              <div className="flex items-center gap-3">
                                <input 
                                  type="text" 
                                  value={editTagName} 
                                  onChange={(e) => setEditTagName(e.target.value)}
                                  className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm"
                                  placeholder="Tag name..."
                                  autoFocus
                                />
                                <button 
                                  onClick={handleSaveEditTag}
                                  className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm"
                                >
                                  <Check size={20} />
                                </button>
                                <button 
                                  onClick={() => setEditingTagId(null)}
                                  className="p-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 shadow-sm"
                                >
                                  <X size={20} />
                                </button>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {TAG_COLORS.map((c, i) => (
                                  <button
                                    key={i}
                                    onClick={() => setEditTagColor(c)}
                                    className={`w-8 h-8 rounded-full border-2 transition-all ${c.split(' ')[0]} ${editTagColor === c ? 'ring-2 ring-blue-500 ring-offset-2 scale-110 border-white' : 'border-transparent'}`}
                                  />
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center gap-4">
                                <div className={`w-6 h-6 rounded-lg border-2 border-white shadow-sm ${tag.color.split(' ')[0]}`}></div>
                                <div>
                                  <span className="font-bold text-gray-800 block text-sm">{tag.name}</span>
                                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Active Category</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => handleStartEditTag(tag)}
                                  className="p-2 text-gray-400 hover:text-blue-600 transition-all rounded-lg hover:bg-blue-50"
                                >
                                  <Edit2 size={18} />
                                </button>
                                <button 
                                  onClick={() => handleDeleteTag(tag.id)}
                                  className="p-2 text-gray-400 hover:text-red-500 transition-all rounded-lg hover:bg-red-50"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}

                      {isAddingTag && (
                        <div className="animate-in slide-in-from-top-2 flex flex-col p-5 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/30">
                          <div className="space-y-4 w-full">
                            <div className="flex items-center gap-3">
                              <input 
                                type="text" 
                                value={newTagName} 
                                onChange={(e) => setNewTagName(e.target.value)}
                                className="flex-1 px-4 py-2 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold bg-white text-sm"
                                placeholder="Category name..."
                                autoFocus
                              />
                              <button 
                                onClick={handleCreateTag}
                                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm"
                              >
                                <Check size={20} />
                              </button>
                              <button 
                                onClick={() => setIsAddingTag(false)}
                                className="p-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 shadow-sm"
                              >
                                <X size={20} />
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {TAG_COLORS.map((c, i) => (
                                <button
                                  key={i}
                                  onClick={() => setNewTagColor(c)}
                                  className={`w-8 h-8 rounded-full border-2 transition-all ${c.split(' ')[0]} ${newTagColor === c ? 'ring-2 ring-blue-500 ring-offset-2 scale-110 border-white' : 'border-transparent'}`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {!isAddingTag && (
                      <button 
                        onClick={handleStartAddTag}
                        className="w-full flex items-center justify-center gap-3 py-5 bg-gray-900 text-white rounded-2xl font-bold hover:bg-gray-800 transition-all shadow-xl shadow-gray-200 active:scale-[0.98]"
                      >
                        <PlusCircle size={22} />
                        <span>Add Professional Category</span>
                      </button>
                    )}
                  </div>
                </section>
              )}
            </div>
          </div>
        )}
      </main>

      <Navigation />
      <AIChatSidebar 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
        initialQuery={chatQuery} 
        aiConfig={aiConfig}
      />
      <div className="fixed -top-32 -left-32 w-[500px] h-[500px] bg-blue-100/50 rounded-full blur-[140px] -z-10 animate-pulse"></div>
      <div className="fixed -bottom-32 -right-32 w-[500px] h-[500px] bg-purple-100/50 rounded-full blur-[140px] -z-10 animate-pulse delay-1000"></div>
    </div>
  );
};

export default App;
