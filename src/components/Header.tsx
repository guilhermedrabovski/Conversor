import React from 'react';
import { Zap, HelpCircle } from 'lucide-react';

interface HeaderProps {
  onOpenHelp?: () => void;
  activeJobsCount?: number;
}

export const Header: React.FC<HeaderProps> = ({ onOpenHelp }) => {
  return (
    <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-4xl mx-auto flex items-center justify-between px-6 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
            <Zap className="w-4 h-4 fill-current" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">
            HyperConvert
          </span>
          <span className="text-xs font-mono font-medium text-amber-300/90 bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded-full ml-1">
            ⏱️ Turbo
          </span>
        </div>

        <div className="flex items-center gap-3">
          {onOpenHelp && (
            <button
              onClick={onOpenHelp}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 py-1 px-2.5 rounded-lg hover:bg-slate-800/60 transition-colors cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Formatos</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
