import React, { useState, useCallback, useRef } from 'react';
import Scanner from './components/Scanner';
import HistoryList from './components/HistoryList';
import { ScannedItem } from './types';
import { playScanBeep } from './utils/beep';
import { Download, Copy, Sparkles, X, Share2, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { analyzeScannedItems } from './services/geminiService';

const App: React.FC = () => {
  const [items, setItems] = useState<ScannedItem[]>([]);
  const [isScanningPaused, setIsScanningPaused] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showSettings, setShowSettings] = useState(true);

  // Metadata state
  const [metadata, setMetadata] = useState({
    schoolName: '',
    grade: '',
    className: '',
    inputterName: ''
  });
  
  // Cooldown to prevent duplicate rapid scans
  const lastScanRef = useRef<string | null>(null);
  const lastScanTimeRef = useRef<number>(0);

  const handleScan = useCallback((content: string, format: string) => {
    const now = Date.now();
    // 2-second cooldown for the exact same code
    if (content === lastScanRef.current && now - lastScanTimeRef.current < 2000) {
      return;
    }

    lastScanRef.current = content;
    lastScanTimeRef.current = now;

    playScanBeep();

    const newItem: ScannedItem = {
      id: crypto.randomUUID(),
      content,
      format,
      timestamp: now,
      // Save current metadata snapshot with this item
      schoolName: metadata.schoolName,
      grade: metadata.grade,
      className: metadata.className,
      inputterName: metadata.inputterName
    };

    setItems((prev) => [newItem, ...prev]);
  }, [metadata]); // Re-create callback when metadata changes

  const handleDelete = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClear = () => {
    if (confirm('Clear all scanned history?')) {
      setItems([]);
      setAnalysis(null);
    }
  };

  const handleCopyAll = () => {
    const text = items.map((i) => i.content).join('\n');
    navigator.clipboard.writeText(text);
    alert('All items copied to clipboard!');
  };

  const handleDownloadCSV = () => {
    // Add BOM for Excel compatibility with Japanese characters
    const BOM = '\uFEFF';
    const headers = ['Timestamp,Content,Format,School Name,Grade,Class,Inputter Name'];
    const rows = items.map((item) => {
      const date = new Date(item.timestamp).toLocaleString();
      // Escape quotes in content
      const safeContent = `"${item.content.replace(/"/g, '""')}"`;
      const safeSchool = `"${item.schoolName.replace(/"/g, '""')}"`;
      const safeGrade = `"${item.grade.replace(/"/g, '""')}"`;
      const safeClass = `"${item.className.replace(/"/g, '""')}"`;
      const safeInputter = `"${item.inputterName.replace(/"/g, '""')}"`;
      
      return `${date},${safeContent},${item.format},${safeSchool},${safeGrade},${safeClass},${safeInputter}`;
    });

    const csvContent = BOM + [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `scan_results_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAnalyze = async () => {
    if (items.length === 0) return;
    setIsAnalyzing(true);
    const result = await analyzeScannedItems(items);
    setAnalysis(result);
    setIsAnalyzing(false);
  };

  const handleShareApp = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Smart QR Stream',
          text: 'QRコードを連続スキャンしてリスト化できる便利なアプリです。',
          url: window.location.href,
        });
      } catch (err) {
        console.debug('Share cancelled');
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('アプリのURLをコピーしました！');
    }
  };

  const handleMetadataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setMetadata(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-h-screen bg-slate-950 pb-32">
      
      {/* Header */}
      <header className="sticky top-0 z-20 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 p-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent">
            Smart QR Stream
          </h1>
          <div className="flex items-center gap-3">
            <button
              onClick={handleShareApp}
              className="text-slate-400 hover:text-emerald-400 transition-colors p-1"
              title="Share App"
            >
              <Share2 size={20} />
            </button>
            
            <div className="h-5 w-px bg-slate-800"></div>

            <label className="flex items-center gap-2 text-xs font-medium text-slate-400 cursor-pointer select-none">
              <span className={isScanningPaused ? "text-yellow-500" : "text-emerald-500"}>
                {isScanningPaused ? 'PAUSED' : 'LIVE'}
              </span>
              <div className="relative inline-flex h-5 w-9 items-center rounded-full bg-slate-700 transition-colors duration-200">
                 <input 
                    type="checkbox" 
                    className="peer sr-only" 
                    checked={!isScanningPaused}
                    onChange={() => setIsScanningPaused(!isScanningPaused)}
                 />
                 <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition duration-200 ease-in-out ${!isScanningPaused ? 'translate-x-5 bg-emerald-400' : 'translate-x-1'}`} />
              </div>
            </label>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6">
        
        {/* Scanner Section */}
        <section>
          <Scanner onScan={handleScan} isPaused={isScanningPaused} />
          <div className="mt-2 text-center text-xs text-slate-500">
             {isScanningPaused ? 'Tap toggle above to resume scanning' : 'Point camera at a code. Scans automatically.'}
          </div>
        </section>

        {/* Metadata Input Section */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <button 
                onClick={() => setShowSettings(!showSettings)}
                className="w-full flex items-center justify-between p-3 text-sm font-medium text-slate-300 hover:bg-slate-800/50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Settings size={16} className="text-emerald-500" />
                    <span>入力設定 (登録情報)</span>
                </div>
                {showSettings ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            
            {showSettings && (
                <div className="p-3 pt-0 grid grid-cols-2 gap-3 animate-in slide-in-from-top-2 duration-200">
                    <div className="col-span-2">
                        <label className="block text-xs text-slate-500 mb-1">学校名</label>
                        <input
                            type="text"
                            name="schoolName"
                            value={metadata.schoolName}
                            onChange={handleMetadataChange}
                            placeholder="例: ○○小学校"
                            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-500 mb-1">学年</label>
                        <input
                            type="text"
                            name="grade"
                            value={metadata.grade}
                            onChange={handleMetadataChange}
                            placeholder="例: 1"
                            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-500 mb-1">クラス</label>
                        <input
                            type="text"
                            name="className"
                            value={metadata.className}
                            onChange={handleMetadataChange}
                            placeholder="例: 2組"
                            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
                        />
                    </div>
                     <div className="col-span-2">
                        <label className="block text-xs text-slate-500 mb-1">入力者名</label>
                        <input
                            type="text"
                            name="inputterName"
                            value={metadata.inputterName}
                            onChange={handleMetadataChange}
                            placeholder="例: 山田 花子"
                            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
                        />
                    </div>
                    <div className="col-span-2 text-[10px] text-slate-500 text-center pt-1">
                        ※ 入力内容は以降のスキャンデータに自動で付与されます
                    </div>
                </div>
            )}
        </section>

        {/* AI Analysis Result */}
        {analysis && (
            <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900 border border-indigo-500/30 rounded-xl p-4 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-indigo-300 font-semibold flex items-center gap-2">
                        <Sparkles size={16} />
                        AI Analysis
                    </h3>
                    <button onClick={() => setAnalysis(null)} className="text-slate-500 hover:text-white">
                        <X size={16} />
                    </button>
                </div>
                <div className="prose prose-invert prose-sm max-w-none text-slate-300">
                    <p className="whitespace-pre-line">{analysis}</p>
                </div>
            </div>
        )}

        {/* List Section */}
        <section>
          <HistoryList 
            items={items} 
            onDelete={handleDelete} 
            onClear={handleClear} 
          />
        </section>

      </main>

      {/* Sticky Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 z-30 p-4 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent">
        <div className="max-w-md mx-auto grid grid-cols-2 gap-3 sm:grid-cols-3">
            
            <button 
                onClick={handleCopyAll}
                disabled={items.length === 0}
                className="flex flex-col items-center justify-center p-3 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 border border-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
            >
                <Copy size={20} className="mb-1 text-slate-400 group-hover:text-white" />
                <span className="text-xs font-medium text-slate-300">Copy All</span>
            </button>

            <button 
                onClick={handleDownloadCSV}
                disabled={items.length === 0}
                className="flex flex-col items-center justify-center p-3 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 border border-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
            >
                <Download size={20} className="mb-1 text-slate-400 group-hover:text-white" />
                <span className="text-xs font-medium text-slate-300">CSV</span>
            </button>

            {/* Gemini Analyze Button */}
             <button 
                onClick={handleAnalyze}
                disabled={items.length === 0 || isAnalyzing}
                className={`col-span-2 sm:col-span-1 flex flex-col items-center justify-center p-3 rounded-lg border transition-all disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden
                    ${isAnalyzing ? 'bg-indigo-900/50 border-indigo-700' : 'bg-indigo-600 hover:bg-indigo-500 border-indigo-500'}
                `}
            >
                {isAnalyzing ? (
                     <div className="absolute inset-0 bg-white/10 animate-pulse" />
                ) : null}
                <Sparkles size={20} className={`mb-1 ${isAnalyzing ? 'text-indigo-300' : 'text-white'}`} />
                <span className={`text-xs font-medium ${isAnalyzing ? 'text-indigo-200' : 'text-white'}`}>
                    {isAnalyzing ? 'Analyzing...' : 'AI Analyze'}
                </span>
            </button>

        </div>
      </div>

    </div>
  );
};

export default App;