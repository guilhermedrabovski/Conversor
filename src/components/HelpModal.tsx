import React from 'react';
import { X, CheckCircle2, Cpu, FileVideo, FileAudio, FileText } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-semibold text-white">Guia de Formatos & Performance</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-300">
          <div>
            <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
              <FileVideo className="w-4 h-4 text-indigo-400" />
              Por que a conversão de WEBM para MP4 aqui é superior?
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Diferente de conversores online convencionais que utilizam emulação JavaScript lenta (WebAssembly puro em navegador com travamentos em arquivos maiores que 50MB), o <strong>HyperConvert Studio</strong> roda um motor nativo com <strong>FFmpeg compilado em C/Assembly</strong>. Aplicamos a flag <code>-movflags +faststart</code>, que move o cabeçalho moov atom para o início do arquivo MP4, permitindo que o vídeo comece a tocar imediatamente mesmo pela internet.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
              <FileAudio className="w-4 h-4 text-emerald-400" />
              OGG para MP3 com Fidelidade Sonora
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              O motor de áudio utiliza a biblioteca <strong>libmp3lame</strong> com filtragem psychoacústica precisa. Você pode escolher desde 128 kbps para máxima economia até 320 kbps para fidelidade de master de estúdio.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-rose-400" />
              PDF para JPG via Ghostscript
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Utilizamos <strong>Ghostscript 9.55</strong> com renderização anti-aliased para vetores e fontes. Se o PDF contiver várias páginas, cada página vira um arquivo JPG nítido (150 ou 300 DPI) e o aplicativo gera automaticamente um arquivo .ZIP para download unificado.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <h5 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-2">
              Tabela de Formatos Suportados
            </h5>
            <div className="grid grid-cols-3 gap-3 text-xs text-slate-400">
              <div>
                <strong className="text-indigo-300 block mb-1">Vídeo</strong>
                WEBM, MP4, MOV, MKV, AVI, FLV, GIF
              </div>
              <div>
                <strong className="text-emerald-300 block mb-1">Áudio</strong>
                OGG, MP3, WAV, AAC, FLAC, M4A, OPUS
              </div>
              <div>
                <strong className="text-rose-300 block mb-1">Documentos/Imagens</strong>
                PDF, JPG, PNG, WEBP, BMP, TIFF
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end px-6 py-4 border-t border-slate-800 bg-slate-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
          >
            Fechar Guia
          </button>
        </div>
      </div>
    </div>
  );
};
