import React, { useState } from 'react';
import { X, Download, Play, Music, Image as ImageIcon, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Film } from 'lucide-react';
import { ConversionJob } from '../types/converter';
import { formatBytes } from '../utils/formatDetector';

interface PreviewModalProps {
  job: ConversionJob | null;
  onClose: () => void;
  onDownload: (jobId: string) => void;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({ job, onClose, onDownload }) => {
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);

  if (!job) return null;

  const target = job.targetFormat.toLowerCase();
  const isVideo = ['mp4', 'webm', 'mov', 'mkv', 'avi', 'gif'].includes(target);
  const isAudio = ['mp3', 'ogg', 'wav', 'aac'].includes(target);
  const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(target);

  const previewUrl = job.clientDownloadUrl || `/api/preview/${job.id}`;
  const pageCount = job.pageCount || 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              {isVideo ? <Film className="w-4 h-4" /> : isAudio ? <Music className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white truncate max-w-md">
                {job.originalName}
              </h3>
              <div className="text-xs text-slate-400 flex items-center gap-2">
                <span>Saída: {job.targetFormat.toUpperCase()}</span>
                {job.outputSize && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{formatBytes(job.outputSize)}</span>
                  </>
                )}
                {pageCount > 1 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{pageCount} páginas geradas</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onDownload(job.id)}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar Arquivo</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-auto bg-slate-950 p-6 flex flex-col items-center justify-center min-h-[350px]">
          {isVideo && (
            <div className="w-full max-w-2xl bg-black rounded-xl overflow-hidden shadow-xl border border-slate-800 flex flex-col items-center">
              <video
                src={previewUrl}
                controls
                autoPlay
                className="w-full max-h-[60vh] object-contain rounded-xl"
              />
            </div>
          )}

          {isAudio && (
            <div className="w-full max-w-lg p-8 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col items-center text-center shadow-xl">
              <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mb-6 shadow-inner">
                <Music className="w-10 h-10 animate-pulse" />
              </div>
              <h4 className="text-base font-semibold text-white mb-1">{job.originalName}</h4>
              <p className="text-xs text-slate-400 mb-6">
                Áudio transcodificado com fidelidade nativa {job.options?.audioBitrate || '192'} kbps
              </p>
              <audio src={previewUrl} controls autoPlay className="w-full" />
            </div>
          )}

          {isImage && (
            <div className="flex flex-col items-center w-full max-w-3xl">
              <div className="flex items-center gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1"
                  title="Diminuir Zoom"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono text-slate-400">{Math.round(zoomLevel * 100)}%</span>
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.25))}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1"
                  title="Aumentar Zoom"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-auto max-h-[60vh] max-w-full rounded-xl border border-slate-800 bg-black/60 p-4 flex items-center justify-center shadow-inner">
                <img
                  src={previewUrl}
                  alt={job.originalName}
                  style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center' }}
                  className="max-h-[50vh] object-contain rounded shadow-lg transition-transform duration-150"
                />
              </div>

              {pageCount > 1 && (
                <div className="flex items-center gap-4 mt-4 text-xs text-slate-400">
                  <span>Página gerada via Ghostscript</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-indigo-400 font-medium">Todas as {pageCount} páginas serão empacotadas no arquivo .ZIP</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
