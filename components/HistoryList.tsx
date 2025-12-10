import React from 'react';
import { ScannedItem } from '../types';
import { Trash2, Copy, ExternalLink, FileText, User, School } from 'lucide-react';

interface HistoryListProps {
  items: ScannedItem[];
  onDelete: (id: string) => void;
  onClear: () => void;
}

const HistoryList: React.FC<HistoryListProps> = ({ items, onDelete, onClear }) => {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could add a toast notification here
  };

  const isUrl = (text: string) => {
    try {
      new URL(text);
      return true;
    } catch {
      return false;
    }
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500">
        <FileText size={48} strokeWidth={1} className="mb-4 opacity-50" />
        <p>No items scanned yet.</p>
        <p className="text-sm">Point camera at a QR code to begin.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4 px-1">
        <h2 className="text-lg font-semibold text-slate-200">
          History <span className="text-slate-500 text-sm ml-2">({items.length})</span>
        </h2>
        <button 
          onClick={onClear}
          className="text-xs text-red-400 hover:text-red-300 transition-colors"
        >
          Clear All
        </button>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <div 
            key={item.id} 
            className="group relative bg-slate-800/50 border border-slate-700/50 rounded-lg p-3 sm:p-4 hover:border-slate-600 transition-all shadow-sm"
          >
            <div className="flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                    <p className="text-slate-100 font-medium break-all text-sm sm:text-base font-mono">
                        {item.content}
                    </p>
                    
                    {/* Metadata display */}
                    {(item.schoolName || item.grade || item.className || item.inputterName) && (
                        <div className="flex flex-wrap gap-2 mt-2">
                             {item.schoolName && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700/50">
                                    <School size={10} />
                                    {item.schoolName}
                                </span>
                             )}
                             {(item.grade || item.className) && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700/50">
                                    {item.grade ? `${item.grade}年` : ''} {item.className}
                                </span>
                             )}
                             {item.inputterName && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700/50">
                                    <User size={10} />
                                    {item.inputterName}
                                </span>
                             )}
                        </div>
                    )}

                    <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] sm:text-xs text-slate-500 px-0.5 py-0.5">
                            {new Date(item.timestamp).toLocaleString()}
                        </span>
                        {isUrl(item.content) && (
                            <a 
                                href={item.content} 
                                target="_blank" 
                                rel="noreferrer"
                                className="text-[10px] sm:text-xs flex items-center gap-1 text-blue-400 hover:underline"
                            >
                                Open Link <ExternalLink size={10} />
                            </a>
                        )}
                    </div>
                </div>
                
                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                    <button 
                        onClick={() => copyToClipboard(item.content)}
                        className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-700 rounded-md transition-colors"
                        title="Copy"
                    >
                        <Copy size={16} />
                    </button>
                    <button 
                        onClick={() => onDelete(item.id)}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-md transition-colors"
                        title="Delete"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HistoryList;