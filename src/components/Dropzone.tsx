import React, { useRef, useState } from 'react';
import { UploadCloud, Plus, Loader2, FileVideo, FileAudio, FileText } from 'lucide-react';

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
      e.target.value = '';
    }
  };

  const triggerPicker = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      <input
        id="converter-file-input"
        ref={fileInputRef}
        type="file"
        multiple
        className="sr-only"
        onChange={handleFileChange}
      />

      {/* Main Drag & Drop Box */}
      <label
        htmlFor="converter-file-input"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`group relative block cursor-pointer border-2 border-dashed rounded-2xl p-8 md:p-10 text-center transition-all duration-200 ${
          isDragging
            ? 'border-indigo-500 bg-indigo-950/40 scale-[1.005]'
            : 'border-slate-800 bg-slate-900/40 hover:border-indigo-500/60 hover:bg-slate-900/70'
        }`}
      >
        <div className="max-w-md mx-auto flex flex-col items-center pointer-events-none">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
            {isUploading ? (
              <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
            ) : (
              <UploadCloud className="w-7 h-7" />
            )}
          </div>

          <h2 className="text-lg md:text-xl font-bold text-white mb-1.5 tracking-tight">
            {isUploading ? 'Enviando arquivos...' : 'Arraste seus arquivos aqui'}
          </h2>
          <p className="text-slate-400 text-xs md:text-sm mb-5">
            Suporta WEBM, MP4, OGG, MP3, PDF, JPG e dezenas de formatos até 1 GB
          </p>

          <div className="pointer-events-auto">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                triggerPicker();
              }}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-xl shadow-md shadow-indigo-600/25 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Selecionar Arquivos</span>
            </button>
          </div>
        </div>
      </label>

      {/* Quick 1-Click Samples */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400">
        <span className="text-slate-500">Ou teste uma amostra:</span>
        <button
          type="button"
          disabled={isLoadingSample}
          onClick={() => onGenerateSample('webm')}
          className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer text-xs"
        >
          <FileVideo className="w-3.5 h-3.5 text-indigo-400" />
          <span>Vídeo WEBM</span>
        </button>
        <button
          type="button"
          disabled={isLoadingSample}
          onClick={() => onGenerateSample('ogg')}
          className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer text-xs"
        >
          <FileAudio className="w-3.5 h-3.5 text-emerald-400" />
          <span>Áudio OGG</span>
        </button>
        <button
          type="button"
          disabled={isLoadingSample}
          onClick={() => onGenerateSample('pdf')}
          className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer text-xs"
        >
          <FileText className="w-3.5 h-3.5 text-rose-400" />
          <span>PDF para JPG</span>
        </button>
      </div>
    </div>
  );
};
