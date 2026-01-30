
import React, { useState, useCallback } from 'react';
import { 
  FileVideo, 
  Upload, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Settings,
  Database,
  User,
  Type as FontType,
  Zap,
  Globe,
  FileText,
  FileJson,
  FileSpreadsheet,
  ChevronDown
} from 'lucide-react';
import { ProcessingState, TrainingData } from './types';
import { processVideoWithGemini } from './services/geminiService';
import { generateTranscriptPDF } from './utils/pdfGenerator';
import { exportAsJSON, exportAsTXT, exportAsCSV } from './utils/exportUtils';
import ProcessingOverlay from './components/ProcessingOverlay';

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [processingState, setProcessingState] = useState<ProcessingState>(ProcessingState.IDLE);
  const [result, setResult] = useState<TrainingData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [speakerName, setSpeakerName] = useState('');
  const [category, setCategory] = useState('Professional');

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.size > 50 * 1024 * 1024) {
        setError("File size exceeds 50MB. Large files take significant processing time.");
        return;
      }
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
      setError(null);
      setResult(null);
    }
  };

  const handleProcess = async () => {
    if (!file) return;

    try {
      setProcessingState(ProcessingState.PREPARING);
      setError(null);

      // Convert to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.readAsDataURL(file);
      });

      const base64 = await base64Promise;
      
      setProcessingState(ProcessingState.UPLOADING);
      // Brief delay to ensure state update is visible to user
      await new Promise(r => setTimeout(r, 800));
      
      setProcessingState(ProcessingState.ANALYZING);
      // Analysis and Indexing are handled within the service call, 
      // but we can fake a sub-state transition after the call returns
      const data = await processVideoWithGemini(base64, file.type, {
        title: title || file.name,
        speakerName: speakerName || 'Target Persona',
        category
      });

      setProcessingState(ProcessingState.INDEXING);
      await new Promise(r => setTimeout(r, 1200));

      setResult(data);
      setProcessingState(ProcessingState.COMPLETED);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Network error. Video processing is compute-heavy, please try again.");
      setProcessingState(ProcessingState.ERROR);
    }
  };

  const [showExportMenu, setShowExportMenu] = useState(false);

  const handleExport = async (format: 'pdf' | 'json' | 'txt' | 'csv') => {
    if (!result) return;
    
    setShowExportMenu(false);
    setProcessingState(ProcessingState.GENERATING_PDF);
    
    try {
      switch (format) {
        case 'pdf':
          await generateTranscriptPDF(result);
          break;
        case 'json':
          exportAsJSON(result);
          break;
        case 'txt':
          exportAsTXT(result);
          break;
        case 'csv':
          exportAsCSV(result);
          break;
      }
      // Small delay for PDF, immediate for others
      setTimeout(() => {
        setProcessingState(ProcessingState.COMPLETED);
      }, format === 'pdf' ? 1000 : 100);
    } catch (error: any) {
      console.error('Export error:', error);
      setError(error.message || 'Failed to export file');
      setProcessingState(ProcessingState.COMPLETED);
    }
  };

  const reset = () => {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setResult(null);
    setProcessingState(ProcessingState.IDLE);
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8 bg-slate-950 text-slate-200">
      <ProcessingOverlay state={processingState} />

      {/* Header */}
      <header className="w-full max-w-6xl flex items-center justify-between mb-12">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-500/20">
            <Database className="text-white w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">AvatarTrain<span className="text-blue-500">.ai</span></h1>
        </div>
        <div className="hidden md:flex items-center gap-6">
          <div className="flex items-center gap-1.5 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
            <Globe className="w-4 h-4 text-emerald-500" />
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Verbatim Core Enabled</span>
          </div>
          <button className="text-xs text-slate-500 hover:text-white transition-colors uppercase tracking-widest font-medium">Documentation</button>
        </div>
      </header>

      <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-6">
          {/* Footage Input */}
          <section className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-white">
              <Upload className="w-5 h-5 text-blue-500" />
              Dataset Source
            </h2>

            {!file ? (
              <label className="group relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-slate-800 rounded-2xl cursor-pointer hover:border-blue-500/50 hover:bg-blue-500/5 transition-all">
                <div className="flex flex-col items-center justify-center p-6 text-center">
                  <div className="p-4 bg-slate-800 rounded-2xl mb-4 group-hover:scale-110 transition-transform shadow-lg">
                    <FileVideo className="w-10 h-10 text-slate-500 group-hover:text-blue-500" />
                  </div>
                  <p className="text-sm font-semibold text-slate-300">Target Persona Video</p>
                  <p className="text-[10px] text-slate-500 uppercase mt-2">MP4/MOV up to 50MB</p>
                </div>
                <input id="video-upload" name="video-upload" type="file" className="hidden" accept="video/*" onChange={onFileChange} />
              </label>
            ) : (
              <div className="space-y-4">
                <div className="relative rounded-2xl overflow-hidden bg-black aspect-video border border-slate-800 group shadow-2xl">
                  <video src={previewUrl!} className="w-full h-full object-cover opacity-80" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                  <button 
                    onClick={reset}
                    className="absolute top-3 right-3 bg-red-500/20 hover:bg-red-500 text-white p-2 rounded-xl backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all border border-red-500/30"
                  >
                    <AlertCircle className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between text-[10px] font-bold tracking-tighter uppercase px-1 text-slate-500">
                  <span>{file.name}</span>
                  <span className="text-blue-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                </div>
              </div>
            )}
          </section>

          {/* Config */}
          <section className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-white">
              <Settings className="w-5 h-5 text-blue-500" />
              Neural Config
            </h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="manifest-title" className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Manifest Title</label>
                <input 
                  id="manifest-title"
                  name="manifest-title"
                  type="text" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Polyglot Training Set"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label htmlFor="persona-subject" className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Persona Subject</label>
                <input 
                  id="persona-subject"
                  name="persona-subject"
                  type="text" 
                  value={speakerName}
                  onChange={(e) => setSpeakerName(e.target.value)}
                  placeholder="Linguistic Profile A"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            {error && (
              <div className="mt-6 p-4 bg-red-500/5 border border-red-500/10 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-[10px] text-red-400 font-bold uppercase leading-relaxed">{error}</p>
              </div>
            )}

            <button 
              disabled={!file || processingState !== ProcessingState.IDLE}
              onClick={handleProcess}
              className="w-full mt-8 bg-blue-600 hover:bg-blue-500 disabled:opacity-20 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-[0.2em]"
            >
              Analyze Dataset
            </button>
          </section>
        </div>

        {/* Output */}
        <div className="lg:col-span-7">
          {result ? (
            <div className="space-y-6">
              {/* Summary Card */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-5">
                   <Database className="w-32 h-32" />
                </div>
                
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8 pb-8 border-b border-slate-800">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-1">Dataset Extracted</h2>
                    <p className="text-slate-500 text-sm">Verbatim multi-language transcript finalized.</p>
                  </div>
                  <div className="relative">
                    <button 
                      onClick={() => setShowExportMenu(!showExportMenu)}
                      className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
                    >
                      <Download className="w-4 h-4" />
                      Export
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    
                    {showExportMenu && (
                      <>
                        <div 
                          className="fixed inset-0 z-10" 
                          onClick={() => setShowExportMenu(false)}
                        />
                        <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-20 overflow-hidden">
                          <button
                            onClick={() => handleExport('pdf')}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-800 transition-colors text-sm text-white"
                          >
                            <FileText className="w-4 h-4 text-red-500" />
                            <span>Export as PDF</span>
                          </button>
                          <button
                            onClick={() => handleExport('json')}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-800 transition-colors text-sm text-white border-t border-slate-800"
                          >
                            <FileJson className="w-4 h-4 text-yellow-500" />
                            <span>Export as JSON</span>
                          </button>
                          <button
                            onClick={() => handleExport('txt')}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-800 transition-colors text-sm text-white border-t border-slate-800"
                          >
                            <FileText className="w-4 h-4 text-blue-500" />
                            <span>Export as TXT</span>
                          </button>
                          <button
                            onClick={() => handleExport('csv')}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-800 transition-colors text-sm text-white border-t border-slate-800"
                          >
                            <FileSpreadsheet className="w-4 h-4 text-green-500" />
                            <span>Export as CSV</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4">Indexing Tags</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {result.metadata.tags.map(tag => (
                        <span key={tag} className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded-md text-[9px] font-bold border border-slate-700">
                          {tag.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4">Neural Profile</h3>
                    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-500">DETECTED LANG:</span>
                        <span className="text-emerald-500 font-bold">{result.metadata.language}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] mt-2">
                        <span className="text-slate-500">VIBE SIGNATURE:</span>
                        <span className="text-blue-400 font-bold">{result.transcript[0]?.tone || 'Neutral'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* List Card */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 shadow-2xl">
                <h3 className="text-lg font-bold text-white mb-8 flex items-center gap-3">
                   <FontType className="w-5 h-5 text-blue-500" />
                   Verbatim Extraction Preview
                </h3>
                <div className="space-y-8 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
                  {result.transcript.map((item, i) => (
                    <div key={i} className="relative pl-8 border-l border-slate-800">
                       <div className="absolute left-[-5px] top-0 w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                       <div className="flex items-center gap-3 mb-2">
                          <span className="text-[10px] font-mono text-blue-500 bg-blue-500/5 px-2 py-0.5 rounded border border-blue-500/10 font-bold">
                            {item.timestamp}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500 uppercase">{item.speaker}</span>
                       </div>
                       <p className="text-sm text-white leading-relaxed">{item.text}</p>
                       <div className="mt-3 flex gap-4">
                          <span className="text-[9px] text-slate-600 font-bold uppercase">Tone: <span className="text-slate-400">{item.tone}</span></span>
                          <span className="text-[9px] text-slate-600 font-bold uppercase">Intent: <span className="text-slate-400">{item.intent}</span></span>
                       </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[500px] border-2 border-dashed border-slate-900 rounded-[3rem] bg-slate-900/10 flex flex-col items-center justify-center p-12 text-center group">
              <div className="w-24 h-24 bg-slate-900 rounded-[2rem] flex items-center justify-center mb-8 shadow-2xl group-hover:scale-110 transition-transform">
                <Zap className="w-10 h-10 text-slate-700" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2 tracking-tight">System Ready</h3>
              <p className="text-slate-500 text-sm max-w-sm">
                Upload your video source to begin neural indexing and verbatim multi-language extraction.
              </p>
              <div className="mt-12 flex gap-3">
                <div className="w-2 h-2 rounded-full bg-slate-800 animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-slate-800 animate-bounce delay-150" />
                <div className="w-2 h-2 rounded-full bg-slate-800 animate-bounce delay-300" />
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="mt-20 w-full max-w-6xl py-8 border-t border-slate-900 flex justify-between items-center text-[9px] uppercase tracking-[0.3em] font-bold text-slate-600">
        <p>AvatarTrain.ai — Verbatim Neural Core v4.2</p>
        <div className="flex gap-8">
          <span className="hover:text-white transition-colors cursor-pointer">Security</span>
          <span className="hover:text-white transition-colors cursor-pointer">RAG Schema</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
