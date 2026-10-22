import React, { useState } from 'react';
import { X, Sliders, Check } from 'lucide-react';
import { JobOptions } from '../types/converter';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetFormat: string;
  initialOptions?: JobOptions;
  onSave: (options: JobOptions) => void;
  title?: string;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  targetFormat,
  initialOptions = {},
  onSave,
  title = 'Configurações de Conversão',
}) => {
  const [options, setOptions] = useState<JobOptions>({
    videoPreset: initialOptions.videoPreset || 'veryfast',
    videoQuality: initialOptions.videoQuality || 'balanced',
    resolution: initialOptions.resolution || 'original',
    audioBitrate: initialOptions.audioBitrate || '192',
    dpi: initialOptions.dpi || '150',
  });

  if (!isOpen) return null;

  const isVideo = ['mp4', 'webm', 'mov', 'mkv', 'avi'].includes(targetFormat.toLowerCase());
  const isAudio = ['mp3', 'ogg', 'wav', 'aac'].includes(targetFormat.toLowerCase());
  const isPdf = ['jpg', 'jpeg', 'png'].includes(targetFormat.toLowerCase());

  const handleSave = () => {
    onSave(options);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-semibold text-white">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 text-sm">
          {isVideo && (
            <>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Velocidade de Transcodificação (Preset FFmpeg)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'ultrafast', label: 'Ultrarrápido', sub: 'Menor uso de CPU' },
                    { id: 'veryfast', label: 'Muito Rápido', sub: 'Equilibrado (Padrão)' },
                    { id: 'fast', label: 'Rápido', sub: 'Boa compressão' },
                    { id: 'medium', label: 'Médio', sub: 'Menor tamanho final' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setOptions({ ...options, videoPreset: p.id as any })}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        options.videoPreset === p.id
                          ? 'border-indigo-500 bg-indigo-950/40 text-white'
                          : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-medium text-slate-200">{p.label}</div>
                      <div className="text-xs text-slate-500">{p.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Fidelidade Visual (CRF)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'compact', label: 'Compacto', sub: 'CRF 28' },
                    { id: 'balanced', label: 'Equilibrado', sub: 'CRF 23' },
                    { id: 'high', label: 'Alta Fidelidade', sub: 'CRF 18' },
                  ].map((q) => (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setOptions({ ...options, videoQuality: q.id as any })}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        options.videoQuality === q.id
                          ? 'border-indigo-500 bg-indigo-950/40 text-white'
                          : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-medium text-slate-200">{q.label}</div>
                      <div className="text-xs text-slate-500">{q.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Resolução de Saída
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'original', label: 'Original' },
                    { id: '1080p', label: '1080p' },
                    { id: '720p', label: '720p' },
                    { id: '480p', label: '480p' },
                  ].map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setOptions({ ...options, resolution: r.id as any })}
                      className={`p-2 rounded-lg border text-center text-xs font-medium transition-all ${
                        options.resolution === r.id
                          ? 'border-indigo-500 bg-indigo-950/50 text-indigo-300'
                          : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {isAudio && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Qualidade de Áudio (Taxa de Bits MP3/OGG)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: '320', label: '320 kbps', sub: 'Qualidade Máxima de Estúdio' },
                  { id: '256', label: '256 kbps', sub: 'Altíssima Fidelidade' },
                  { id: '192', label: '192 kbps', sub: 'Recomendado (Balanceado)' },
                  { id: '128', label: '128 kbps', sub: 'Tamanho Reduzido' },
                ].map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setOptions({ ...options, audioBitrate: b.id as any })}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      options.audioBitrate === b.id
                        ? 'border-indigo-500 bg-indigo-950/40 text-white'
                        : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-medium text-slate-200">{b.label}</div>
                    <div className="text-xs text-slate-500">{b.sub}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {isPdf && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Resolução de Renderização Ghostscript (DPI)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: '300', label: '300 DPI', sub: 'Nitidez Extrema / Impressão' },
                  { id: '150', label: '150 DPI', sub: 'Recomendado para Telas' },
                  { id: '72', label: '72 DPI', sub: 'Ultrarrápido / Compacto' },
                ].map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setOptions({ ...options, dpi: d.id as any })}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      options.dpi === d.id
                        ? 'border-indigo-500 bg-indigo-950/40 text-white'
                        : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-medium text-slate-200">{d.label}</div>
                    <div className="text-xs text-slate-500">{d.sub}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Check className="w-4 h-4" />
            Aplicar Configurações
          </button>
        </div>
      </div>
    </div>
  );
};
