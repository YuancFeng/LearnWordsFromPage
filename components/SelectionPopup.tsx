
import React from 'react';
import { Search, Plus, MessageSquare, ChevronRight } from 'lucide-react';
import { Tag } from '../types';

interface SelectionPopupProps {
  position: { x: number; y: number };
  selectedText: string;
  tags: Tag[];
  onExplain: (tagId: string) => void;
  onChat: () => void;
  onClose: () => void;
}

const SelectionPopup: React.FC<SelectionPopupProps> = ({
  position,
  selectedText,
  tags,
  onExplain,
  onChat,
  onClose
}) => {
  if (!selectedText) return null;

  return (
    <div 
      className="fixed z-50 bg-white shadow-2xl rounded-2xl border border-gray-200 p-2 min-w-[220px] animate-in fade-in zoom-in duration-200"
      style={{ left: position.x, top: position.y + 10 }}
    >
      <div className="flex items-center justify-between px-3 py-2 mb-2 border-b border-gray-100">
        <span className="text-xs font-black text-blue-600 truncate max-w-[140px]">
          "{selectedText}"
        </span>
        <button onClick={onClose} className="text-gray-300 hover:text-gray-600 transition-colors">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div className="space-y-1">
        {/* Analyze Word Button (General) */}
        <button 
          onClick={() => onExplain(tags[0].id)}
          className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-xl transition-all font-semibold group"
        >
          <div className="flex items-center gap-2">
            <Search size={16} className="text-blue-500" />
            <span>AI Quick Analysis</span>
          </div>
          <span className="text-[9px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded uppercase font-bold tracking-tighter">{tags[0].name}</span>
        </button>
        
        {/* Save to Book with Submenu */}
        <div className="relative group/menu">
          <button 
            className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-gray-700 group-hover/menu:bg-green-50 group-hover/menu:text-green-700 rounded-xl transition-all font-semibold"
          >
            <div className="flex items-center gap-2">
              <Plus size={16} className="text-green-500" />
              <span>Save with Tag</span>
            </div>
            <ChevronRight size={14} className="text-gray-300 group-hover/menu:text-green-400 transition-colors" />
          </button>
          
          {/* Hover Bridge: An invisible div that bridges the gap between the menu and submenu */}
          <div className="absolute left-full top-0 w-4 h-full hidden group-hover/menu:block" />

          <div className="absolute left-full top-[-8px] ml-1 hidden group-hover/menu:block bg-white shadow-2xl rounded-2xl border border-gray-100 p-2 w-48 animate-in slide-in-from-left-2 duration-150 z-50">
            <div className="flex flex-col">
              <p className="text-[9px] uppercase font-black text-gray-400 px-3 py-2 mb-1 tracking-widest border-b border-gray-50">Select Domain</p>
              <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
                {tags.map(tag => (
                  <button
                    key={tag.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onExplain(tag.id);
                    }}
                    className={`w-full text-left px-3 py-2.5 text-xs rounded-xl mb-1 border transition-all flex items-center gap-3 font-bold ${tag.color} hover:brightness-95 active:scale-[0.97]`}
                  >
                    <div className={`w-2.5 h-2.5 rounded-full ring-2 ring-white shadow-sm ${tag.color.split(' ')[0]}`}></div>
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Chat Button */}
        <button 
          onClick={onChat}
          className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 rounded-xl transition-all font-semibold"
        >
          <MessageSquare size={16} className="text-purple-500" />
          <span>Deep Inquiry (Chat)</span>
        </button>
      </div>
    </div>
  );
};

export default SelectionPopup;
