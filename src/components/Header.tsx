import React from 'react';
import { Zap, Cpu, HelpCircle } from 'lucide-react';

interface HeaderProps {
  onOpenHelp?: () => void;
  activeJobsCount?: number;
}

export const Header: React.FC<HeaderProps> = ({ onOpenHelp, activeJobsCount = 0 }) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-6 py-4">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white whitespace-nowrap">
            HyperConvert Studio
          </span>
        </div>

        {/* Zone 2: 4-5 clean single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
          <a href="#video-section" className="hover:text-white transition-colors whitespace-nowrap shrink-0">
            WEBM para MP4
          </a>
          <a href="#audio-section" className="hover:text-white transition-colors whitespace-nowrap shrink-0">
            OGG para MP3
          </a>
          <a href="#pdf-section" className="hover:text-white transition-colors whitespace-nowrap shrink-0">
            PDF para JPG
          </a>
          <a href="#batch-section" className="hover:text-white transition-colors whitespace-nowrap shrink-0">
            Processamento em Lote
          </a>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-3 py-1.5 rounded-lg whitespace-nowrap">
            <Cpu className="w-3.5 h-3.5" />
            <span>FFmpeg Nativo & Ghostscript</span>
          </div>

          {onOpenHelp && (
            <button
              onClick={onOpenHelp}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Informações e Formatos"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
