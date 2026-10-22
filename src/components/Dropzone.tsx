import React, { useRef, useState } from 'react';
import { UploadCloud, FileVideo, FileAudio, FileText, Sparkles, Plus, Loader2 } from 'lucide-react';

interface DropzoneProps {
  onFilesSelected: (files: FileList | File[]) => void;
  onGenerateSample: (type: 'webm' | 'ogg' | 'pdf') => void;
  isLoadingSample?: boolean;
  isUploading?: boolean;
}

export const Dropzone: React.FC<DropzoneProps> = ({
  onFilesSelected,
  onGenerateSample,
  isLoadingSample = false,
  isUploading = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(e.target.files);
      // Reset input value so re-selecting the exact same file immediately triggers onChange again
      e.target.value = '';
    }
  };

  const triggerPicker = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      {/* Accessible file input with sr-only instead of display:none to prevent iframe click suppression */}
      <input
        id="converter-file-input"
        ref={fileInputRef}
        type="file"
        multiple
        className="sr-only"
        onChange={handleFileChange}
      />

      {/* Main Drag & Drop Zone */}
      <label
        htmlFor="converter-file-input"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`group relative block cursor-pointer border-2 border-dashed rounded-2xl p-8 md:p-12 text-center transition-all duration-200 ${
          isDragging
            ? 'border-indigo-500 bg-indigo-950/40 scale-[1.008]'
            : 'border-slate-700/80 bg-slate-900/50 hover:border-indigo-500/80 hover:bg-slate-900/80'
        }`}
      >
        <div className="max-w-xl mx-auto flex flex-col items-center pointer-events-none">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-5 group-hover:scale-105 group-hover:bg-indigo-600/20 transition-all">
            {isUploading ? (
              <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
            ) : (
              <UploadCloud className="w-8 h-8" />
            )}
          </div>

          <h2 className="text-xl md:text-2xl font-bold text-white mb-2 tracking-tight">
            {isUploading ? 'Recebendo e adicionando arquivo à fila...' : 'Arraste e solte seus arquivos aqui'}
          </h2>
          <p className="text-slate-400 text-sm md:text-base mb-6 max-w-md">
            Converta <span className="text-slate-200 font-medium">WEBM para MP4</span>, <span className="text-slate-200 font-medium">OGG para MP3</span>, <span className="text-slate-200 font-medium">PDF para JPG</span> e dezenas de outros formatos com alta fidelidade.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pointer-events-auto">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                triggerPicker();
              }}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-xl shadow-lg shadow-indigo-600/25 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Selecionar Arquivos do Computador
            </button>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500">
            <span>Suporta arquivos de até 1 GB</span>
            <span aria-hidden="true">·</span>
            <span>Processamento multithread nativo</span>
            <span aria-hidden="true">·</span>
            <span>Conversão simultânea em lote</span>
          </div>
        </div>
      </label>

      {/* Instant 1-Click Test Samples Row */}
      <div className="mt-4 p-4 rounded-xl border border-slate-800 bg-slate-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Não tem um arquivo em mãos? Teste agora com 1 clique:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={isLoadingSample}
            onClick={() => onGenerateSample('webm')}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-medium border border-slate-700 transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <FileVideo className="w-3.5 h-3.5 text-indigo-400" />
            <span>Amostra WEBM → MP4</span>
          </button>

          <button
            type="button"
            disabled={isLoadingSample}
            onClick={() => onGenerateSample('ogg')}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-medium border border-slate-700 transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <FileAudio className="w-3.5 h-3.5 text-emerald-400" />
            <span>Amostra OGG → MP3</span>
          </button>

          <button
            type="button"
            disabled={isLoadingSample}
            onClick={() => onGenerateSample('pdf')}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-medium border border-slate-700 transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-rose-400" />
            <span>Amostra PDF → JPG</span>
          </button>
        </div>
      </div>
    </div>
  );
};
