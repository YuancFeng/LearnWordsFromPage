
import React, { useState } from 'react';
import { ExternalLink, Clock, Hash, Volume2, Loader2 } from 'lucide-react';
import { WordRecord, Tag } from '../types';
import { generateSpeech } from '../services/geminiService';

interface WordCardProps {
  word: WordRecord;
  tag?: Tag;
  onNavigate: () => void;
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const WordCard: React.FC<WordCardProps> = ({ word, tag, onNavigate }) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlayAudio = async () => {
    if (isPlaying) return;
    setIsPlaying(true);
    try {
      const base64Audio = await generateSpeech(word.text);
      if (base64Audio) {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const audioBuffer = await decodeAudioData(
          decode(base64Audio),
          audioContext,
          24000,
          1,
        );
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.onended = () => setIsPlaying(false);
        source.start();
      } else {
        setIsPlaying(false);
      }
    } catch (error) {
      console.error("Failed to play audio:", error);
      setIsPlaying(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow group">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">{word.text}</h3>
          <button 
            onClick={handlePlayAudio}
            disabled={isPlaying}
            className={`flex items-center gap-2 text-gray-500 text-sm hover:text-blue-500 transition-colors p-1 rounded-lg hover:bg-blue-50 -ml-1 ${isPlaying ? 'opacity-70' : ''}`}
            title="Listen to pronunciation"
          >
            {isPlaying ? (
              <Loader2 size={14} className="animate-spin text-blue-500" />
            ) : (
              <Volume2 size={14} />
            )}
            <span className="font-mono text-xs">[{word.pronunciation}]</span>
          </button>
        </div>
        {tag && (
          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${tag.color}`}>
            {tag.name}
          </span>
        )}
      </div>

      <div className="bg-blue-50/50 rounded-xl p-4 mb-4">
        <p className="text-gray-800 font-medium leading-relaxed">
          {word.meaning}
        </p>
      </div>

      <div className="mb-4">
        <p className="text-xs font-semibold text-gray-400 uppercase mb-2 flex items-center gap-1">
          <Clock size={12} /> Context from Original Article
        </p>
        <p className="text-sm italic text-gray-600 leading-relaxed border-l-4 border-gray-200 pl-4 py-1">
          "...{word.exampleSentence}..."
        </p>
      </div>

      <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
          <Hash size={12} />
          <span>Added on {new Date(word.createdAt).toLocaleDateString()}</span>
        </div>
        <button 
          onClick={onNavigate}
          className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
        >
          <span>Jump to Source</span>
          <ExternalLink size={14} />
        </button>
      </div>
    </div>
  );
};

export default WordCard;
