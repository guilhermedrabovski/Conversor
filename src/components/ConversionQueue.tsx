import React from 'react';
import {
  FileVideo,
  FileAudio,
  FileText,
  File,
  Download,
  Eye,
  Trash2,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Archive,
  ArrowRight,
  RotateCw,
  UploadCloud,
  Timer,
} from 'lucide-react';
import { ConversionJob } from '../types/converter';
import { formatBytes, getCompatibleTargets, getFileExtension } from '../utils/formatDetector';

interface ConversionQueueProps {
  jobs: ConversionJob[];
  onRemoveJob: (id: string) => void;
  onChangeTargetFormat: (id: string, format: string) => void;
  onOpenSettings: (job: ConversionJob) => void;
  onPreview: (job: ConversionJob) => void;
  onDownload: (id: string) => void;
  onDownloadAllZip: () => void;
  onClearCompleted: () => void;
  onApplyFormatToAll: (format: string) => void;
  onRetry?: (id: string) => void;
}

export const ConversionQueue: React.FC<ConversionQueueProps> = ({
  jobs,
  onRemoveJob,
  onChangeTargetFormat,
  onOpenSettings,
  onPreview,
  onDownload,
  onDownloadAllZip,
  onClearCompleted,
  onApplyFormatToAll,
  onRetry,
}) => {
  if (jobs.length === 0) return null;

  const completedJobs = jobs.filter((j) => j.status === 'completed');
  const processingJobs = jobs.filter((j) => j.status === 'processing');
  const hasMultipleCompleted = completedJobs.length > 1;

  const getFileIcon = (filename: string) => {
    const ext = getFileExtension(filename);
    if (['webm', 'mp4', 'mov', 'mkv', 'avi', 'flv'].includes(ext)) {
      return <FileVideo className="w-5 h-5 text-indigo-400" />;
    }
    if (['ogg', 'mp3', 'wav', 'aac', 'flac', 'm4a'].includes(ext)) {
      return <FileAudio className="w-5 h-5 text-emerald-400" />;
    }
    if (ext === 'pdf') {
      return <FileText className="w-5 h-5 text-rose-400" />;
    }
    return <File className="w-5 h-5 text-slate-400" />;
  };

  return (
    <div className="w-full space-y-4">
      {/* Batch Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-white">Fila de Arquivos</span>
          <span className="text-xs text-slate-400 font-mono tabular-nums">
            {jobs.length} {jobs.length === 1 ? 'item' : 'itens'} · {completedJobs.length} pronto(s)
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Apply format to all */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Converter todos para:</span>
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  onApplyFormatToAll(e.target.value);
                  e.target.value = '';
                }
              }}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="" disabled>Selecionar...</option>
              <option value="mp4">MP4 (Vídeo)</option>
              <option value="mp3">MP3 (Áudio)</option>
              <option value="jpg">JPG (Imagem)</option>
              <option value="webm">WEBM (Vídeo)</option>
              <option value="wav">WAV (Áudio)</option>
              <option value="pdf">PDF (Documento)</option>
            </select>
          </div>

          {hasMultipleCompleted && (
            <button
              onClick={onDownloadAllZip}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Baixar Tudo em .ZIP</span>
            </button>
          )}

          {completedJobs.length > 0 && (
            <button
              onClick={onClearCompleted}
              className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 text-xs font-medium transition-colors"
            >
              Limpar Concluídos
            </button>
          )}
        </div>
      </div>

      {/* List of Files in Queue */}
      <div className="space-y-3">
        {jobs.map((job) => {
          const compatibleTargets = getCompatibleTargets(job.originalName);
          const isUploading = job.status === 'uploading';
          const isCompleted = job.status === 'completed';
          const isProcessing = job.status === 'processing';
          const isError = job.status === 'error';

          // Space saving calculation
          let savingsPercent: number | null = null;
          if (isCompleted && job.outputSize && job.inputSize > 0) {
            savingsPercent = Math.round(((job.inputSize - job.outputSize) / job.inputSize) * 100);
          }

          return (
            <div
              key={job.id}
              className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              {/* Left Zone: File Identity & Size */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0">
                  {getFileIcon(job.originalName)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-slate-100 truncate" title={job.originalName}>
                      {job.originalName}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                    <span className="font-mono tabular-nums">{formatBytes(job.inputSize)}</span>
                    <span aria-hidden="true">·</span>
                    <span className="uppercase text-slate-500">{getFileExtension(job.originalName)}</span>

                    {isCompleted && (
                      <>
                        {job.conversionTimeSeconds !== undefined && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-amber-300 bg-amber-950/70 border border-amber-500/40 px-2 py-0.5 rounded-md shadow-sm">
                              <Timer className="w-3 h-3 text-amber-400" />
                              <span>Tempo: {job.conversionTimeSeconds}s</span>
                            </span>
                          </>
                        )}
                        {job.outputSize && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-slate-300">
                              Resultado: <span className="font-mono tabular-nums text-indigo-300">{formatBytes(job.outputSize)}</span>
                            </span>
                            {savingsPercent !== null && (
                              <span
                                className={`font-mono text-[11px] ${
                                  savingsPercent > 0 ? 'text-emerald-400' : 'text-slate-400'
                                }`}
                              >
                                ({savingsPercent > 0 ? `-${savingsPercent}%` : `+${Math.abs(savingsPercent)}%`})
                              </span>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Middle Zone: Target Format & Settings */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Para:</span>
                  <select
                    disabled={isProcessing}
                    value={job.targetFormat.toLowerCase()}
                    onChange={(e) => onChangeTargetFormat(job.id, e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-indigo-300 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                  >
                    {compatibleTargets.map((t) => (
                      <option key={t.format} value={t.format}>
                        {t.format.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenSettings(job)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                  title="Configurar opções avançadas (qualidade, preset, resolução)"
                >
                  <Sliders className="w-4 h-4" />
                </button>
              </div>

              {/* Right Zone: Progress & Actions */}
              <div className="flex items-center gap-3 shrink-0">
                {isUploading && (
                  <div className="flex items-center gap-3 min-w-[170px]">
                    <div className="w-full">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-sky-400 flex items-center gap-1">
                          <UploadCloud className="w-3.5 h-3.5 animate-bounce shrink-0" />
                          <span>Enviando</span>
                          {job.uploadSpeed && (
                            <span className="text-[10px] text-sky-300 font-mono">
                              ({job.uploadSpeed}{job.uploadEta !== undefined ? ` · ~${job.uploadEta}s` : ''})
                            </span>
                          )}
                        </span>
                        <span className="font-mono tabular-nums text-slate-300 font-semibold">{job.progress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-all duration-150 rounded-full"
                          style={{ width: `${Math.max(6, job.progress)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {isProcessing && (
                  <div className="flex items-center gap-3 min-w-[150px]">
                    <div className="w-full">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-indigo-400 flex items-center gap-1.5">
                          <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                          <span>Convertendo</span>
                          {job.speed && (
                            <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-950/80 px-1 py-0.5 rounded border border-emerald-800/60">
                              {job.speed}
                            </span>
                          )}
                        </span>
                        <span className="font-mono tabular-nums text-slate-300 font-semibold">{job.progress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-sky-400 transition-all duration-200 rounded-full"
                          style={{ width: `${Math.max(6, job.progress)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {isCompleted && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onPreview(job)}
                      className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium border border-slate-700/60"
                      title="Pré-visualizar resultado"
                    >
                      <Eye className="w-4 h-4 text-indigo-400" />
                      <span className="hidden sm:inline">Visualizar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onDownload(job.id)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 shadow-sm"
                      title="Baixar arquivo convertido"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Baixar</span>
                    </button>
                  </div>
                )}

                {isError && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 text-xs text-rose-400">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span className="truncate max-w-[140px]" title={job.error}>
                        {job.error || 'Erro'}
                      </span>
                    </div>

                    {onRetry && (
                      <button
                        type="button"
                        onClick={() => onRetry(job.id)}
                        className="px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1 border border-indigo-500/30"
                        title="Tentar converter novamente"
                      >
                        <RotateCw className="w-3 h-3" />
                        <span>Reconectar</span>
                      </button>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => onRemoveJob(job.id)}
                  className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800/80 transition-colors"
                  title="Remover"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
