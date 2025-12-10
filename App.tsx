import React, { useState, useCallback, useRef, useEffect } from 'react';
import Scanner from './components/Scanner';
import HistoryList from './components/HistoryList';
import { ScannedItem } from './types';
import { playScanBeep } from './utils/beep';
import { Download, Copy, X, Settings, ChevronDown, ChevronUp, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';

const App: React.FC = () => {
  const [items, setItems] = useState<ScannedItem[]>([]);
  const [isScanningPaused, setIsScanningPaused] = useState(false);
  const [showSettings, setShowSettings] = useState(true);

  // Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning'; id: number } | null>(null);

  // Metadata state
  const [metadata, setMetadata] = useState({
    schoolName: '',
    grade: '',
    className: '',
    inputterName: ''
  });

  // Cooldown & Duplicate Check
  const lastScanRef = useRef<string | null>(null);
  const lastScanTimeRef = useRef<number>(0);

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Sync metadata to all items whenever metadata changes
  const handleMetadataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Update local metadata state
    const newMetadata = { ...metadata, [name]: value };
    setMetadata(newMetadata);

    // Update ALL existing items
    setItems((prevItems) =>
      prevItems.map(item => ({
        ...item,
        schoolName: newMetadata.schoolName,
        grade: newMetadata.grade,
        className: newMetadata.className,
        inputterName: newMetadata.inputterName
      }))
    );
  };

  const showToast = (message: string, type: 'success' | 'warning') => {
    setToast({ message, type, id: Date.now() });
  };

  const handleScan = useCallback((content: string, format: string) => {
    const now = Date.now();

    // Simple cooldown for EXACT same scan to prevent flooding (1.5s)
    if (content === lastScanRef.current && now - lastScanTimeRef.current < 1500) {
      return;
    }

    lastScanRef.current = content;
    lastScanTimeRef.current = now;

    playScanBeep();

    // Check for duplicates in the current list
    const isDuplicate = items.some(item => item.content === content);

    if (isDuplicate) {
      showToast('既にスキャン済みです', 'warning');
      // We do NOT add duplicates to the list, but we still feedback
      return;
    }

    const newItem: ScannedItem = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
      content,
      format,
      timestamp: now,
      // Apply current metadata
      schoolName: metadata.schoolName,
      grade: metadata.grade,
      className: metadata.className,
      inputterName: metadata.inputterName
    };

    setItems((prev) => [newItem, ...prev]);
    showToast('スキャン成功！', 'success');

  }, [items, metadata]); // items dependency needed for duplicate check

  const handleDelete = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClear = () => {
    if (confirm('履歴をすべて削除しますか？')) {
      setItems([]);
      lastScanRef.current = null;
    }
  };

  const handleCopyAll = () => {
    if (items.length === 0) return;

    const headers = ['学校名,学年,クラス,入力者名,スキャン日時,内容,形式'];
    const rows = items.map((item) => {
      const date = new Date(item.timestamp).toLocaleString();
      const safeContent = `"${item.content.replace(/"/g, '""')}"`;
      const safeSchool = `"${item.schoolName.replace(/"/g, '""')}"`;
      const safeGrade = `"${item.grade.replace(/"/g, '""')}"`;
      const safeClass = `"${item.className.replace(/"/g, '""')}"`;
      const safeInputter = `"${item.inputterName.replace(/"/g, '""')}"`;

      return `${safeSchool},${safeGrade},${safeClass},${safeInputter},${date},${safeContent},${item.format}`;
    });

    const text = [headers, ...rows].join('\n');
    navigator.clipboard.writeText(text);
    alert('全データをクリップボードにコピーしました（CSV形式）');
  };

  const handleDownloadCSV = () => {
    if (items.length === 0) return;
    // Add BOM for Excel compatibility with Japanese characters
    const BOM = '\uFEFF';
    const headers = ['学校名,学年,クラス,入力者名,スキャン日時,内容,形式'];
    const rows = items.map((item) => {
      const date = new Date(item.timestamp).toLocaleString();
      // Escape quotes in content
      const safeContent = `"${item.content.replace(/"/g, '""')}"`;
      const safeSchool = `"${item.schoolName.replace(/"/g, '""')}"`;
      const safeGrade = `"${item.grade.replace(/"/g, '""')}"`;
      const safeClass = `"${item.className.replace(/"/g, '""')}"`;
      const safeInputter = `"${item.inputterName.replace(/"/g, '""')}"`;

      return `${safeSchool},${safeGrade},${safeClass},${safeInputter},${date},${safeContent},${item.format}`;
    });

    const csvContent = BOM + [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `スキャン結果_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-950 pb-10 font-sans">

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-6 py-3 rounded-full shadow-2xl border ${toast.type === 'success'
          ? 'bg-emerald-900/90 border-emerald-500 text-emerald-100'
          : 'bg-yellow-900/90 border-yellow-500 text-yellow-100'
          } animate-in slide-in-from-top-4 fade-in duration-300`}>
          {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span className="font-bold">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-20 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 p-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold bg-gradient-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent">
            Smart QR Stream
          </h1>

          <label className="flex items-center gap-2 text-xs font-medium text-slate-400 cursor-pointer select-none">
            <span className={isScanningPaused ? "text-yellow-500" : "text-emerald-500"}>
              {isScanningPaused ? '一時停止' : 'スキャン中'}
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
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6">

        {/* Scanner Section */}
        <section className="relative">
          <Scanner onScan={handleScan} isPaused={isScanningPaused} />
          <div className="mt-2 text-center text-xs text-slate-500">
            {isScanningPaused ? '上のスイッチでスキャンを再開' : 'カメラをコードに向けてください（連続スキャン可能）'}
          </div>
        </section>

        {/* Metadata Input Section */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="w-full flex items-center justify-between p-3 text-sm font-medium text-slate-300 hover:bg-slate-800/50 transition-colors"
            title="設定を開閉"
          >
            <div className="flex items-center gap-2">
              <Settings size={16} className="text-emerald-500" />
              <span>登録情報設定 (反映されます)</span>
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
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
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
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
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
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
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
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
              <div className="col-span-2 text-[10px] text-emerald-500/80 text-center pt-1">
                ※ 内容を変更すると、読み取り済みの全てのデータにも反映されます
              </div>
            </div>
          )}
        </section>

        {/* List Section */}
        <section>
          <HistoryList
            items={items}
            onDelete={handleDelete}
            onClear={handleClear}
          />
        </section>

        {/* Actions - Static at bottom of content, NOT fixed/floating */}
        <div className="pt-4 pb-8 border-t border-slate-800 grid grid-cols-2 gap-4">
          <button
            onClick={handleCopyAll}
            disabled={items.length === 0}
            className="flex items-center justify-center gap-2 p-4 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <Copy size={18} className="text-slate-400 group-hover:text-emerald-400" />
            <span className="font-bold text-slate-300">全てコピー</span>
          </button>

          <button
            onClick={handleDownloadCSV}
            disabled={items.length === 0}
            className="flex items-center justify-center gap-2 p-4 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <Download size={18} className="text-slate-400 group-hover:text-emerald-400" />
            <span className="font-bold text-slate-300">CSV 保存</span>
          </button>

          <button
            onClick={handleClear}
            disabled={items.length === 0}
            className="col-span-2 mt-2 py-3 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded transition-colors disabled:opacity-0"
          >
            履歴を全て削除
          </button>
        </div>

      </main>
    </div>
  );
};

export default App;