import React, { useEffect, useState, useRef } from 'react';
import { X, Copy, Download, Trash2, Check, Filter } from 'lucide-react';
import { loggerService } from '../services/loggerService';
import { LogEntry, LogLevel } from '../types/glados';

interface LogWindowModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LogWindowModal: React.FC<LogWindowModalProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<string>('ALL');
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const unsubscribe = loggerService.subscribe((entries) => {
      setLogs(entries);
      // Auto-scroll to end like txt_logs.see("end") in main.py
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 50);
    });

    return unsubscribe;
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredLogs = logs.filter((l) => {
    if (filter === 'ALL') return true;
    return l.level === filter;
  });

  const handleCopy = () => {
    const text = loggerService.readLogsAsText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const text = loggerService.readLogsAsText();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `glados_sys_${dateStr}.log`;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    loggerService.clear();
  };

  const getLevelColor = (level: LogLevel) => {
    switch (level) {
      case 'COMMAND':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'WARNING':
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      case 'ERROR':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      case 'INFO':
      default:
        return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      {/* CTkToplevel styled window */}
      <div className="w-full max-w-[800px] h-[520px] bg-[#12151b] border border-[#2b3547] rounded-lg shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Title Bar */}
        <div className="h-10 bg-[#191f2a] border-b border-[#252f40] px-4 flex items-center justify-between select-none">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <h2 className="font-mono text-sm font-bold text-slate-100 tracking-wide">
              GLaDOS System Logs (Caja Negra)
            </h2>
            <span className="text-xs text-slate-500 font-mono">
              [{filteredLogs.length} eventos]
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="p-1.5 hover:bg-[#273244] text-slate-400 hover:text-slate-100 rounded transition-colors"
              title="Copiar logs completos al portapapeles"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={handleDownload}
              className="p-1.5 hover:bg-[#273244] text-slate-400 hover:text-slate-100 rounded transition-colors"
              title="Descargar archivo glados_sys_*.log"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={handleClear}
              className="p-1.5 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 rounded transition-colors"
              title="Limpiar bitácora"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-rose-600 text-slate-400 hover:text-white rounded transition-colors ml-2"
              title="Cerrar ventana"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-[#151a24] px-4 py-2 border-b border-[#202838] flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-400">Filtrar:</span>
            {(['ALL', 'COMMAND', 'INFO', 'WARNING', 'ERROR'] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setFilter(lvl)}
                className={`px-2 py-0.5 rounded text-[11px] transition-all cursor-pointer ${
                  filter === lvl
                    ? 'bg-cyan-600 text-white font-semibold'
                    : 'bg-[#1e2533] text-slate-400 hover:text-slate-200 hover:bg-[#283244]'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          <span className="text-slate-500 text-[11px]">
            Archivo: logs/glados_sys.log
          </span>
        </div>

        {/* Console Log Output */}
        <div
          ref={scrollRef}
          className="flex-1 p-4 bg-[#0a0c10] overflow-y-auto font-mono text-xs text-slate-300 space-y-1 select-text"
        >
          {filteredLogs.length === 0 ? (
            <div className="text-slate-600 italic py-8 text-center">
              No hay entradas de registro disponibles bajo el filtro seleccionado.
            </div>
          ) : (
            filteredLogs.map((entry) => (
              <div
                key={entry.id}
                className="leading-relaxed hover:bg-[#131720] px-2 py-0.5 rounded transition-colors flex items-start gap-2"
              >
                <span className="text-slate-600 select-none shrink-0 font-normal">
                  [{entry.timestamp}]
                </span>
                <span
                  className={`px-1.5 py-0.2 rounded border text-[10px] font-semibold tracking-wider shrink-0 select-none ${getLevelColor(
                    entry.level
                  )}`}
                >
                  {entry.level}
                </span>
                <span className="text-slate-200 break-all whitespace-pre-wrap">
                  {entry.message}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="h-8 bg-[#151922] border-t border-[#222938] px-4 flex items-center justify-between text-[11px] font-mono text-slate-500">
          <span>GLaDOS OS Black Box Logger v3.1</span>
          <span>Buffer: UTF-8 safe, non-crashing</span>
        </div>
      </div>
    </div>
  );
};
