
import React, { useEffect, useState } from 'react';
import { ProcessingState } from '../types';
import { Loader2, CheckCircle2, Circle } from 'lucide-react';
import { ChunkingProgress } from '../utils/videoChunker';

interface Props {
  state: ProcessingState;
  chunkProgress?: ChunkingProgress | null;
}

const ProcessingOverlay: React.FC<Props> = ({ state, chunkProgress }) => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(d => (d.length > 2 ? '' : d + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  if (state === ProcessingState.IDLE || state === ProcessingState.COMPLETED) return null;

  const stages = [
    { key: ProcessingState.PREPARING, label: 'Optimizing Video Stream' },
    { key: ProcessingState.UPLOADING, label: 'Uploading to Neural Engine' },
    { key: ProcessingState.ANALYZING, label: 'Multimodal Frame Analysis' },
    { key: ProcessingState.INDEXING, label: 'Linguistic Verbatim Extraction' },
    { key: ProcessingState.GENERATING_PDF, label: 'Structuring PDF Dataset' },
  ];

  const getCurrentIndex = () => stages.findIndex(s => s.key === state);
  const currentIndex = getCurrentIndex();

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl flex flex-col items-center justify-center z-50 p-6">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-10 shadow-2xl relative overflow-hidden">
        {/* Animated Background Aura */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-600/10 rounded-full blur-3xl animate-pulse delay-700" />

        <div className="relative z-10">
          <div className="flex items-center justify-center mb-10">
            <div className="relative">
              <div className="w-24 h-24 border-b-4 border-blue-500 rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 bg-blue-600/20 rounded-full animate-pulse" />
              </div>
            </div>
          </div>

          <h3 className="text-2xl font-bold text-center mb-2 text-white">
            Processing Neural Data{dots}
          </h3>
          <p className="text-slate-500 text-center text-sm mb-4">
            {chunkProgress 
              ? chunkProgress.status 
              : "Verbatim multi-language extraction in progress. This typically takes 30-90 seconds."}
          </p>
          
          {chunkProgress && chunkProgress.totalChunks > 0 && (
            <div className="mb-10">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span>Chunk {chunkProgress.currentChunk} of {chunkProgress.totalChunks}</span>
                <span>{Math.round(chunkProgress.progress)}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-blue-500 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${chunkProgress.progress}%` }}
                />
              </div>
            </div>
          )}

          <div className="space-y-4">
            {stages.map((stage, idx) => {
              const isPast = idx < currentIndex;
              const isCurrent = idx === currentIndex;
              
              return (
                <div key={stage.key} className={`flex items-center gap-4 transition-all duration-500 ${isCurrent ? 'scale-105' : 'opacity-50'}`}>
                  {isPast ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  ) : isCurrent ? (
                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-700 shrink-0" />
                  )}
                  <span className={`text-sm font-medium ${isCurrent ? 'text-white' : 'text-slate-400'}`}>
                    {stage.label}
                  </span>
                  {isCurrent && (
                    <span className="ml-auto text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20 animate-pulse">
                      ACTIVE
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {state === ProcessingState.ERROR && (
            <div className="mt-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm flex items-center gap-3">
              <span className="text-lg">⚠️</span>
              An error occurred. Please refresh or try a smaller video.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProcessingOverlay;
